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

function accionesPara(estado, servicio) {
  const siguiente = {
    recibido: "confirmado",
    confirmado: "preparacion",
    preparacion: servicio === "domicilio" ? "en_reparto" : "listo",
    listo: "entregado",
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

  const seguimientoHash = await hash("seguimiento:" + datos.token);
  const previo = await pedidoPorToken(env.DB, seguimientoHash);

  if (url.pathname === "/api/pedidos/seguimiento") {
    return previo ? json(estadoPublico(previo)) : json({ error: "No encontramos ese pedido de prueba." }, 404);
  }

  if (previo) return json(estadoPublico(previo));
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16) {
    return json({ error: "El registro de pedidos de prueba todavía no está configurado." }, 503);
  }
  if (!servicios.includes(datos.servicio) || typeof datos.notas !== "string" || datos.notas.length > 200 ||
      !Array.isArray(datos.lineas) || datos.lineas.length === 0 || datos.lineas.length > 30) {
    return json({ error: "Revisa los datos del pedido de prueba." }, 400);
  }

  const pedido = prepararDetalle(datos, await obtenerMenu());
  if (!pedido) {
    return json({ error: "El menú cambió o alguna opción no está disponible. Vuelve al carrito y revisa el pedido." }, 409);
  }

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

export async function administrarPedidos(request, db, url, json) {
  if (request.method === "GET") {
    const historial = url.searchParams.get("vista") === "historial";
    const consulta = await db.prepare(
      "SELECT folio, creado, actualizado, estado, detalle_json, total_centavos FROM pedidos_demo " +
      (historial ? "WHERE estado IN ('entregado', 'cancelado') ORDER BY folio DESC " :
        "WHERE estado NOT IN ('entregado', 'cancelado') ORDER BY folio ASC ") +
      "LIMIT 50"
    ).all();
    return json(consulta.results.map(fila => {
      const detalle = JSON.parse(fila.detalle_json);
      return {
        ...estadoPublico(fila), creado: fila.creado, detalle, totalCentavos: fila.total_centavos,
        acciones: accionesPara(fila.estado, detalle.servicio)
      };
    }));
  }

  if (request.method !== "PUT") return json({ error: "Método no permitido." }, 405);
  const datos = await leerJson(request);
  if (!Number.isSafeInteger(datos?.folio) || datos.folio < 1 ||
      !Object.hasOwn(estados, datos.actual) || !Object.hasOwn(estados, datos.nuevo)) {
    return json({ error: "Indica un pedido y un cambio de estado válidos." }, 400);
  }
  const fila = await db.prepare("SELECT estado, detalle_json FROM pedidos_demo WHERE folio = ?")
    .bind(datos.folio).first();
  if (!fila) return json({ error: "El pedido ya no está disponible." }, 404);
  if (fila.estado !== datos.actual) return json({ error: "El estado ya cambió. Actualiza la lista." }, 409);

  const { servicio } = JSON.parse(fila.detalle_json);
  if (!accionesPara(fila.estado, servicio).some(accion => accion.id === datos.nuevo)) {
    return json({ error: "Ese cambio de estado no está disponible." }, 400);
  }
  const actualizado = await db.prepare(
    "UPDATE pedidos_demo SET estado = ?, actualizado = ? WHERE folio = ? AND estado = ? " +
    "RETURNING folio, estado, actualizado"
  ).bind(datos.nuevo, Date.now(), datos.folio, datos.actual).first();
  return actualizado ? json(estadoPublico(actualizado)) :
    json({ error: "El estado ya cambió. Actualiza la lista." }, 409);
}
