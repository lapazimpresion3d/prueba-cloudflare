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

const columnasCobro = ", c.importe_centavos AS cobro_centavos, c.registrado AS cobro_registrado ";
const unionCobro = "LEFT JOIN cobros_pedido c ON c.pedido_folio = folio AND c.anulado IS NULL ";
const totalConEnvio = "total_centavos + COALESCE(json_extract(detalle_json, '$.entrega.envioCentavos'), 0)";
const pedidoConCobro = `(
  ${totalConEnvio} > 0
  OR (json_extract(detalle_json, '$.servicio') = 'domicilio'
    AND json_extract(detalle_json, '$.entrega') IS NULL)
)`;
const metodosCobro = new Map([
  ["efectivo", "Efectivo"], ["tarjeta", "Tarjeta"],
  ["transferencia", "Transferencia"], ["otro", "Otro"]
]);

function cobroRegistrado(fila, incluirMetodo = false) {
  return fila.cobro_registrado == null ? null :
    {
      importeCentavos: fila.cobro_centavos,
      registrado: fila.cobro_registrado,
      ...(incluirMetodo && fila.cobro_metodo ? { metodo: fila.cobro_metodo } : {})
    };
}

async function pedidoPorToken(db, seguimientoHash) {
  return db.prepare(
    "SELECT folio, estado, actualizado, detalle_json, total_centavos, transferencia_reportada, transferencia_no_localizada" + columnasCobro +
    "FROM pedidos_demo " + unionCobro + "WHERE seguimiento_hash = ?"
  ).bind(seguimientoHash).first();
}

async function reportarTransferencia(db, seguimientoHash, totalEsperado, json) {
  if (!Number.isSafeInteger(totalEsperado) || totalEsperado < 1) {
    return json({ error: "Actualiza el pedido para consultar el total a pagar." }, 400);
  }
  const fila = await db.prepare(`
    UPDATE pedidos_demo
    SET transferencia_reportada = COALESCE(transferencia_reportada, MAX(?, COALESCE(transferencia_no_localizada + 1, 0))),
      transferencia_no_localizada = NULL
    WHERE seguimiento_hash = ? AND estado <> 'cancelado' AND ${pedidoConCobro}
      AND ${totalConEnvio} = ?
      AND (json_extract(detalle_json, '$.servicio') <> 'domicilio' OR json_extract(detalle_json, '$.entrega') IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM cobros_pedido WHERE pedido_folio = pedidos_demo.folio AND anulado IS NULL
      )
    RETURNING transferencia_reportada
  `).bind(Date.now(), seguimientoHash, totalEsperado).first();
  if (fila) return json({ transferenciaReportada: fila.transferencia_reportada });

  const pedido = await pedidoPorToken(db, seguimientoHash);
  return pedido
    ? json({ error: "El pedido o su total cambió. Revisa el seguimiento antes de volver a avisar." }, 409)
    : json({ error: "No encontramos ese pedido de prueba." }, 404);
}

async function instruccionesTransferencia(db) {
  const fila = await db.prepare("SELECT instrucciones_transferencia FROM preferencias_pagos WHERE id = 1").first();
  return fila?.instrucciones_transferencia ?? "";
}

export async function administrarPreferenciasPagos(request, db, json) {
  if (request.method === "GET") return json({ instrucciones: await instruccionesTransferencia(db) });
  if (request.method !== "PUT") return json({ error: "Método no permitido." }, 405);
  const datos = await leerJson(request);
  if (typeof datos?.instrucciones !== "string" || datos.instrucciones.length > 600) {
    return json({ error: "Escribe hasta 600 caracteres en las instrucciones de transferencia." }, 400);
  }
  const instrucciones = datos.instrucciones.trim();
  await db.prepare(
    "INSERT INTO preferencias_pagos (id, instrucciones_transferencia) VALUES (1, ?) " +
    "ON CONFLICT (id) DO UPDATE SET instrucciones_transferencia = excluded.instrucciones_transferencia"
  ).bind(instrucciones).run();
  return json({ instrucciones });
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
  if (url.pathname === "/api/pedidos/avisar-transferencia") {
    return reportarTransferencia(env.DB, seguimientoHash, datos.totalCentavos, json);
  }
  const previo = soloRevisar ? null : await pedidoPorToken(env.DB, seguimientoHash);

  if (url.pathname === "/api/pedidos/seguimiento") {
    if (!previo) return json({ error: "No encontramos ese pedido de prueba." }, 404);
    const detalle = JSON.parse(previo.detalle_json);
    const { servicio, mesa, notas, moneda, lineas, entrega } = detalle;
    const cobro = cobroRegistrado(previo);
    const envioPendiente = servicio === "domicilio" && !entrega;
    const totalAPagarCentavos = envioPendiente ? null : previo.total_centavos + (entrega?.envioCentavos ?? 0);
    const puedeTransferir = !cobro && previo.estado !== "cancelado" && totalAPagarCentavos > 0;
    return json({
      ...estadoPublico(previo),
      cobro,
      transferenciaReportada: previo.transferencia_reportada,
      transferenciaNoLocalizada: previo.transferencia_no_localizada,
      totalAPagarCentavos,
      instruccionesTransferencia: puedeTransferir ? await instruccionesTransferencia(env.DB) : "",
      subtotalCentavos: previo.total_centavos,
      detalle: {
        servicio, mesa, notas, moneda,
        lineas: lineas.map(({ nombre, cantidad, incluye, omitidos, extras, precioUnitarioCentavos }) => ({
          nombre, cantidad, incluye, omitidos, extras, precioUnitarioCentavos
        })),
        ...(entrega ? { entrega: { colonia: entrega.colonia, envioCentavos: entrega.envioCentavos } } : {})
      }
    });
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
    // La dirección es obligatoria también en la API: no depender de la validación del navegador.
    const direccion = datos.direccionEntrega;
    const limites = { calle: 120, colonia: 80, referencias: 160, telefono: 25 };
    if (!direccion || !Object.entries(limites).every(([campo, maximo]) =>
      typeof direccion[campo] === "string" && direccion[campo].length <= maximo) ||
      !direccion.calle.trim() || !direccion.colonia.trim() ||
      (direccion.telefono.trim() && !/^\\+?\\d{10,15}$/.test(direccion.telefono.replace(/[\\s().-]/g, "")))) {
      return json({ error: "Revisa la dirección y el teléfono de contacto del pedido." }, 400);
    }
    // No permitir cotizar una colonia y enviar el pedido a otra con una tarifa diferente.
    if (entrega && direccion.colonia.trim() !== entrega.colonia) {
      return json({ error: "La colonia cambió. Revisa la dirección y el costo de envío." }, 409);
    }
    pedido.detalle.direccionEntrega = Object.fromEntries(Object.keys(limites).map(campo =>
      [campo, direccion[campo].trim()]));
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
    const vista = cocina ? null : url.searchParams.get("vista");
    const sinCobro = vista === "sin-cobro";
    const reportados = vista === "transferencias-reportadas";
    const historial = vista === "historial" || sinCobro || reportados;
    const paginado = historial && url.searchParams.get("pagina") === "1";
    const condiciones = [cocina ? "estado IN ('confirmado', 'preparacion')" :
      historial ? "estado IN ('entregado', 'cancelado')" :
      "estado NOT IN ('entregado', 'cancelado')"];
    if (sinCobro) {
      condiciones[0] = "estado = 'entregado'";
      condiciones.push("c.pedido_folio IS NULL", pedidoConCobro);
    }
    if (reportados) {
      condiciones[0] = "estado <> 'cancelado'";
      condiciones.push("transferencia_reportada IS NOT NULL", "c.pedido_folio IS NULL");
    }
    const valores = [];
    const estadoActivo = vista === "activos" ? url.searchParams.get("estado") : null;
    if (estadoActivo) {
      if (!Object.hasOwn(estados, estadoActivo) || estadoActivo === "entregado" || estadoActivo === "cancelado") {
        return json({ error: "Selecciona un estado válido para los pedidos activos." }, 400);
      }
      condiciones.push("estado = ?");
      valores.push(estadoActivo);
    }
    const metodo = vista === "historial" ? url.searchParams.get("metodo") : null;
    if (metodo === "sin-especificar") {
      condiciones.push("c.pedido_folio IS NOT NULL", "c.metodo IS NULL");
    } else if (metodo) {
      if (!metodosCobro.has(metodo)) {
        return json({ error: "Selecciona un método de pago válido." }, 400);
      }
      condiciones.push("c.metodo = ?");
      valores.push(metodo);
    }
    if (paginado) {
      for (const [parametro, condicion] of [["antes", "folio < ?"], ["folio", "folio = ?"]]) {
        const valor = url.searchParams.get(parametro);
        if (valor === null) continue;
        if (!/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor))) {
          return json({ error: "Indica un número de pedido válido." }, 400);
        }
        condiciones.push(condicion);
        valores.push(Number(valor));
      }
    }
    const limite = 50;
    const { results } = await db.prepare(
      "SELECT folio, creado, actualizado, estado, detalle_json, total_centavos" +
      (cocina ? " " : columnasCobro + ", c.metodo AS cobro_metodo, transferencia_reportada, transferencia_no_localizada ") +
      "FROM pedidos_demo " + (cocina ? "" : unionCobro) +
      "WHERE " + condiciones.join(" AND ") + " ORDER BY folio " + (historial ? "DESC" : "ASC") + " LIMIT ?"
    ).bind(...valores, paginado ? limite + 1 : limite).all();
    const pedidos = results.slice(0, limite).map(fila => {
      const detalle = JSON.parse(fila.detalle_json);
      const pedido = {
        ...estadoPublico(fila), creado: fila.creado,
        acciones: accionesPara(fila.estado, detalle.servicio, cocina)
      };
      if (!cocina) return {
        ...pedido, detalle, totalCentavos: fila.total_centavos,
        cobro: cobroRegistrado(fila, true), transferenciaReportada: fila.transferencia_reportada,
        transferenciaNoLocalizada: fila.transferencia_no_localizada
      };
      const { servicio, mesa, notas, lineas } = detalle;
      return { ...pedido, detalle: {
        servicio, mesa, notas,
        lineas: lineas.map(({ nombre, cantidad, incluye, omitidos, extras }) => ({
          nombre, cantidad, incluye, omitidos, extras
        }))
      } };
    });
    if (!paginado) return json(pedidos);
    return json({ pedidos, siguiente: results.length > limite ? pedidos.at(-1).folio : null });
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

export async function administrarCobro(request, db, json) {
  if (request.method !== "PUT") return json({ error: "Método no permitido." }, 405);
  const datos = await leerJson(request);
  if (!Number.isSafeInteger(datos?.folio) || datos.folio < 1) {
    return json({ error: "Indica un folio válido." }, 400);
  }
  if (datos.accion === "no-localizada" && Number.isSafeInteger(datos.reportada)) {
    const fila = await db.prepare(`
      UPDATE pedidos_demo SET transferencia_no_localizada = MAX(?, transferencia_reportada), transferencia_reportada = NULL
      WHERE folio = ? AND estado <> 'cancelado' AND transferencia_reportada = ?
        AND NOT EXISTS (SELECT 1 FROM cobros_pedido WHERE pedido_folio = pedidos_demo.folio AND anulado IS NULL)
      RETURNING transferencia_no_localizada
    `).bind(Date.now(), datos.folio, datos.reportada).first();
    return fila ? json({ transferenciaNoLocalizada: fila.transferencia_no_localizada }) :
      json({ error: "El aviso ya cambió. Actualiza el pedido." }, 409);
  }
  if (datos.accion === "cotizar-envio") {
    const costo = datos.envioCentavos;
    const anterior = datos.envioAnterior;
    const valido = valor => Number.isSafeInteger(valor) && valor >= 0 && valor <= 100000000;
    if (!valido(costo) || (anterior !== null && !valido(anterior))) {
      return json({ error: "Indica un costo de envío válido." }, 400);
    }
    const fila = await db.prepare(`
      UPDATE pedidos_demo SET detalle_json = json_set(detalle_json, '$.entrega',
        json_object('envioCentavos', ?, 'origen', 'manual',
          'colonia', COALESCE(json_extract(detalle_json, '$.direccionEntrega.colonia'), '')))
      WHERE folio = ? AND estado <> 'cancelado' AND json_extract(detalle_json, '$.servicio') = 'domicilio'
        AND json_extract(detalle_json, '$.entrega.envioCentavos') IS ?
        AND (json_extract(detalle_json, '$.entrega') IS NULL OR
          (json_extract(detalle_json, '$.entrega.origen') = 'manual' AND transferencia_reportada IS NULL))
        AND NOT EXISTS (SELECT 1 FROM cobros_pedido WHERE pedido_folio = pedidos_demo.folio AND anulado IS NULL)
      RETURNING folio
    `).bind(costo, datos.folio, anterior).first();
    return fila ? json({ envioCentavos: costo }) :
      json({ error: "El costo de envío ya cambió o el pedido ya tiene un pago reportado o registrado. Actualiza la lista." }, 409);
  }
  if (datos.accion === "corregir" && Number.isSafeInteger(datos.registrado)) {
    const fila = await db.prepare(
      "UPDATE cobros_pedido SET anulado = ? WHERE pedido_folio = ? AND registrado = ? " +
      "AND anulado IS NULL RETURNING pedido_folio"
    ).bind(Date.now(), datos.folio, datos.registrado).first();
    return fila ? json({ cobro: null }) : json({ error: "El registro de cobro cambió. Actualiza el pedido." }, 409);
  }
  const devolverCobro = "RETURNING importe_centavos AS cobro_centavos, registrado AS cobro_registrado, metodo AS cobro_metodo";
  if (datos.accion === "editar-metodo") {
    if (!Number.isSafeInteger(datos.registrado) || datos.registrado < 1 ||
        (datos.metodoAnterior !== null && !metodosCobro.has(datos.metodoAnterior)) ||
        !metodosCobro.has(datos.metodo)) {
      return json({ error: "Selecciona un método de pago válido y vuelve a intentar." }, 400);
    }
    const fila = await db.prepare(
      "UPDATE cobros_pedido SET metodo = ? WHERE pedido_folio = ? AND registrado = ? " +
      "AND metodo IS ? AND anulado IS NULL " + devolverCobro
    ).bind(datos.metodo, datos.folio, datos.registrado, datos.metodoAnterior).first();
    return fila ? json({ cobro: cobroRegistrado(fila, true) }) :
      json({ error: "El registro de cobro cambió. Actualiza el pedido." }, 409);
  }
  if (datos.accion !== "registrar" || !Number.isSafeInteger(datos.importeCentavos) || datos.importeCentavos < 1) {
    return json({ error: "Indica el importe que recibiste." }, 400);
  }
  if (datos.metodo !== undefined && !metodosCobro.has(datos.metodo)) {
    return json({ error: "Selecciona un método de pago válido." }, 400);
  }

  const pedido = await db.prepare(
    "SELECT detalle_json, total_centavos FROM pedidos_demo WHERE folio = ?"
  ).bind(datos.folio).first();
  if (!pedido) return json({ error: "No encontramos ese pedido." }, 404);
  const detalle = JSON.parse(pedido.detalle_json);
  const envioPendiente = detalle.servicio === "domicilio" && !detalle.entrega;
  const total = pedido.total_centavos + (detalle.entrega?.envioCentavos ?? 0);
  if (envioPendiente ? datos.importeCentavos < total : datos.importeCentavos !== total) {
    return json({
      error: envioPendiente ? "El cobro debe cubrir el subtotal de productos." :
        "El cobro debe coincidir con el total del pedido."
    }, 400);
  }

  const fila = await db.prepare(
    "INSERT INTO cobros_pedido (pedido_folio, importe_centavos, registrado, metodo) " +
    "SELECT folio, ?, ?, ? FROM pedidos_demo WHERE folio = ? AND estado <> 'cancelado' AND detalle_json = ? " +
    "ON CONFLICT (pedido_folio) DO UPDATE SET importe_centavos = excluded.importe_centavos, " +
    "registrado = MAX(excluded.registrado, cobros_pedido.registrado + 1), anulado = NULL, metodo = excluded.metodo " +
    "WHERE cobros_pedido.anulado IS NOT NULL " + devolverCobro
  ).bind(datos.importeCentavos, Date.now(), datos.metodo ?? null, datos.folio, pedido.detalle_json).first();
  return fila ? json({ cobro: cobroRegistrado(fila, true) }) :
    json({ error: "El pedido o el cobro cambió. Actualiza la lista." }, 409);
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

function periodoEstadisticas(url, menu) {
  const timeZone = menu.horario?.zonaHoraria || "America/Mazatlan";
  const formatoFecha = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit"
  });
  const hoy = fechaCalendario(formatoFecha, Date.now());
  const diasSolicitados = url.searchParams.get("dias");
  if (diasSolicitados !== null && (!["1", "7", "30"].includes(diasSolicitados) ||
      url.searchParams.has("desde") || url.searchParams.has("hasta"))) {
    return { error: "Selecciona un período rápido válido o elige fechas específicas." };
  }
  const dias = Number(diasSolicitados ?? 7);
  const desdePredeterminado = new Date(fechaEnUtc(hoy) - (dias - 1) * msPorDia).toISOString().slice(0, 10);
  const desde = url.searchParams.get("desde") ?? desdePredeterminado;
  const hasta = url.searchParams.get("hasta") ?? hoy;
  const inicioUtc = fechaEnUtc(desde);
  const ultimoUtc = fechaEnUtc(hasta);

  if (!Number.isFinite(inicioUtc) || !Number.isFinite(ultimoUtc) ||
      inicioUtc > ultimoUtc || hasta > hoy || ultimoUtc - inicioUtc >= 31 * msPorDia) {
    return { error: "Elige un período de hasta 31 días, con fechas de hoy o anteriores." };
  }
  return { timeZone, formatoFecha, hoy, desde, hasta, inicioUtc, ultimoUtc };
}

export async function exportarCobros(db, url, menu, json) {
  const periodo = periodoEstadisticas(url, menu);
  if (periodo.error) return json({ error: periodo.error }, 400);

  const { timeZone, formatoFecha, desde, hasta, inicioUtc, ultimoUtc } = periodo;
  const inicio = inicioLocal(formatoFecha, desde, inicioUtc);
  const finUtc = ultimoUtc + msPorDia;
  const fin = inicioLocal(formatoFecha, new Date(finUtc).toISOString().slice(0, 10), finUtc);
  const { results } = await db.prepare(`
    SELECT pedido_folio, registrado, metodo, importe_centavos
    FROM cobros_pedido
    WHERE anulado IS NULL AND registrado >= ? AND registrado < ?
    ORDER BY registrado, pedido_folio
  `).bind(inicio, fin).all();

  const formatoHora = new Intl.DateTimeFormat("en-GB", {
    timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const filas = [["Folio", "Fecha de cobro", "Hora local", "Método de pago", "Importe", "Moneda"]];
  const moneda = /^[A-Z]{3}$/.test(menu.moneda) ? menu.moneda : "";
  for (const fila of results) {
    filas.push([
      fila.pedido_folio, fechaCalendario(formatoFecha, fila.registrado), formatoHora.format(fila.registrado),
      metodosCobro.get(fila.metodo) ?? "Sin especificar", (fila.importe_centavos / 100).toFixed(2), moneda
    ]);
  }
  const csv = filas.map(fila => fila.join(",")).join("\r\n");
  return new Response("\uFEFF" + csv + "\r\n", {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="el-comal-cobros-${desde}-a-${hasta}.csv"`
    }
  });
}

export async function consultarEstadisticas(db, url, menu, json) {
  const periodo = periodoEstadisticas(url, menu);
  if (periodo.error) return json({ error: periodo.error }, 400);
  const { timeZone, formatoFecha, hoy, desde, hasta, inicioUtc, ultimoUtc } = periodo;

  const fechas = [];
  const limites = [];
  for (let utc = inicioUtc; utc <= ultimoUtc + msPorDia; utc += msPorDia) {
    const fecha = new Date(utc).toISOString().slice(0, 10);
    if (utc <= ultimoUtc) fechas.push(fecha);
    limites.push(inicioLocal(formatoFecha, fecha, utc));
  }
  const inicio = limites[0];
  const fin = limites.at(-1);
  const diasConsultados = fechas.length;
  const utcAnterior = inicioUtc - diasConsultados * msPorDia;
  const desdeAnterior = new Date(utcAnterior).toISOString().slice(0, 10);
  const hastaAnterior = new Date(inicioUtc - msPorDia).toISOString().slice(0, 10);
  const comparar = desdeAnterior >= "0001-01-01" && Number.isFinite(fechaEnUtc(desdeAnterior));
  const inicioAnterior = comparar ? inicioLocal(formatoFecha, desdeAnterior, utcAnterior) : inicio;
  // Agrupar en SQLite con los límites de cada día local, incluso cuando dura 23 o 25 horas.
  const agruparPorDia = columna => "CASE " +
    limites.map((_, indice) => `WHEN ${columna} < ? THEN ${indice - 1}`).join(" ") + " END";

  const [pedidosPorDia, productos, cobrosPorDia, minutos] = await Promise.all([
    db.prepare(`
      SELECT ${agruparPorDia("creado")} AS dia, COUNT(*) AS recibidos,
        COUNT(CASE WHEN estado = 'entregado' THEN 1 END) AS entregados,
        COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) AS cancelados,
        COUNT(CASE WHEN json_extract(detalle_json, '$.servicio') = 'mesa' THEN 1 END) AS mesa,
        COUNT(CASE WHEN json_extract(detalle_json, '$.servicio') = 'recoger' THEN 1 END) AS recoger,
        COUNT(CASE WHEN json_extract(detalle_json, '$.servicio') = 'domicilio' THEN 1 END) AS domicilio,
        COALESCE(SUM(CASE WHEN estado = 'entregado' THEN total_centavos END), 0) AS importeCentavos
      FROM pedidos_demo WHERE creado >= ? AND creado < ?
      GROUP BY dia
    `).bind(...limites, inicioAnterior, fin).all(),
    db.prepare(`
      SELECT json_extract(linea.value, '$.nombre') AS nombre,
        SUM(json_extract(linea.value, '$.cantidad')) AS unidades
      FROM pedidos_demo AS pedido, json_each(pedido.detalle_json, '$.lineas') AS linea
      WHERE pedido.creado >= ? AND pedido.creado < ? AND pedido.estado <> 'cancelado'
      GROUP BY nombre ORDER BY unidades DESC, nombre ASC LIMIT 5
    `).bind(inicio, fin).all(),
    db.prepare(`
      SELECT ${agruparPorDia("registrado")} AS dia, metodo,
        COUNT(*) AS cantidad, SUM(importe_centavos) AS importeCentavos
      FROM cobros_pedido
      WHERE anulado IS NULL AND registrado >= ? AND registrado < ?
      GROUP BY dia, metodo
    `).bind(...limites, inicioAnterior, fin).all(),
    db.prepare(`
      SELECT creado / 60000 AS minuto, COUNT(*) AS cantidad
      FROM pedidos_demo
      WHERE creado >= ? AND creado < ? AND estado <> 'cancelado'
      GROUP BY minuto
    `).bind(inicio, fin).all()
  ]);
  const resumen = { recibidos: 0, entregados: 0, cancelados: 0, mesa: 0, recoger: 0,
    domicilio: 0, importeCentavos: 0 };
  const cobros = { cantidad: 0, importeCentavos: 0 };
  const pedidosAnteriores = pedidosPorDia.results.find(fila => fila.dia === -1);
  const cobrosAnteriores = { cantidad: 0, importeCentavos: 0 };
  const cobrosPorMetodo = new Map([...metodosCobro.keys(), null].map(metodo => [
    metodo, { metodo, cantidad: 0, importeCentavos: 0 }
  ]));
  const periodoAnterior = comparar ? {
    desde: desdeAnterior,
    hasta: hastaAnterior,
    recibidos: pedidosAnteriores?.recibidos ?? 0,
    cobros: cobrosAnteriores
  } : null;
  const actividadDiaria = fechas.map(fecha => ({
    fecha, recibidos: 0, cancelados: 0, cobros: 0, cobradoCentavos: 0
  }));
  for (const fila of pedidosPorDia.results) {
    if (fila.dia === -1) continue;
    for (const campo of Object.keys(resumen)) resumen[campo] += fila[campo];
    actividadDiaria[fila.dia].recibidos = fila.recibidos;
    actividadDiaria[fila.dia].cancelados = fila.cancelados;
  }
  for (const fila of cobrosPorDia.results) {
    if (fila.dia === -1) {
      cobrosAnteriores.cantidad += fila.cantidad;
      cobrosAnteriores.importeCentavos += fila.importeCentavos;
      continue;
    }
    cobros.cantidad += fila.cantidad;
    cobros.importeCentavos += fila.importeCentavos;
    actividadDiaria[fila.dia].cobros += fila.cantidad;
    actividadDiaria[fila.dia].cobradoCentavos += fila.importeCentavos;
    const metodo = cobrosPorMetodo.get(fila.metodo);
    metodo.cantidad += fila.cantidad;
    metodo.importeCentavos += fila.importeCentavos;
  }
  const formatoHora = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" });
  const cantidadesPorHora = Array(24).fill(0);
  for (const { minuto, cantidad } of minutos.results) {
    const hora = Number(formatoHora.format(minuto * 60000));
    cantidadesPorHora[hora] += cantidad;
  }
  const horasDemanda = cantidadesPorHora
    .map((cantidad, hora) => ({ hora, cantidad }))
    .filter(({ cantidad }) => cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad || a.hora - b.hora)
    .slice(0, 5);

  return json({
    desde, hasta, hoy, moneda: menu.moneda, ...resumen,
    enCurso: resumen.recibidos - resumen.entregados - resumen.cancelados,
    promedioCentavos: resumen.entregados
      ? Math.round(resumen.importeCentavos / resumen.entregados)
      : null,
    productos: productos.results,
    cobros,
    cobrosPorMetodo: [...cobrosPorMetodo.values()].filter(metodo => metodo.cantidad > 0),
    horasDemanda,
    actividadDiaria,
    periodoAnterior
  });
}
