const reglasIniciales = { modo: "confirmar", minimoCentavos: 0, colonias: [] };
const maximoCentavos = 100000000;

export async function leerEntrega(db) {
  const fila = await db.prepare("SELECT reglas_json FROM preferencias_entrega WHERE id = 1").first();
  return fila ? JSON.parse(fila.reglas_json) : reglasIniciales;
}

function importeValido(valor) {
  return Number.isSafeInteger(valor) && valor >= 0 && valor <= maximoCentavos;
}

function validarEntrega(datos) {
  if (!["confirmar", "colonias"].includes(datos?.modo) || !importeValido(datos.minimoCentavos) ||
      !Array.isArray(datos.colonias) || datos.colonias.length > 100) {
    throw new Error("Revisa el modo, el pedido mínimo y la lista de colonias. El máximo es de 100 colonias.");
  }
  if (datos.modo === "colonias" && !datos.colonias.length) {
    throw new Error("Agrega al menos una colonia para cobrar por zona.");
  }
  const ids = new Set();
  const colonias = datos.colonias.map(colonia => {
    const nombre = typeof colonia?.nombre === "string" ? colonia.nombre.trim().replace(/\s+/gu, " ") : "";
    const id = nombre.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
    if (!id || nombre.length > 80 || ids.has(id) || !importeValido(colonia?.envioCentavos)) {
      throw new Error("Indica nombres distintos para las colonias y un costo válido para cada una.");
    }
    ids.add(id);
    return { id, nombre, envioCentavos: colonia.envioCentavos };
  });
  return { modo: datos.modo, minimoCentavos: datos.minimoCentavos, colonias };
}

export async function administrarEntrega(request, db, json) {
  if (request.method === "GET") return json(await leerEntrega(db));
  if (request.method !== "PUT") return json({ error: "Método no permitido." }, 405);
  const datos = await request.json().catch(() => null);
  let reglas;
  try {
    reglas = validarEntrega(datos);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
  await db.prepare(
    "INSERT INTO preferencias_entrega (id, reglas_json) VALUES (1, ?) " +
    "ON CONFLICT (id) DO UPDATE SET reglas_json = excluded.reglas_json"
  ).bind(JSON.stringify(reglas)).run();
  return json(reglas);
}

export function cotizarEntrega(reglas, cotizacion, subtotalCentavos) {
  if (reglas?.modo !== "colonias") {
    return cotizacion == null ? {} : { error: "Cambió la forma de confirmar el envío. Vuelve al carrito y revisa el pedido." };
  }
  const colonia = reglas.colonias.find(item => item.id === cotizacion?.coloniaId);
  if (!colonia) return { error: "Esa colonia no está disponible para entrega. Elige otra colonia o recoge en el establecimiento." };
  if (subtotalCentavos < reglas.minimoCentavos) {
    return { error: "El pedido no alcanza el mínimo vigente para entrega. Vuelve al carrito para revisarlo." };
  }
  if (colonia.envioCentavos !== cotizacion.envioCentavos) {
    return { error: "Cambió el costo de envío. Vuelve al carrito para revisar el total." };
  }
  return { entrega: { colonia: colonia.nombre, envioCentavos: colonia.envioCentavos } };
}
