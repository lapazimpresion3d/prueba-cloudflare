const encoder = new TextEncoder();
const cookieSesion = "__Host-comal-admin";
const duracionSesion = 8 * 60 * 60;

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

async function menuConDisponibilidad(request, env) {
  const [menu, consulta] = await Promise.all([
    leerMenu(request, env),
    env.DB.prepare("SELECT producto_id, disponible FROM disponibilidad_producto").all()
  ]);
  const estados = new Map(consulta.results.map(fila => [fila.producto_id, fila.disponible === 1]));
  for (const categoria of menu.categorias) {
    for (const producto of categoria.productos) {
      if (estados.has(producto.id)) producto.disponible = estados.get(producto.id);
    }
  }
  return menu;
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

async function administrar(request, env, url) {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 24) {
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
    const datos = await request.json().catch(() => null);
    if (typeof datos?.clave !== "string" || datos.clave.length > 256) {
      return json({ error: "Contraseña incorrecta." }, 401);
    }

    const intento = await firmar(clave, "acceso:" + env.ADMIN_PASSWORD);
    const correcto = await crypto.subtle.verify("HMAC", clave, intento, encoder.encode("acceso:" + datos.clave));
    if (!correcto) return json({ error: "Contraseña incorrecta." }, 401);

    const expira = Math.floor(Date.now() / 1000) + duracionSesion;
    const valor = expira + "." + crypto.randomUUID();
    const firma = aHex(await firmar(clave, valor));
    return json({ ok: true }, 200, cabeceraSesion(valor + "." + firma, duracionSesion));
  }

  if (url.pathname === "/api/admin/salir" && request.method === "POST") {
    return json({ ok: true }, 200, cabeceraSesion("", 0));
  }

  if (!await sesionValida(request, clave)) {
    return json({ error: "Inicia sesión para administrar el menú." }, 401);
  }

  if (url.pathname === "/api/admin/disponibilidad" && request.method === "GET") {
    const menu = await menuConDisponibilidad(request, env);
    return json(menu.categorias.map(categoria => ({
      nombre: categoria.nombre,
      productos: categoria.productos.map(({ id, nombre, disponible }) => ({
        id, nombre, disponible: disponible !== false
      }))
    })));
  }

  if (url.pathname === "/api/admin/disponibilidad" && request.method === "PUT") {
    const datos = await request.json().catch(() => null);
    if (typeof datos?.id !== "string" || typeof datos.disponible !== "boolean") {
      return json({ error: "Indica un producto y su disponibilidad." }, 400);
    }
    const menu = await leerMenu(request, env);
    if (!menu.categorias.some(categoria => categoria.productos.some(producto => producto.id === datos.id))) {
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
        return json(await menuConDisponibilidad(request, env));
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
