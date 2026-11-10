import { cotizarEntrega } from "./entrega.mjs";

const encoder = new TextEncoder();
const tokenValido = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/;
const servicios = ["recoger", "domicilio", "mesa"];
const estados = {
  recibido: "Recibido",
  confirmado: "Confirmado",
  preparacion: "En preparación",
  listo: "Listo",
  en_reparto: "En reparto",
  entregado: "Entregado",
  cancelado: "Cancelado"
};

function accionesPara(estado, servicio, cocina) {
  if (cocina) {
    const siguiente = { confirmado: "preparacion", preparacion: "listo" }[estado];
    return siguiente ? [{ id: siguiente, etiqueta: estados[siguiente] }] : [];
  }
  const siguiente = {
    recibido: "confirmado",
    confirmado: "preparacion",
    preparacion: servicio === "domicilio" ? "en_reparto" : "listo",
    listo: servicio === "domicilio" ? "en_reparto" : "entregado",
    en_reparto: "entregado"
  }[estado];
  return siguiente ? [siguiente, "cancelado"].map(id => ({ id, etiqueta: estados[id] })) : [];
}

async function leerJson(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let texto = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16000) {
        await reader.cancel();
        return null;
      }
      texto += decoder.decode(value, { stream: true });
    }
    return JSON.parse(texto + decoder.decode());
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

async function hash(texto) {
  const datos = await crypto.subtle.digest("SHA-256", encoder.encode(texto));
  return Array.from(new Uint8Array(datos), byte => byte.toString(16).padStart(2, "0")).join("");
}

function seleccionValida(lista) {
  return Array.isArray(lista) && lista.length <= 30 &&
    lista.every(nombre => typeof nombre === "string") && new Set(lista).size === lista.length;
}

function prepararDetalle(datos, menu) {
  const mesa = datos.servicio === "mesa"
    ? menu.reservaciones?.mesas?.find(item => item.codigo === datos.codigoMesa)
    : null;
  if (datos.servicio === "mesa" && !mesa) return null;

  const catalogo = new Map(menu.categorias.flatMap(categoria =>
    categoria.productos.map(producto => [producto.id, producto])
  ));
  const lineas = [];
  let totalCentavos = 0;

  for (const linea of datos.lineas) {
    const producto = catalogo.get(linea?.productoId);
    if (!producto || producto.disponible === false ||
        !Number.isSafeInteger(linea.cantidad) || linea.cantidad < 1 || linea.cantidad > 50 ||
        !seleccionValida(linea.ingredientes) || !seleccionValida(linea.extras)) {
      return null;
    }

    const variantes = producto.variantes ?? producto.tamanos ?? [];
    const variante = variantes.find(opcion => opcion.id === linea.varianteId);
    const bebida = variante?.productoId ? catalogo.get(variante.productoId) : null;
    if ((variantes.length > 0) !== Boolean(variante) ||
        (linea.varianteId != null && !variante) ||
        (variante?.productoId && (!bebida || bebida.disponible === false))) {
      return null;
    }

    const ingredientes = producto.ingredientes ?? [];
    if (linea.ingredientes.some(nombre => !ingredientes.some(ingrediente => ingrediente.nombre === nombre)) ||
        ingredientes.some(ingrediente => ingrediente.obligatorio && !linea.ingredientes.includes(ingrediente.nombre))) {
      return null;
    }

    const extras = new Map((producto.extras ?? []).map(extra => [extra.nombre, extra.precio]));
    const limite = Number.isInteger(producto.maxExtras) && producto.maxExtras >= 0 ? producto.maxExtras : Infinity;
    if (linea.extras.length > limite || linea.extras.some(nombre => !extras.has(nombre))) return null;

    const precioUnitarioCentavos = Math.round(100 * (
      (producto.precioEspecial ?? producto.precio) + (variante?.recargo ?? 0) +
      linea.extras.reduce((suma, nombre) => suma + extras.get(nombre), 0)
    ));
    if (!Number.isSafeInteger(precioUnitarioCentavos) || precioUnitarioCentavos < 0 ||
        precioUnitarioCentavos !== linea.precioUnitarioCentavos) {
      return null;
    }
    totalCentavos += precioUnitarioCentavos * linea.cantidad;
    lineas.push({
      nombre: variante ? producto.nombre + " (" + variante.nombre + ")" : producto.nombre,
      cantidad: linea.cantidad,
      incluye: producto.incluye ?? [],
      omitidos: ingredientes.filter(ingrediente => !linea.ingredientes.includes(ingrediente.nombre))
        .map(ingrediente => ingrediente.nombre),
      extras: linea.extras,
      precioUnitarioCentavos
    });
  }

  return {
    detalle: { servicio: datos.servicio, mesa: mesa?.id ?? null, notas: datos.notas.trim(), moneda: menu.moneda, lineas },
    totalCentavos
  };
}

function estadoPublico(fila) {
  return { folio: fila.folio, estado: fila.estado, etiqueta: estados[fila.estado], actualizado: fila.actualizado };
}

async function pedidoPorToken(db, seguimientoHash) {
  return db.prepare(
    "SELECT folio, estado, actualizado FROM pedidos_demo WHERE seguimiento_hash = ?"
  ).bind(seguimientoHash).first();
}

export async function pedidosPublicos(request, env, url, obtenerMenu, json) {
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);
  if (request.headers.get("Origin") !== url.origin) return json({ error: "Solicitud de origen no permitido." }, 403);

  const datos = await leerJson(request);
  if (typeof datos?.token !== "string" || !tokenValido.test(datos.token)) {
    return json({ error: "Referencia de seguimiento inválida." }, 400);
  }

  const soloRevisar = url.pathname === "/api/pedidos/revisar";
  const seguimientoHash = soloRevisar ? null : await hash("seguimiento:" + datos.token);
  const previo = soloRevisar ? null : await pedidoPorToken(env.DB, seguimientoHash);

  if (url.pathname === "/api/pedidos/seguimiento") {
    return previo ? json(estadoPublico(previo)) : json({ error: "No encontramos ese pedido de prueba." }, 404);
  }

  if (previo) return json(estadoPublico(previo));
  if (!soloRevisar && (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16)) {
    return json({ error: "El registro de pedidos de prueba todavía no está configurado." }, 503);
  }
  if (!servicios.includes(datos.servicio) || typeof datos.notas !== "string" || datos.notas.length > 200 ||
      !Array.isArray(datos.lineas) || datos.lineas.length === 0 || datos.lineas.length > 30) {
    return json({ error: "Revisa los datos del pedido de prueba." }, 400);
  }

  const menu = await obtenerMenu();
  const pedido = prepararDetalle(datos, menu);
  if (!pedido) {
    return json({ error: "El menú cambió o alguna opción no está disponible. Vuelve al carrito y revisa el pedido." }, 409);
  }
  if (datos.servicio === "domicilio") {
    const { entrega, error } = cotizarEntrega(menu.entrega, datos.entrega, pedido.totalCentavos);
    if (error) return json({ error }, 409);
    if (entrega) pedido.detalle.entrega = entrega;
  }
  if (soloRevisar) return json({ ok: true });

  const ip = request.headers.get("CF-Connecting-IP") || "sin-ip";
  const origenHash = await hash(env.ADMIN_PASSWORD + ":pedidos:" + ip);
  const ahora = Date.now();
  const fila = await env.DB.prepare(`
    INSERT INTO pedidos_demo
      (seguimiento_hash, origen_hash, creado, actualizado, estado, detalle_json, total_centavos)
    SELECT ?1, ?2, ?3, ?3, 'recibido', ?4, ?5
    WHERE (SELECT COUNT(*) FROM pedidos_demo WHERE origen_hash = ?2 AND creado > ?6) < 10
    ON CONFLICT(seguimiento_hash) DO NOTHING
    RETURNING folio, estado, actualizado
  `).bind(seguimientoHash, origenHash, ahora, JSON.stringify(pedido.detalle), pedido.totalCentavos, ahora - 60000).first();

  if (fila) return json(estadoPublico(fila), 201);
  const reintento = await pedidoPorToken(env.DB, seguimientoHash);
  if (reintento) return json(estadoPublico(reintento));
  return json({ error: "Se alcanzó el límite de pedidos de prueba. Espera un minuto e inténtalo otra vez." }, 429, { "Retry-After": "60" });
}

export async function administrarPedidos(request, db, url, json, cocina = false) {
  if (request.method === "GET") {
    const historial = url.searchParams.get("vista") === "historial";
    const filtro = cocina ? "WHERE estado IN ('confirmado', 'preparacion') ORDER BY folio ASC " :
      historial ? "WHERE estado IN ('entregado', 'cancelado') ORDER BY folio DESC " :
      "WHERE estado NOT IN ('entregado', 'cancelado') ORDER BY folio ASC ";
    const consulta = await db.prepare(
      "SELECT folio, creado, actualizado, estado, detalle_json, total_centavos FROM pedidos_demo " +
      filtro + "LIMIT 50"
    ).all();
    return json(consulta.results.map(fila => {
      const detalle = JSON.parse(fila.detalle_json);
      const pedido = {
        ...estadoPublico(fila), creado: fila.creado,
        acciones: accionesPara(fila.estado, detalle.servicio, cocina)
      };
      if (!cocina) return { ...pedido, detalle, totalCentavos: fila.total_centavos };
      const { servicio, mesa, notas, lineas } = detalle;
      return { ...pedido, detalle: {
        servicio, mesa, notas,
        lineas: lineas.map(({ nombre, cantidad, incluye, omitidos, extras }) => ({
          nombre, cantidad, incluye, omitidos, extras
        }))
      } };
    }));
  }

  if (request.method !== "PUT") return json({ error: "Método no permitido." }, 405);
  const datos = await leerJson(request);
  if (!Number.isSafeInteger(datos?.folio) || datos.folio < 1 ||
      !Object.hasOwn(estados, datos.actual) || !Object.hasOwn(estados, datos.nuevo) ||
      (cocina && !accionesPara(datos.actual, null, true).some(accion => accion.id === datos.nuevo))) {
    return json({ error: "Indica un pedido y un cambio de estado válidos." }, 400);
  }
  const fila = await db.prepare("SELECT estado, detalle_json FROM pedidos_demo WHERE folio = ?" +
    (cocina ? " AND estado IN ('confirmado', 'preparacion')" : ""))
    .bind(datos.folio).first();
  if (!fila) return json({ error: "El pedido ya no está disponible." }, 404);
  if (fila.estado !== datos.actual) return json({ error: "El estado ya cambió. Actualiza la lista." }, 409);

  const { servicio } = JSON.parse(fila.detalle_json);
  if (!accionesPara(fila.estado, servicio, cocina).some(accion => accion.id === datos.nuevo)) {
    return json({ error: "Ese cambio de estado no está disponible." }, 400);
  }
  const actualizado = await db.prepare(
    "UPDATE pedidos_demo SET estado = ?, actualizado = ? WHERE folio = ? AND estado = ? " +
    "RETURNING folio, estado, actualizado"
  ).bind(datos.nuevo, Date.now(), datos.folio, datos.actual).first();
  return actualizado ? json(estadoPublico(actualizado)) :
    json({ error: "El estado ya cambió. Actualiza la lista." }, 409);
}

const msPorDia = 24 * 60 * 60 * 1000;

function fechaCalendario(formato, instante) {
  const { year, month, day } = Object.fromEntries(
    formato.formatToParts(new Date(instante)).map(({ type, value }) => [type, value])
  );
  return year + "-" + month + "-" + day;
}

function fechaEnUtc(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NaN;
  const instante = Date.parse(fecha + "T00:00:00Z");
  return Number.isFinite(instante) && new Date(instante).toISOString().slice(0, 10) === fecha
    ? instante
    : NaN;
}

function inicioLocal(formato, fecha, utc) {
  let minimo = utc - msPorDia;
  let maximo = utc + msPorDia;
  while (minimo < maximo) {
    const medio = Math.floor((minimo + maximo) / 2);
    if (fechaCalendario(formato, medio) < fecha) minimo = medio + 1;
    else maximo = medio;
  }
  return minimo;
}

export async function consultarEstadisticas(db, url, menu, json) {
  const formatoFecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: menu.horario?.zonaHoraria || "America/Mazatlan",
    year: "numeric", month: "2-digit", day: "2-digit"
  });
  const hoy = fechaCalendario(formatoFecha, Date.now());
  const desdePredeterminado = new Date(fechaEnUtc(hoy) - 6 * msPorDia).toISOString().slice(0, 10);
  const desde = url.searchParams.get("desde") ?? desdePredeterminado;
  const hasta = url.searchParams.get("hasta") ?? hoy;
  const inicioUtc = fechaEnUtc(desde);
  const ultimoUtc = fechaEnUtc(hasta);

  if (!Number.isFinite(inicioUtc) || !Number.isFinite(ultimoUtc) ||
      inicioUtc > ultimoUtc || hasta > hoy || ultimoUtc - inicioUtc >= 31 * msPorDia) {
    return json({ error: "Elige un período de hasta 31 días, con fechas de hoy o anteriores." }, 400);
  }

  const siguienteUtc = ultimoUtc + msPorDia;
  const siguiente = new Date(siguienteUtc).toISOString().slice(0, 10);
  const inicio = inicioLocal(formatoFecha, desde, inicioUtc);
  const fin = inicioLocal(formatoFecha, siguiente, siguienteUtc);

  const [resumen, productos] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS recibidos,
        COUNT(CASE WHEN estado = 'entregado' THEN 1 END) AS entregados,
        COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) AS cancelados,
        COUNT(CASE WHEN json_extract(detalle_json, '$.servicio') = 'mesa' THEN 1 END) AS mesa,
        COUNT(CASE WHEN json_extract(detalle_json, '$.servicio') = 'recoger' THEN 1 END) AS recoger,
        COUNT(CASE WHEN json_extract(detalle_json, '$.servicio') = 'domicilio' THEN 1 END) AS domicilio,
        COALESCE(SUM(CASE WHEN estado = 'entregado' THEN total_centavos END), 0) AS importeCentavos
      FROM pedidos_demo WHERE creado >= ? AND creado < ?
    `).bind(inicio, fin).first(),
    db.prepare(`
      SELECT json_extract(linea.value, '$.nombre') AS nombre,
        SUM(json_extract(linea.value, '$.cantidad')) AS unidades
      FROM pedidos_demo AS pedido, json_each(pedido.detalle_json, '$.lineas') AS linea
      WHERE pedido.creado >= ? AND pedido.creado < ? AND pedido.estado <> 'cancelado'
      GROUP BY nombre ORDER BY unidades DESC, nombre ASC LIMIT 5
    `).bind(inicio, fin).all()
  ]);

  return json({
    desde, hasta, hoy, moneda: menu.moneda, ...resumen,
    enCurso: resumen.recibidos - resumen.entregados - resumen.cancelados,
    promedioCentavos: resumen.entregados
      ? Math.round(resumen.importeCentavos / resumen.entregados)
      : null,
    productos: productos.results
  });
}
