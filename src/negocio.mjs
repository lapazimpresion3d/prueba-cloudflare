export async function leerDatosNegocio(db, nombre) {
  const fila = await db.prepare("SELECT datos_json FROM preferencias_negocio WHERE id = 1").first();
  return fila ? JSON.parse(fila.datos_json) : {
    nombre: nombre || "Taquería El Comal",
    lema: "SABOR DE MÉXICO",
    presentacion: "Tacos preparados al momento",
    whatsapp: "526121992396",
    direccion: ""
  };
}

function campoTexto(datos, campo, maximo) {
  if (typeof datos?.[campo] !== "string" || datos[campo].length > maximo) {
    throw new Error("Revisa los campos de los datos del negocio.");
  }
  return datos[campo].trim();
}

export async function guardarDatosNegocio(request, db, json) {
  const datos = await request.json().catch(() => null);
  let negocio;
  try {
    const nombre = campoTexto(datos, "nombre", 80);
    const telefono = campoTexto(datos, "whatsapp", 30);
    const whatsapp = telefono.replace(/[\s()-]/g, "").replace(/^\+/, "");
    if (!nombre) throw new Error("Escribe el nombre del negocio.");
    if (!/^\+?[\d\s()-]+$/.test(telefono) || !/^[1-9]\d{9,14}$/.test(whatsapp)) {
      throw new Error("Escribe un WhatsApp con código de país y entre 10 y 15 dígitos. Para México comienza con 52.");
    }
    negocio = {
      nombre, whatsapp,
      lema: campoTexto(datos, "lema", 60),
      presentacion: campoTexto(datos, "presentacion", 160),
      direccion: campoTexto(datos, "direccion", 240)
    };
  } catch (error) {
    return json({error:error.message}, 400);
  }
  await db.prepare(
    "INSERT INTO preferencias_negocio (id, datos_json) VALUES (1, ?) " +
    "ON CONFLICT (id) DO UPDATE SET datos_json = excluded.datos_json"
  ).bind(JSON.stringify(negocio)).run();
  return json(negocio);
}
