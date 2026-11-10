function fechaUtc(fecha) {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const dia = new Date(fecha + "T12:00:00Z");
  return Number.isFinite(dia.valueOf()) && dia.toISOString().slice(0, 10) === fecha ? dia : null;
}

function minutos(hora) {
  if (typeof hora !== "string" || !/^\d{2}:\d{2}$/.test(hora)) return NaN;
  const [h, m] = hora.split(":").map(Number);
  return h <= 24 && m < 60 && (h < 24 || m === 0) ? h * 60 + m : NaN;
}

function horaLegible(valor) {
  const hora = String(Math.floor(valor / 60)).padStart(2, "0");
  const minuto = String(valor % 60).padStart(2, "0");
  return hora + ":" + minuto;
}

function fechaHoraNegocio(zonaHoraria) {
  const reloj = new Intl.DateTimeFormat("en-GB", {
    timeZone: zonaHoraria || "America/Mazatlan",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  const { year, month, day, hour, minute } = Object.fromEntries(
    reloj.formatToParts(new Date(Date.now())).map(({ type, value }) => [type, value])
  );
  return { fecha: year + "-" + month + "-" + day, minuto: minutos(hour + ":" + minute) };
}

function configuracionValida(valor, defecto) {
  return Number.isSafeInteger(valor) && valor > 0 && valor <= 1440 ? valor : defecto;
}

function opcionesDeReserva(menu, fecha, personas) {
  const { horario, reservaciones } = menu;
  const dia = fechaUtc(fecha);
  const intervalo = configuracionValida(reservaciones?.intervaloMinutos, 30);
  const duracion = configuracionValida(reservaciones?.duracionMinutos, 90);
  const dias = configuracionValida(reservaciones?.anticipacionDias, 14);
  const maxPersonas = configuracionValida(reservaciones?.maxPersonas, 8);

  if (!dia || !Number.isSafeInteger(personas) || personas < 1 || personas > maxPersonas) {
    return null;
  }

  const mesas = (reservaciones?.mesas ?? [])
    .filter(mesa => typeof mesa.id === "string" && Number.isSafeInteger(mesa.capacidad) && mesa.capacidad >= personas);
  const ahora = fechaHoraNegocio(horario?.zonaHoraria);
  const limite = fechaUtc(ahora.fecha);
  limite.setUTCDate(limite.getUTCDate() + dias);
  const inicios = new Set();

  if (fecha >= ahora.fecha && fecha <= limite.toISOString().slice(0, 10)) {
    const semana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dia.getUTCDay()];
    for (const turno of horario?.turnos ?? []) {
      if (!turno.dias.includes(semana)) continue;
      const cierre = minutos(turno.cierra);
      for (let inicio = minutos(turno.abre); inicio + duracion <= cierre; inicio += intervalo) {
        if (fecha === ahora.fecha && inicio <= ahora.minuto) continue;
        inicios.add(inicio);
      }
    }
  }

  return { mesas, inicios, duracion };
}

async function ocupacionesDelDia(db, fecha) {
  const consulta = await db.prepare(
    "SELECT id, inicio, fin, mesa, personas FROM agenda_mesas WHERE fecha = ? ORDER BY inicio, mesa"
  ).bind(fecha).all();
  return consulta.results;
}

function presentarOcupacion(fila) {
  return { id: fila.id, hora: horaLegible(fila.inicio), hasta: horaLegible(fila.fin), mesa: fila.mesa, personas: fila.personas };
}

export async function consultarDisponibilidad(db, menu, url, json) {
  const fecha = url.searchParams.get("fecha");
  const personas = Number(url.searchParams.get("personas"));
  const opciones = opcionesDeReserva(menu, fecha, personas);
  if (!opciones) return json({ error: "Indica una fecha y un tamaño de grupo válidos." }, 400);

  const ocupadas = await ocupacionesDelDia(db, fecha);
  const horas = [...opciones.inicios].sort((a, b) => a - b)
    .filter(inicio => opciones.mesas.some(mesa => !ocupadas.some(fila =>
      fila.mesa === mesa.id && fila.inicio < inicio + opciones.duracion && fila.fin > inicio
    )))
    .map(horaLegible);

  return json({ horas });
}

export async function administrarAgenda(request, db, url, obtenerMenu, json) {
  if (request.method === "GET") {
    const fecha = url.searchParams.get("fecha");
    if (!fechaUtc(fecha)) return json({ error: "Selecciona una fecha válida." }, 400);
    return json((await ocupacionesDelDia(db, fecha)).map(presentarOcupacion));
  }

  const datos = await request.json().catch(() => null);
  const id = datos?.id;
  if (typeof id !== "string" || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/.test(id)) {
    return json({ error: "Referencia de agenda inválida." }, 400);
  }

  if (request.method === "DELETE") {
    const borrada = await db.prepare("DELETE FROM agenda_mesas WHERE id = ? RETURNING id").bind(id).first();
    return json({ cancelada: Boolean(borrada) });
  }
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const { fecha, hora, personas } = datos;
  const inicio = minutos(hora);
  const anterior = await db.prepare(
    "SELECT id, fecha, inicio, fin, mesa, personas FROM agenda_mesas WHERE id = ?"
  ).bind(id).first();
  if (anterior) {
    if (anterior.fecha === fecha && anterior.inicio === inicio && anterior.personas === personas) {
      return json(presentarOcupacion(anterior));
    }
    return json({ error: "Esa referencia ya se usó para otro horario." }, 409);
  }

  const opciones = opcionesDeReserva(await obtenerMenu(), fecha, personas);
  if (!opciones || !opciones.inicios.has(inicio)) {
    return json({ error: "Elige un horario y un número de personas válidos." }, 400);
  }

  const fin = inicio + opciones.duracion;
  // La selección de mesa y el alta ocurren en una sola sentencia.
  const fila = await db.prepare(`
    INSERT INTO agenda_mesas (id, fecha, inicio, fin, mesa, personas)
    SELECT ?1, ?2, ?3, ?4, json_extract(m.value, '$.id'), ?5
    FROM json_each(?6) AS m
    WHERE NOT EXISTS (
      SELECT 1 FROM agenda_mesas AS a
      WHERE a.fecha = ?2 AND a.mesa = json_extract(m.value, '$.id')
        AND a.inicio < ?4 AND a.fin > ?3
    )
    ORDER BY json_extract(m.value, '$.capacidad'), json_extract(m.value, '$.id')
    LIMIT 1
    ON CONFLICT(id) DO NOTHING
    RETURNING id, inicio, fin, mesa, personas
  `).bind(id, fecha, inicio, fin, personas, JSON.stringify(opciones.mesas)).first();

  if (fila) return json(presentarOcupacion(fila), 201);

  const reintento = await db.prepare(
    "SELECT id, fecha, inicio, fin, mesa, personas FROM agenda_mesas WHERE id = ?"
  ).bind(id).first();
  if (reintento?.fecha === fecha && reintento.inicio === inicio && reintento.personas === personas) {
    return json(presentarOcupacion(reintento));
  }
  return json({ error: "Ya no hay una mesa para ese grupo y horario." }, 409);
}
