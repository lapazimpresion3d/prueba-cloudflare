import { administrarCobro, administrarPedidos, consultarEstadisticas, pedidosPublicos } from "./pedidos.mjs";
import { administrarAgenda, consultarDisponibilidad } from "./reservaciones.mjs";
import { aplicarCatalogo, guardarProducto, servirFoto } from "./catalogo.mjs";
import { administrarEntrega, leerEntrega } from "./entrega.mjs";
import { aplicarPrecio, fechaNegocio, validarPromocion } from "./promociones.mjs";
import { guardarDatosNegocio, leerDatosNegocio } from "./negocio.mjs";

const encoder = new TextEncoder();
const cookieSesion = "__Host-comal-admin";
const cookieCocina = "__Host-comal-cocina";
const sesionNormal = 8 * 60 * 60;
const sesionRecordada = 7 * 24 * 60 * 60;
const maximoFallos = 10;
const ventanaFallos = 60;

function json(datos, status = 200, headers = {}) {
  return Response.json(datos, {
    status,
    headers: { "Cache-Control": "no-store", ...headers }
  });
}

async function leerMenu(request, env) {
  const url = new URL("/menu.json", request.url);
  const [archivo, preferencias] = await Promise.all([
    env.ASSETS.fetch(new Request(url)),
    env.DB.prepare("SELECT turnos_json FROM preferencias_horario WHERE id = 1").first()
  ]);
  if (!archivo.ok) throw new Error("No se pudo cargar menu.json");
  const menu = await archivo.json();
  if (preferencias) {
    menu.horario = { ...menu.horario, turnos: JSON.parse(preferencias.turnos_json) };
  }
  menu.contacto = await leerDatosNegocio(env.DB, menu.negocio);
  menu.negocio = menu.contacto.nombre;
  return menu;
}

async function leerCatalogo(request, env, incluirArchivados) {
  const menu = await leerMenu(request, env);
  await aplicarCatalogo(env.DB, menu, incluirArchivados);
  return menu;
}

async function menuActualizado(request, env, incluirArchivados = false) {
  const [menu, disponibilidad, precios, descripciones, preferencias, entrega, programados] = await Promise.all([
    leerCatalogo(request, env, incluirArchivados),
    env.DB.prepare("SELECT producto_id, disponible FROM disponibilidad_producto").all(),
    env.DB.prepare("SELECT producto_id, precio_centavos, especial_centavos FROM precios_menu").all(),
    env.DB.prepare("SELECT producto_id, descripcion FROM descripciones_menu").all(),
    env.DB.prepare("SELECT categorias_json FROM preferencias_categorias WHERE id = 1").first(),
    incluirArchivados ? null : leerEntrega(env.DB),
    env.DB.prepare("SELECT producto_id, precio_centavos, especial_centavos, fecha_desde, fecha_hasta FROM precios_programados").all()
  ]);
  if (entrega) menu.entrega = entrega.modo === "colonias" ? entrega : { modo: "confirmar" };
  const estados = new Map(disponibilidad.results.map(fila => [fila.producto_id, fila.disponible === 1]));
  const preciosPorProducto = new Map([...precios.results, ...programados.results].map(fila => [fila.producto_id, fila]));
  const hoy = fechaNegocio(menu.horario?.zonaHoraria);
  const descripcionesPorProducto = new Map(
    descripciones.results.map(fila => [fila.producto_id, fila.descripcion])
  );
  const categoriasGuardadas = new Map(
    JSON.parse(preferencias?.categorias_json ?? "[]")
      .map(({ id, nombre }, orden) => [id, { nombre, orden }])
  );
  const ordenCategoria = id => categoriasGuardadas.get(id)?.orden ?? categoriasGuardadas.size;
  menu.categorias.sort((a, b) => ordenCategoria(a.id) - ordenCategoria(b.id));

  for (const categoria of menu.categorias) {
    categoria.nombre = categoriasGuardadas.get(categoria.id)?.nombre ?? categoria.nombre;
    for (const producto of categoria.productos) {
      if (estados.has(producto.id)) producto.disponible = estados.get(producto.id);
      if (descripcionesPorProducto.has(producto.id)) {
        producto.descripcion = descripcionesPorProducto.get(producto.id);
      }
      const precio = preciosPorProducto.get(producto.id);
      if (precio) {
        aplicarPrecio(producto, precio, hoy, incluirArchivados);
      }
    }
  }
  return menu;
}

function productoEnCatalogo(menu, id) {
  return menu.categorias.some(categoria => categoria.productos.some(producto => producto.id === id));
}

function firmar(clave, valor) {
  return crypto.subtle.sign("HMAC", clave, encoder.encode(valor));
}

function aHex(buffer) {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, "0")).join("");
}

function desdeHex(valor) {
  return Uint8Array.from(valor.match(/../g), byte => parseInt(byte, 16));
}

function cabeceraSesion(valor, segundos, cookie = cookieSesion) {
  return {
    "Set-Cookie": cookie + "=" + valor +
      "; Path=/; Max-Age=" + segundos + "; HttpOnly; Secure; SameSite=Strict"
  };
}

function valorFirmadoSesion(valor, cookie) {
  return cookie === cookieSesion ? valor : cookie + ":" + valor;
}

function claveSesion(material) {
  return crypto.subtle.importKey(
    "raw", typeof material === "string" ? encoder.encode(material) : material,
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

async function sesionValida(request, clave, nombre = cookieSesion) {
  const cookie = request.headers.get("Cookie")?.split(";")
    .map(parte => parte.trim())
    .find(parte => parte.startsWith(nombre + "="));
  const valor = cookie?.slice(nombre.length + 1) || "";
  const formato = /^(\d{10,12}\.[\da-f-]{36})\.([\da-f]{64})$/;
  const partes = valor.match(formato);
  if (!partes || Number(partes[1].split(".")[0]) <= Math.floor(Date.now() / 1000)) return false;
  const firma = desdeHex(partes[2]);
  return crypto.subtle.verify("HMAC", clave, firma, encoder.encode(valorFirmadoSesion(partes[1], nombre)));
}

function demasiadosIntentos(espera) {
  return json({
    error: "Demasiados intentos. Espera " + espera + " segundos y vuelve a intentar."
  }, 429, { "Retry-After": String(espera) });
}

async function iniciarSesion(request, db, clave, credencial, cookie = cookieSesion) {
  const datos = await request.json().catch(() => null);
  const ahora = Math.floor(Date.now() / 1000);
  const ip = request.headers.get("CF-Connecting-IP") || "sin-ip";
  const prefijo = cookie === cookieSesion ? "intentos:" : "intentos:cocina:";
  const origen = aHex(await firmar(clave, prefijo + ip));
  const previo = await db.prepare(
    "SELECT fallos, vence FROM intentos_acceso WHERE origen = ? AND vence > ?"
  ).bind(origen, ahora).first();

  if (previo?.fallos >= maximoFallos) {
    return demasiadosIntentos(previo.vence - ahora);
  }

  const firmaEsperada = typeof credencial === "string"
    ? await firmar(clave, "acceso:" + credencial)
    : credencial;
  const correcto = typeof datos?.clave === "string" && datos.clave.length <= 256 &&
    await crypto.subtle.verify("HMAC", clave, firmaEsperada, encoder.encode("acceso:" + datos.clave));

  if (!correcto) {
    const nuevo = await db.prepare(
      "INSERT INTO intentos_acceso (origen, fallos, vence) VALUES (?, 1, ?) " +
      "ON CONFLICT (origen) DO UPDATE SET " +
      "fallos = CASE WHEN vence <= ? THEN 1 ELSE fallos + 1 END, " +
      "vence = CASE WHEN vence <= ? THEN excluded.vence ELSE vence END " +
      "WHERE vence <= ? OR fallos < ? RETURNING fallos, vence"
    ).bind(origen, ahora + ventanaFallos, ahora, ahora, ahora, maximoFallos).first();

    await db.prepare("DELETE FROM intentos_acceso WHERE vence <= ?").bind(ahora).run();
    if (!nuevo || nuevo.fallos >= maximoFallos) {
      return demasiadosIntentos(nuevo ? nuevo.vence - ahora : ventanaFallos);
    }
    return json({ error: "Contraseña incorrecta." }, 401);
  }

  await db.prepare("DELETE FROM intentos_acceso WHERE origen = ?").bind(origen).run();
  const duracion = cookie === cookieSesion && datos.recordar === true ? sesionRecordada : sesionNormal;
  const valor = (ahora + duracion) + "." + crypto.randomUUID();
  const firma = aHex(await firmar(clave, valorFirmadoSesion(valor, cookie)));
  return json({ ok: true }, 200, cabeceraSesion(valor + "." + firma, duracion, cookie));
}

async function claveCocinaGuardada(claveAdmin, sal) {
  return claveSesion(await firmar(claveAdmin, "clave-cocina:" + sal));
}

async function generarClaveCocina(db, claveAdmin, contrasenaAdmin) {
  const alfabeto = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const aleatorio = new Uint8Array(16);
  let contrasena;
  do {
    contrasena = Array.from(crypto.getRandomValues(aleatorio), byte => alfabeto[byte & 31]).join("");
  } while (contrasena === contrasenaAdmin);
  const sal = crypto.randomUUID();
  const clave = await claveCocinaGuardada(claveAdmin, sal);
  const verificador = aHex(await firmar(clave, "acceso:" + contrasena));
  await db.prepare(
    "INSERT INTO clave_cocina (id, sal, verificador) VALUES (1, ?, ?) " +
    "ON CONFLICT (id) DO UPDATE SET sal = excluded.sal, verificador = excluded.verificador"
  ).bind(sal, verificador).run();
  return json({ contrasena });
}

async function atenderCocina(request, env, url) {
  if (request.method !== "GET" && request.headers.get("Origin") !== url.origin) {
    return json({ error: "Solicitud de origen no permitido." }, 403);
  }
  if (url.pathname === "/api/cocina/salir" && request.method === "POST") {
    return json({ ok: true }, 200, cabeceraSesion("", 0, cookieCocina));
  }
  const guardada = await env.DB.prepare("SELECT sal, verificador FROM clave_cocina WHERE id = 1").first();
  let clave;
  let credencial;
  if (guardada && env.ADMIN_PASSWORD?.length >= 16) {
    clave = await claveCocinaGuardada(await claveSesion(env.ADMIN_PASSWORD), guardada.sal);
    credencial = desdeHex(guardada.verificador);
  } else if (!guardada && env.COCINA_PASSWORD?.length >= 16 && env.COCINA_PASSWORD !== env.ADMIN_PASSWORD) {
    clave = await claveSesion(env.COCINA_PASSWORD);
    credencial = env.COCINA_PASSWORD;
  } else {
    return json({ error: "Genera la contraseña de cocina desde el panel del encargado." }, 503);
  }
  if (url.pathname === "/api/cocina/entrar" && request.method === "POST") {
    return iniciarSesion(request, env.DB, clave, credencial, cookieCocina);
  }
  if (!await sesionValida(request, clave, cookieCocina)) {
    return json({ error: "Inicia sesión para ver los pedidos de cocina." }, 401);
  }
  if (url.pathname === "/api/cocina/pedidos") {
    return administrarPedidos(request, env.DB, url, json, true);
  }
  return json({ error: "Ruta no disponible." }, 404);
}

const diasSemana = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const formatoHora = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function validarTurnos(turnos) {
  if (!Array.isArray(turnos) || turnos.length > 32) return null;
  const validados = [];

  for (const turno of turnos) {
    const { dias, abre, cierra } = turno ?? {};
    if (!Array.isArray(dias) || !dias.length || new Set(dias).size !== dias.length ||
        dias.some(dia => !diasSemana.includes(dia)) ||
        typeof abre !== "string" || !formatoHora.test(abre) ||
        typeof cierra !== "string" || (!formatoHora.test(cierra) && cierra !== "24:00") ||
        abre >= cierra) {
      return null;
    }

    if (validados.some(anterior =>
      dias.some(dia => anterior.dias.includes(dia)) && abre < anterior.cierra && cierra > anterior.abre
    )) {
      return null;
    }
    validados.push({ dias: diasSemana.filter(dia => dias.includes(dia)), abre, cierra });
  }
  return validados;
}

async function administrar(request, env, url) {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16) {
    return json({ error: "El acceso del encargado todavía no está configurado." }, 503);
  }

  if (request.method !== "GET" && request.headers.get("Origin") !== url.origin) {
    return json({ error: "Solicitud de origen no permitido." }, 403);
  }

  const clave = await claveSesion(env.ADMIN_PASSWORD);

  if (url.pathname === "/api/admin/entrar" && request.method === "POST") {
    return iniciarSesion(request, env.DB, clave, env.ADMIN_PASSWORD);
  }

  if (url.pathname === "/api/admin/salir" && request.method === "POST") {
    return json({ ok: true }, 200, cabeceraSesion("", 0));
  }

  if (!await sesionValida(request, clave)) {
    return json({ error: "Inicia sesión para administrar el menú." }, 401);
  }

  if (url.pathname === "/api/admin/horario" && request.method === "GET") {
    const menu = await leerMenu(request, env);
    return json({ turnos: menu.horario?.turnos ?? [] });
  }

  if (url.pathname === "/api/admin/horario" && request.method === "PUT") {
    const datos = await request.json().catch(() => null);
    const turnos = validarTurnos(datos?.turnos);
    if (!turnos) {
      return json({ error: "Revisa los días y las horas. Los turnos deben terminar después de abrir y no pueden traslaparse." }, 400);
    }

    await env.DB.prepare(
      "INSERT INTO preferencias_horario (id, turnos_json) VALUES (1, ?) " +
      "ON CONFLICT (id) DO UPDATE SET turnos_json = excluded.turnos_json"
    ).bind(JSON.stringify(turnos)).run();
    return json({ turnos });
  }

  if (url.pathname === "/api/admin/estadisticas" && request.method === "GET") {
    return consultarEstadisticas(env.DB, url, await leerMenu(request, env), json);
  }

  if (url.pathname === "/api/admin/pedidos") {
    return administrarPedidos(request, env.DB, url, json);
  }

  if (url.pathname === "/api/admin/pedidos/cobro") {
    return administrarCobro(request, env.DB, json);
  }

  if (url.pathname === "/api/admin/cocina/clave" && request.method === "POST") {
    return generarClaveCocina(env.DB, clave, env.ADMIN_PASSWORD);
  }

  if (url.pathname === "/api/admin/entrega") {
    return administrarEntrega(request, env.DB, json);
  }

  if (url.pathname === "/api/admin/negocio") {
    if (request.method === "GET") return json((await leerMenu(request, env)).contacto);
    if (request.method === "PUT") return guardarDatosNegocio(request, env.DB, json);
    return json({error:"Método no permitido."}, 405);
  }

  if (url.pathname === "/api/admin/agenda") {
    return administrarAgenda(request, env.DB, url, () => leerMenu(request, env), json);
  }

  if (url.pathname === "/api/admin/productos") {
    const menu = await leerCatalogo(request, env, true);
    return guardarProducto(request, env.DB, menu, json);
  }

  if (url.pathname === "/api/admin/disponibilidad" && request.method === "GET") {
    const menu = await menuActualizado(request, env, true);
    return json(menu.categorias.map(categoria => ({
      id: categoria.id,
      nombre: categoria.nombre,
      productos: categoria.productos.map(producto => ({
        ...producto, disponible: producto.disponible !== false, moneda: menu.moneda,
        zonaHoraria: menu.horario?.zonaHoraria || "America/Mazatlan"
      }))
    })));
  }

  if (url.pathname === "/api/admin/categorias" && request.method === "PUT") {
    const datos = await request.json().catch(() => null);
    if (!Array.isArray(datos?.categorias)) {
      return json({ error: "Indica los nombres y el orden de las categorías." }, 400);
    }

    const menu = await leerMenu(request, env);
    const ids = new Set(menu.categorias.map(categoria => categoria.id));
    if (datos.categorias.length !== ids.size) {
      return json({ error: "El catálogo cambió. Recarga el panel e inténtalo de nuevo." }, 409);
    }

    const categorias = [];
    for (const categoria of datos.categorias) {
      if (!ids.delete(categoria?.id)) {
        return json({ error: "El orden debe incluir cada categoría del catálogo una sola vez." }, 400);
      }
      const nombre = typeof categoria.nombre === "string" ? categoria.nombre.trim() : "";
      if (!nombre || nombre.length > 60) {
        return json({ error: "Cada categoría debe tener un nombre de 1 a 60 caracteres." }, 400);
      }
      categorias.push({ id: categoria.id, nombre });
    }

    await env.DB.prepare(
      "INSERT INTO preferencias_categorias (id, categorias_json) VALUES (1, ?) " +
      "ON CONFLICT (id) DO UPDATE SET categorias_json = excluded.categorias_json"
    ).bind(JSON.stringify(categorias)).run();
    return json({ categorias });
  }

  if (url.pathname === "/api/admin/descripciones" && request.method === "PUT") {
    const datos = await request.json().catch(() => null);
    const descripcion = typeof datos?.descripcion === "string" ? datos.descripcion.trim() : "";
    if (typeof datos?.id !== "string" || !descripcion || descripcion.length > 240) {
      return json({ error: "Escribe una descripción de 1 a 240 caracteres." }, 400);
    }

    const menu = await leerCatalogo(request, env, true);
    if (!productoEnCatalogo(menu, datos.id)) {
      return json({ error: "El producto ya no está en el catálogo." }, 404);
    }

    await env.DB.prepare(
      "INSERT INTO descripciones_menu (producto_id, descripcion) VALUES (?, ?) " +
      "ON CONFLICT (producto_id) DO UPDATE SET descripcion = excluded.descripcion"
    ).bind(datos.id, descripcion).run();

    return json({ descripcion });
  }

  if (url.pathname === "/api/admin/precios" && request.method === "PUT") {
    const datos = await request.json().catch(() => null);
    const { id, precioCentavos, especialCentavos } = datos ?? {};

    if (typeof id !== "string" || !Number.isSafeInteger(precioCentavos) ||
        precioCentavos < 0 || precioCentavos > 100000000 ||
        (especialCentavos !== null && (!Number.isSafeInteger(especialCentavos) ||
          especialCentavos < 0 || especialCentavos >= precioCentavos))) {
      return json({ error: "El precio especial debe ser menor al regular y ambos deben ser importes válidos." }, 400);
    }

    const menu = await leerCatalogo(request, env, true);
    if (!productoEnCatalogo(menu, id)) {
      return json({ error: "El producto ya no está en el catálogo." }, 404);
    }

    let promocion;
    try {
      promocion = validarPromocion(datos.promocion, especialCentavos);
    } catch (error) {
      return json({error:error.message}, 400);
    }
    await env.DB.prepare(
      "INSERT INTO precios_programados (producto_id, precio_centavos, especial_centavos, fecha_desde, fecha_hasta) VALUES (?, ?, ?, ?, ?) " +
      "ON CONFLICT (producto_id) DO UPDATE SET precio_centavos = excluded.precio_centavos, " +
      "especial_centavos = excluded.especial_centavos, fecha_desde = excluded.fecha_desde, fecha_hasta = excluded.fecha_hasta"
    ).bind(id, precioCentavos, especialCentavos, promocion?.desde ?? null, promocion?.hasta ?? null).run();

    const hoy = fechaNegocio(menu.horario?.zonaHoraria);
    return json({
      precio: precioCentavos / 100, precioEspecial: especialCentavos === null ? null : especialCentavos / 100,
      promocion: promocion ? {
        ...promocion,
        estado: hoy < promocion.desde ? "programada" : hoy > promocion.hasta ? "finalizada" : "activa"
      } : null
    });
  }

  if (url.pathname === "/api/admin/disponibilidad" && request.method === "PUT") {
    const datos = await request.json().catch(() => null);
    if (typeof datos?.id !== "string" || typeof datos.disponible !== "boolean") {
      return json({ error: "Indica un producto y su disponibilidad." }, 400);
    }
    const menu = await leerCatalogo(request, env, true);
    if (!productoEnCatalogo(menu, datos.id)) {
      return json({ error: "El producto ya no está en el catálogo." }, 404);
    }
    await env.DB.prepare(
      "INSERT INTO disponibilidad_producto (producto_id, disponible) VALUES (?, ?) " +
      "ON CONFLICT (producto_id) DO UPDATE SET disponible = excluded.disponible"
    ).bind(datos.id, Number(datos.disponible)).run();
    return json({ disponible: datos.disponible });
  }

  return json({ error: "Ruta no disponible." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/menu.json" && request.method === "GET") {
        return json(await menuActualizado(request, env));
      }
      if (url.pathname === "/api/negocio" && request.method === "GET") {
        return json((await leerMenu(request, env)).contacto);
      }
      if (url.pathname.startsWith("/api/catalogo/foto/")) {
        return await servirFoto(request, env.DB, url);
      }
      if (url.pathname === "/api/reservaciones/disponibilidad" && request.method === "GET") {
        return await consultarDisponibilidad(env.DB, await leerMenu(request, env), url, json);
      }
      if (["/api/pedidos", "/api/pedidos/seguimiento", "/api/pedidos/revisar"].includes(url.pathname)) {
        return await pedidosPublicos(request, env, url, () => menuActualizado(request, env), json);
      }
      if (url.pathname.startsWith("/api/admin/")) {
        return await administrar(request, env, url);
      }
      if (url.pathname.startsWith("/api/cocina/")) {
        return await atenderCocina(request, env, url);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: "El servicio no pudo completar la solicitud. Intenta nuevamente." }, 503);
    }
  }
};
