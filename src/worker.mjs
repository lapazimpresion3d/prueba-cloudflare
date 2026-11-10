import { administrarAgenda, consultarDisponibilidad } from "./reservaciones.mjs";

const encoder = new TextEncoder();
const cookieSesion = "__Host-comal-admin";
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
  const archivo = await env.ASSETS.fetch(new Request(url));
  if (!archivo.ok) throw new Error("No se pudo cargar menu.json");
  return archivo.json();
}

async function menuActualizado(request, env) {
  const [menu, disponibilidad, precios, descripciones] = await Promise.all([
    leerMenu(request, env),
    env.DB.prepare("SELECT producto_id, disponible FROM disponibilidad_producto").all(),
    env.DB.prepare("SELECT producto_id, precio_centavos, especial_centavos FROM precios_menu").all(),
    env.DB.prepare("SELECT producto_id, descripcion FROM descripciones_menu").all()
  ]);
  const estados = new Map(disponibilidad.results.map(fila => [fila.producto_id, fila.disponible === 1]));
  const preciosPorProducto = new Map(precios.results.map(fila => [fila.producto_id, fila]));
  const descripcionesPorProducto = new Map(
    descripciones.results.map(fila => [fila.producto_id, fila.descripcion])
  );
  for (const categoria of menu.categorias) {
    for (const producto of categoria.productos) {
      if (estados.has(producto.id)) producto.disponible = estados.get(producto.id);
      if (descripcionesPorProducto.has(producto.id)) {
        producto.descripcion = descripcionesPorProducto.get(producto.id);
      }
      const precio = preciosPorProducto.get(producto.id);
      if (precio) {
        producto.precio = precio.precio_centavos / 100;
        if (precio.especial_centavos === null) {
          delete producto.precioEspecial;
        } else {
          producto.precioEspecial = precio.especial_centavos / 100;
        }
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

function cabeceraSesion(valor, segundos) {
  return {
    "Set-Cookie": cookieSesion + "=" + valor +
      "; Path=/; Max-Age=" + segundos + "; HttpOnly; Secure; SameSite=Strict"
  };
}

async function sesionValida(request, clave) {
  const cookie = request.headers.get("Cookie")?.split(";")
    .map(parte => parte.trim())
    .find(parte => parte.startsWith(cookieSesion + "="));
  const valor = cookie?.slice(cookieSesion.length + 1) || "";
  const formato = /^(\d{10,12}\.[\da-f-]{36})\.([\da-f]{64})$/;
  const partes = valor.match(formato);
  if (!partes || Number(partes[1].split(".")[0]) <= Math.floor(Date.now() / 1000)) return false;
  const firma = Uint8Array.from(partes[2].match(/../g), byte => parseInt(byte, 16));
  return crypto.subtle.verify("HMAC", clave, firma, encoder.encode(partes[1]));
}

function demasiadosIntentos(espera) {
  return json({
    error: "Demasiados intentos. Espera " + espera + " segundos y vuelve a intentar."
  }, 429, { "Retry-After": String(espera) });
}

async function iniciarSesion(request, db, clave, contrasena) {
  const datos = await request.json().catch(() => null);
  const ahora = Math.floor(Date.now() / 1000);
  const ip = request.headers.get("CF-Connecting-IP") || "sin-ip";
  const origen = aHex(await firmar(clave, "intentos:" + ip));
  const previo = await db.prepare(
    "SELECT fallos, vence FROM intentos_acceso WHERE origen = ? AND vence > ?"
  ).bind(origen, ahora).first();

  if (previo?.fallos >= maximoFallos) {
    return demasiadosIntentos(previo.vence - ahora);
  }

  const firmaEsperada = await firmar(clave, "acceso:" + contrasena);
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
  const duracion = datos.recordar === true ? sesionRecordada : sesionNormal;
  const valor = (ahora + duracion) + "." + crypto.randomUUID();
  const firma = aHex(await firmar(clave, valor));
  return json({ ok: true }, 200, cabeceraSesion(valor + "." + firma, duracion));
}

async function administrar(request, env, url) {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16) {
    return json({ error: "El acceso del encargado todavía no está configurado." }, 503);
  }

  if (request.method !== "GET" && request.headers.get("Origin") !== url.origin) {
    return json({ error: "Solicitud de origen no permitido." }, 403);
  }

  const clave = await crypto.subtle.importKey(
    "raw", encoder.encode(env.ADMIN_PASSWORD),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );

  if (url.pathname === "/api/admin/entrar" && request.method === "POST") {
    return iniciarSesion(request, env.DB, clave, env.ADMIN_PASSWORD);
  }

  if (url.pathname === "/api/admin/salir" && request.method === "POST") {
    return json({ ok: true }, 200, cabeceraSesion("", 0));
  }

  if (!await sesionValida(request, clave)) {
    return json({ error: "Inicia sesión para administrar el menú." }, 401);
  }

  if (url.pathname === "/api/admin/agenda") {
    return administrarAgenda(request, env.DB, url, () => leerMenu(request, env), json);
  }

  if (url.pathname === "/api/admin/disponibilidad" && request.method === "GET") {
    const menu = await menuActualizado(request, env);
    return json(menu.categorias.map(categoria => ({
      nombre: categoria.nombre,
      productos: categoria.productos.map(({ id, nombre, descripcion, disponible, precio, precioEspecial }) => ({
        id, nombre, descripcion, disponible: disponible !== false, precio, precioEspecial, moneda: menu.moneda
      }))
    })));
  }

  if (url.pathname === "/api/admin/descripciones" && request.method === "PUT") {
    const datos = await request.json().catch(() => null);
    const descripcion = typeof datos?.descripcion === "string" ? datos.descripcion.trim() : "";
    if (typeof datos?.id !== "string" || !descripcion || descripcion.length > 240) {
      return json({ error: "Escribe una descripción de 1 a 240 caracteres." }, 400);
    }

    const menu = await leerMenu(request, env);
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

    const menu = await leerMenu(request, env);
    if (!productoEnCatalogo(menu, id)) {
      return json({ error: "El producto ya no está en el catálogo." }, 404);
    }

    await env.DB.prepare(
      "INSERT INTO precios_menu (producto_id, precio_centavos, especial_centavos) VALUES (?, ?, ?) " +
      "ON CONFLICT (producto_id) DO UPDATE SET precio_centavos = excluded.precio_centavos, " +
      "especial_centavos = excluded.especial_centavos"
    ).bind(id, precioCentavos, especialCentavos).run();

    return json({ precio: precioCentavos / 100, precioEspecial: especialCentavos === null ? null : especialCentavos / 100 });
  }

  if (url.pathname === "/api/admin/disponibilidad" && request.method === "PUT") {
    const datos = await request.json().catch(() => null);
    if (typeof datos?.id !== "string" || typeof datos.disponible !== "boolean") {
      return json({ error: "Indica un producto y su disponibilidad." }, 400);
    }
    const menu = await leerMenu(request, env);
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
      if (url.pathname === "/api/reservaciones/disponibilidad" && request.method === "GET") {
        return await consultarDisponibilidad(env.DB, await leerMenu(request, env), url, json);
      }
      if (url.pathname.startsWith("/api/admin/")) {
        return await administrar(request, env, url);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: "El servicio no pudo completar la solicitud. Intenta nuevamente." }, 503);
    }
  }
};
