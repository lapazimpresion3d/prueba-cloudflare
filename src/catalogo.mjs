const idNuevo = /^prod-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/;
const idOpcion = /^[\p{L}\p{N}_-]{1,80}$/u;
const maxImporte = 1000000;

export async function aplicarCatalogo(db, menu, incluirArchivados) {
  const { results } = await db.prepare(
    "SELECT producto_id, categoria_id, datos_json, archivado, version FROM catalogo_productos ORDER BY rowid"
  ).all();
  const categorias = new Map(menu.categorias.map(categoria => [categoria.id, categoria]));
  const guardados = new Map(results.map(fila => [fila.producto_id, fila]));

  for (const categoria of categorias.values()) {
    categoria.productos = categoria.productos.flatMap(producto => {
      const fila = guardados.get(producto.id);
      if (!fila) return [producto];
      guardados.delete(producto.id);
      if (fila.archivado && !incluirArchivados) return [];
      return [aplicarFila(producto, fila, incluirArchivados)];
    });
  }
  for (const fila of guardados.values()) {
    const categoria = categorias.get(fila.categoria_id);
    if (categoria && (incluirArchivados || !fila.archivado)) {
      categoria.productos.push(aplicarFila({ id: fila.producto_id }, fila, incluirArchivados));
    }
  }
}

function aplicarFila(producto, fila, incluirArchivados) {
  const datos = JSON.parse(fila.datos_json);
  const actualizado = { ...producto, ...datos };
  if (incluirArchivados) {
    actualizado.archivado = Boolean(fila.archivado);
    actualizado.version = fila.version;
  }
  return actualizado;
}

function texto(valor, maximo) {
  if (typeof valor !== "string" || valor.length > maximo) throw new Error("Revisa la longitud de los campos.");
  return valor.trim();
}

function importe(valor) {
  const centavos = Math.round(valor * 100);
  if (typeof valor !== "number" || !Number.isFinite(valor) ||
      valor < 0 || valor > maxImporte || Math.abs(valor * 100 - centavos) > 1e-7) {
    throw new Error("Usa importes entre 0 y 1,000,000 con hasta dos decimales.");
  }
  return centavos / 100;
}

function foto(valor) {
  const imagen = texto(valor, 500);
  if (!imagen || /^\/?imagenes\/[a-z0-9_-]+\.(?:webp|png|jpe?g|avif)$/i.test(imagen)) return imagen;
  let url;
  try {
    url = new URL(imagen);
  } catch {
    throw new Error("Usa una ruta de imagen del sitio o un enlace HTTPS.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.href.length > 500) {
    throw new Error("Usa una ruta de imagen del sitio o un enlace HTTPS.");
  }
  return url.href;
}

function opciones(lista, validar, tipo) {
  if (!Array.isArray(lista) || lista.length > 30) throw new Error("Puedes guardar hasta 30 opciones por grupo.");
  const ids = new Set();
  const nombres = new Set();
  return lista.map(opcion => {
    const id = opcion?.id;
    const nombre = texto(opcion?.nombre, 80);
    const clave = nombre.normalize("NFC").toLowerCase();
    if (typeof id !== "string" || !idOpcion.test(id) || !nombre || ids.has(id) || nombres.has(clave)) {
      throw new Error("Escribe nombres distintos para las opciones de " + tipo + ".");
    }
    ids.add(id);
    nombres.add(clave);
    return { id, nombre, ...validar(opcion) };
  });
}

function validarProducto(datos, ids, id) {
  const nombre = texto(datos.nombre, 80);
  if (!nombre) throw new Error("Escribe el nombre del producto.");
  const ingredientes = opciones(datos.ingredientes, opcion => ({
    incluido: opcion.incluido === true || opcion.obligatorio === true,
    obligatorio: opcion.obligatorio === true
  }), "ingredientes");
  const extras = opciones(datos.extras, opcion => ({ precio: importe(opcion.precio) }), "extras");
  const variantes = opciones(datos.variantes, opcion => {
    const productoId = opcion.productoId;
    if (productoId && (productoId === id || !ids.has(productoId))) {
      throw new Error("La variante debe vincularse a otro producto existente.");
    }
    return {
      recargo: importe(opcion.recargo),
      ...(productoId ? { productoId } : {})
    };
  }, "variantes");
  if (!Array.isArray(datos.incluye) || datos.incluye.length > 12) {
    throw new Error("Puedes indicar hasta 12 elementos incluidos.");
  }
  const incluye = datos.incluye.map(item => texto(item, 80)).filter(Boolean);
  const maxExtras = datos.maxExtras;
  if (maxExtras !== null && (!Number.isInteger(maxExtras) || maxExtras < 0 || maxExtras > 30)) {
    throw new Error("Indica un máximo de extras entre 0 y 30 o deja el campo vacío.");
  }
  return {
    nombre, imagen: foto(datos.imagen), ingredientes, extras, variantes, incluye,
    etiquetaVariante: texto(datos.etiquetaVariante, 50) || "Tamaño",
    maxExtras
  };
}

export async function guardarProducto(request, db, menu, json) {
  if (!["POST", "PUT"].includes(request.method)) return json({ error: "Método no permitido." }, 405);
  const datos = await request.json().catch(() => null);
  const creando = request.method === "POST";
  if (typeof datos?.id !== "string" || typeof datos.archivado !== "boolean" ||
      !Number.isSafeInteger(datos.version) || datos.version < 0) {
    return json({ error: "El producto o su versión no son válidos." }, 400);
  }

  const { id } = datos;
  const ubicacion = menu.categorias.find(categoria => categoria.productos.some(producto => producto.id === id));
  const producto = ubicacion?.productos.find(item => item.id === id);
  const categoria = creando ? menu.categorias.find(item => item.id === datos.categoriaId) : ubicacion;
  if (!categoria || (creando && (!idNuevo.test(id) || datos.version !== 0 || datos.archivado))) {
    return json({ error: "Selecciona una categoría válida y revisa los datos del producto." }, 400);
  }
  const ids = new Set(menu.categorias.flatMap(item => item.productos.map(opcion => opcion.id)));
  let cambios;
  try {
    cambios = validarProducto(datos, ids, id);
    if (creando) {
      cambios.descripcion = texto(datos.descripcion, 240);
      if (!cambios.descripcion) throw new Error("Escribe la descripción del producto.");
      cambios.precio = importe(datos.precio);
    }
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const contenido = JSON.stringify(cambios);
  if (creando && producto) {
    const existente = await db.prepare(
      "SELECT categoria_id, datos_json, archivado, version FROM catalogo_productos WHERE producto_id = ?"
    ).bind(id).first();
    if (existente?.categoria_id === categoria.id && existente.datos_json === contenido && !existente.archivado) {
      return json({ id, version: existente.version });
    }
    return json({ error: "Ese producto ya se registró. Actualiza el panel." }, 409);
  }

  if (!creando && datos.version !== (producto.version ?? 0)) {
    return json({ error: "El producto cambió en otra sesión. Recarga el panel antes de editarlo." }, 409);
  }

  const archivado = Number(datos.archivado);
  let fila;
  if (datos.version === 0) {
    fila = await db.prepare(
      "INSERT INTO catalogo_productos (producto_id, categoria_id, datos_json, archivado) VALUES (?, ?, ?, ?) " +
      "ON CONFLICT (producto_id) DO NOTHING RETURNING version"
    ).bind(id, categoria.id, contenido, archivado).first();
  } else {
    // Los nuevos productos guardan su precio y descripción originales en este registro.
    const anterior = await db.prepare("SELECT datos_json FROM catalogo_productos WHERE producto_id = ?")
      .bind(id).first();
    const datosAnteriores = JSON.parse(anterior?.datos_json ?? "{}");
    fila = await db.prepare(
      "UPDATE catalogo_productos SET datos_json = ?, archivado = ?, version = version + 1 " +
      "WHERE producto_id = ? AND version = ? RETURNING version"
    ).bind(JSON.stringify({ ...datosAnteriores, ...cambios }), archivado, id, datos.version).first();
  }

  if (!fila) return json({ error: "El producto cambió en otra sesión. Recarga el panel." }, 409);
  return json({ id, version: fila.version }, creando ? 201 : 200);
}
