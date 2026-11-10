const acceso = document.getElementById("acceso");
const panel = document.getElementById("panel");
const productos = document.getElementById("productos");
const altaProducto = document.getElementById("alta-producto");
const estadoCatalogo = document.getElementById("catalogo-estado");
const mensaje = document.getElementById("mensaje");
const clave = document.getElementById("clave");
const salir = document.getElementById("salir");
const editorCategorias = document.getElementById("editor-categorias");
const formularioCategorias = document.getElementById("formulario-categorias");
const listaCategorias = document.getElementById("lista-categorias");
const estadoCategorias = document.getElementById("categorias-estado");
const seccionesCategorias = new Map();
let filasCategorias = [];
const editorHorario = document.getElementById("editor-horario");
const formularioHorario = document.getElementById("formulario-horario");
const listaTurnos = document.getElementById("lista-turnos");
const agregarTurno = document.getElementById("agregar-turno");
const guardarHorario = document.getElementById("guardar-horario");
const estadoHorario = document.getElementById("horario-estado");
const editorEntrega = document.getElementById("editor-entrega");
const formularioEntrega = document.getElementById("formulario-entrega");
const camposEntrega = document.getElementById("campos-entrega");
const modoEntrega = document.getElementById("modo-entrega");
const minimoEntrega = document.getElementById("minimo-entrega");
const coloniasEntrega = document.getElementById("colonias-entrega");
const agregarColonia = document.getElementById("agregar-colonia");
const estadoEntrega = document.getElementById("editor-entrega-estado");
let versionEntrega = 0;
const diasHorario = [
  ["Mon", "Lunes"], ["Tue", "Martes"], ["Wed", "Miércoles"], ["Thu", "Jueves"],
  ["Fri", "Viernes"], ["Sat", "Sábado"], ["Sun", "Domingo"]
];
let versionHorario = 0;
const agenda = document.getElementById("agenda");
const formularioAgenda = document.getElementById("formulario-agenda");
const fechaAgenda = document.getElementById("agenda-fecha");
const horaAgenda = document.getElementById("agenda-hora");
const personasAgenda = document.getElementById("agenda-personas");
const estadoAgenda = document.getElementById("agenda-estado");
const mesasAgenda = document.getElementById("agenda-mesas");
let solicitudAgenda = null;
let versionAgenda = 0;
const panelPedidos = document.getElementById("panel-pedidos");
const vistaPedidos = document.getElementById("vista-pedidos");
const actualizarPedidos = document.getElementById("actualizar-pedidos");
const estadoPedidos = document.getElementById("pedidos-estado");
const listaPedidos = document.getElementById("lista-pedidos");
const generarClaveCocina = document.getElementById("generar-clave-cocina");
const estadoClaveCocina = document.getElementById("clave-cocina-estado");
const claveCocinaGenerada = document.getElementById("clave-cocina-generada");
const claveCocinaNueva = document.getElementById("clave-cocina-nueva");
const comandaImpresa = document.getElementById("comanda-impresa");
const contenidoComanda = document.getElementById("contenido-comanda");
let versionPedidos = 0;
let firmaListaPedidos = "";
let cambiandoPedido = false;
const panelEstadisticas = document.getElementById("panel-estadisticas");
const formularioEstadisticas = document.getElementById("formulario-estadisticas");
const desdeEstadisticas = document.getElementById("estadisticas-desde");
const hastaEstadisticas = document.getElementById("estadisticas-hasta");
const estadoEstadisticas = document.getElementById("estadisticas-estado");
const resultadoEstadisticas = document.getElementById("resultado-estadisticas");
let versionEstadisticas = 0;

async function solicitar(ruta, method = "GET", datos) {
  const respuesta = await fetch("/api/admin/" + ruta, {
    method,
    cache: "no-store",
    ...(datos ? {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    } : {})
  });
  const resultado = await respuesta.json();
  if (!respuesta.ok) {
    const error = new Error(resultado.error);
    error.status = respuesta.status;
    throw error;
  }
  return resultado;
}

function mostrarAcceso() {
  productos.replaceChildren();
  altaProducto.replaceChildren();
  estadoCatalogo.textContent = "";
  seccionesCategorias.clear();
  filasCategorias = [];
  listaCategorias.replaceChildren();
  estadoCategorias.textContent = "";
  editorCategorias.open = false;
  editorHorario.open = false;
  versionHorario++;
  listaTurnos.replaceChildren();
  estadoHorario.textContent = "";
  agregarTurno.disabled = guardarHorario.disabled = true;
  versionEntrega++;
  editorEntrega.open = false;
  formularioEntrega.hidden = true;
  camposEntrega.disabled = false;
  estadoEntrega.textContent = "";
  coloniasEntrega.replaceChildren();
  mesasAgenda.replaceChildren();
  estadoAgenda.textContent = "";
  agenda.open = false;
  panelPedidos.open = false;
  listaPedidos.replaceChildren();
  claveCocinaNueva.value = "";
  claveCocinaGenerada.hidden = true;
  estadoClaveCocina.textContent = "";
  limpiarComanda();
  estadoPedidos.textContent = "";
  firmaListaPedidos = "";
  versionPedidos++;
  panelEstadisticas.open = false;
  versionEstadisticas++;
  formularioEstadisticas.reset();
  formularioEstadisticas.querySelector("button").disabled = false;
  resultadoEstadisticas.hidden = true;
  estadoEstadisticas.textContent = "";
  solicitudAgenda = null;
  versionAgenda++;
  panel.hidden = true;
  acceso.hidden = false;
}

function mostrarError(error) {
  if (error.status === 401) mostrarAcceso();
  mensaje.textContent = error.status ? error.message : "No se pudo conectar. Intenta nuevamente.";
}

function agregarFilaColonia(colonia = { nombre: "", envioCentavos: 0 }) {
  const fila = document.createElement("div");
  fila.className = "fila-categoria";
  const nombre = campoCatalogo(fila, "Colonia", "text", colonia.nombre, { required: true, maxLength: 80 });
  const envio = campoCatalogo(fila, "Envío (MXN)", "number", colonia.envioCentavos / 100, {
    required: true, min: "0", max: "1000000", step: "0.01"
  });
  nombre.name = "colonia";
  envio.name = "envio";
  const quitar = document.createElement("button");
  quitar.type = "button";
  quitar.textContent = "Quitar";
  quitar.addEventListener("click", () => {
    fila.remove();
    agregarColonia.disabled = false;
    agregarColonia.focus();
  });
  fila.appendChild(quitar);
  coloniasEntrega.appendChild(fila);
  agregarColonia.disabled = coloniasEntrega.children.length >= 100;
  return nombre;
}

function mostrarReglasEntrega(reglas) {
  modoEntrega.value = reglas.modo;
  minimoEntrega.value = reglas.minimoCentavos / 100;
  coloniasEntrega.replaceChildren();
  agregarColonia.disabled = false;
  reglas.colonias.forEach(agregarFilaColonia);
  formularioEntrega.hidden = false;
}

function mostrarErrorEntrega(error) {
  if (error.status === 401) mostrarError(error);
  else estadoEntrega.textContent = error.status ? error.message : "No se pudo conectar. Intenta de nuevo.";
}

editorEntrega.addEventListener("toggle", async () => {
  if (!editorEntrega.open || panel.hidden || !formularioEntrega.hidden) return;
  const version = ++versionEntrega;
  estadoEntrega.textContent = "Cargando reglas…";
  try {
    const reglas = await solicitar("entrega");
    if (version !== versionEntrega) return;
    mostrarReglasEntrega(reglas);
    estadoEntrega.textContent = "";
  } catch (error) {
    if (version === versionEntrega) mostrarErrorEntrega(error);
  }
});

agregarColonia.addEventListener("click", () => agregarFilaColonia().focus());
formularioEntrega.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (camposEntrega.disabled) return;
  const version = ++versionEntrega;
  const reglas = {
    modo: modoEntrega.value,
    minimoCentavos: Math.round(minimoEntrega.valueAsNumber * 100),
    colonias: Array.from(coloniasEntrega.children, fila => ({
      nombre: fila.querySelector('[name="colonia"]').value,
      envioCentavos: Math.round(fila.querySelector('[name="envio"]').valueAsNumber * 100)
    }))
  };
  camposEntrega.disabled = true;
  estadoEntrega.textContent = "Guardando…";
  try {
    const guardadas = await solicitar("entrega", "PUT", reglas);
    if (version !== versionEntrega) return;
    mostrarReglasEntrega(guardadas);
    estadoEntrega.textContent = "Reglas de entrega guardadas.";
  } catch (error) {
    if (version === versionEntrega) mostrarErrorEntrega(error);
  } finally {
    if (version === versionEntrega) camposEntrega.disabled = false;
  }
});

function editorPrecios(producto) {
  const editor = document.createElement("details");
  editor.className = "editor-producto";
  const titulo = document.createElement("summary");
  const formulario = document.createElement("form");
  const formato = new Intl.NumberFormat("es-MX", { style: "currency", currency: producto.moneda });

  function campo(etiqueta, valor, requerido) {
    const label = document.createElement("label");
    label.textContent = etiqueta;
    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "decimal";
    input.min = "0";
    input.max = "1000000";
    input.step = "0.01";
    input.required = requerido;
    input.value = valor ?? "";
    label.appendChild(input);
    formulario.appendChild(label);
    return input;
  }

  const regular = campo("Precio regular", producto.precio, true);
  const especial = campo("Precio especial (opcional)", producto.precioEspecial, false);
  const guardar = document.createElement("button");
  guardar.type = "submit";
  guardar.textContent = "Guardar precios";
  const estado = document.createElement("p");
  estado.setAttribute("role", "status");

  function actualizarTitulo() {
    titulo.textContent = "Editar precios · " + formato.format(producto.precio);
    if (producto.precioEspecial != null) {
      titulo.textContent += " · Especial " + formato.format(producto.precioEspecial);
    }
  }

  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    const precioCentavos = Math.round(Number(regular.value) * 100);
    const especialCentavos = especial.value === "" ? null : Math.round(Number(especial.value) * 100);
    if (especialCentavos !== null && especialCentavos >= precioCentavos) {
      estado.textContent = "El precio especial debe ser menor que el regular.";
      especial.focus();
      return;
    }

    regular.disabled = especial.disabled = guardar.disabled = true;
    estado.textContent = "Guardando…";
    try {
      const resultado = await solicitar("precios", "PUT", { id: producto.id, precioCentavos, especialCentavos });
      producto.precio = resultado.precio;
      producto.precioEspecial = resultado.precioEspecial;
      actualizarTitulo();
      estado.textContent = "Precios guardados.";
    } catch (error) {
      if (error.status === 401) mostrarError(error);
      else estado.textContent = error.status ? error.message : "No se pudo conectar. Intenta nuevamente.";
    } finally {
      regular.disabled = especial.disabled = guardar.disabled = false;
    }
  });

  actualizarTitulo();
  formulario.append(guardar, estado);
  editor.append(titulo, formulario);
  return editor;
}

function editorDescripcion(producto) {
  const editor = document.createElement("details");
  editor.className = "editor-producto";
  const titulo = document.createElement("summary");
  titulo.textContent = "Editar descripción";

  const formulario = document.createElement("form");
  const etiqueta = document.createElement("label");
  etiqueta.textContent = "Descripción del producto";
  const campo = document.createElement("textarea");
  campo.rows = 3;
  campo.maxLength = 240;
  campo.required = true;
  campo.value = producto.descripcion ?? "";
  etiqueta.appendChild(campo);

  const guardar = document.createElement("button");
  guardar.type = "submit";
  guardar.textContent = "Guardar descripción";
  const estado = document.createElement("p");
  estado.setAttribute("role", "status");

  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    const descripcion = campo.value.trim();
    if (!descripcion) {
      estado.textContent = "Escribe una descripción antes de guardar.";
      campo.focus();
      return;
    }

    campo.disabled = guardar.disabled = true;
    estado.textContent = "Guardando…";
    try {
      const resultado = await solicitar("descripciones", "PUT", { id: producto.id, descripcion });
      campo.value = resultado.descripcion;
      estado.textContent = "Descripción guardada.";
    } catch (error) {
      if (error.status === 401) mostrarError(error);
      else estado.textContent = error.status ? error.message : "No se pudo conectar. Intenta nuevamente.";
    } finally {
      campo.disabled = guardar.disabled = false;
    }
  });

  formulario.append(etiqueta, guardar, estado);
  editor.append(titulo, formulario);
  return editor;
}

function campoCatalogo(contenedor, nombre, tipo, valor, atributos = {}) {
  const etiqueta = document.createElement("label");
  etiqueta.textContent = nombre;
  const input = document.createElement(tipo === "textarea" || tipo === "select" ? tipo : "input");
  if (input.tagName === "INPUT") input.type = tipo;
  Object.assign(input, atributos);
  if (tipo === "checkbox") input.checked = Boolean(valor);
  else input.value = valor ?? "";
  etiqueta.appendChild(input);
  contenedor.appendChild(etiqueta);
  return input;
}

function opcionesCatalogo(contenedor, titulo, singular, opciones, crearCampos) {
  const grupo = document.createElement("fieldset");
  const leyenda = document.createElement("legend");
  leyenda.textContent = titulo;
  const lista = document.createElement("div");
  const agregar = document.createElement("button");
  agregar.type = "button";
  agregar.textContent = "Añadir " + singular;
  const filas = new Map();

  function insertar(opcion) {
    const fila = document.createElement("div");
    fila.className = "opcion-catalogo";
    const nombre = campoCatalogo(fila, "Nombre", "text", opcion.nombre, { required: true, maxLength: 80 });
    const leer = crearCampos(fila, opcion);
    const quitar = document.createElement("button");
    quitar.type = "button";
    quitar.textContent = "Quitar " + singular;
    quitar.addEventListener("click", () => {
      fila.remove();
      filas.delete(fila);
      agregar.disabled = false;
      agregar.focus();
    });
    fila.appendChild(quitar);
    lista.appendChild(fila);
    filas.set(fila, () => ({ id: opcion.id, nombre: nombre.value.trim(), ...leer() }));
    agregar.disabled = filas.size >= 30;
    return nombre;
  }

  opciones.forEach(insertar);
  agregar.addEventListener("click", () => insertar({ id: crypto.randomUUID() }).focus());
  grupo.append(leyenda, lista, agregar);
  contenedor.appendChild(grupo);
  return () => Array.from(filas.values(), leer => leer());
}

function seleccionarCatalogo(contenedor, etiqueta, valor, opciones) {
  const select = campoCatalogo(contenedor, etiqueta, "select");
  for (const [id, nombre] of opciones) {
    const opcion = document.createElement("option");
    opcion.value = id;
    opcion.textContent = nombre;
    select.appendChild(opcion);
  }
  select.value = valor;
  return select;
}

async function prepararFotoProducto(archivo) {
  if (!/\.(jpe?g|png|webp)$/i.test(archivo.name) ||
      (archivo.type && !["image/jpeg", "image/png", "image/webp"].includes(archivo.type))) {
    throw new Error("Elige una foto en formato JPG, PNG o WebP.");
  }
  if (archivo.size > 12 * 1024 * 1024) {
    throw new Error("Elige una foto que pese hasta 12 MB.");
  }

  const url = URL.createObjectURL(archivo);
  try {
    const imagen = new Image();
    imagen.src = url;
    await imagen.decode();
    const lienzo = document.createElement("canvas");
    const contexto = lienzo.getContext("2d");
    for (const [lado, calidad] of [[960, 0.84], [960, 0.67], [720, 0.65], [480, 0.60]]) {
      const escala = Math.min(1, lado / Math.max(imagen.naturalWidth, imagen.naturalHeight));
      lienzo.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
      lienzo.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
      contexto.fillStyle = "#fff";
      contexto.fillRect(0, 0, lienzo.width, lienzo.height);
      contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      const foto = lienzo.toDataURL("image/jpeg", calidad);
      const prefijo = "data:image/jpeg;base64,";
      if (foto.startsWith(prefijo) && foto.length <= prefijo.length + 240000) {
        return foto.slice(prefijo.length);
      }
    }
  } finally {
    URL.revokeObjectURL(url);
  }
  throw new Error("La foto es demasiado grande para guardarse.");
}

function editorCatalogo(producto, categorias) {
  const creando = !producto;
  const datos = producto ?? {};
  const editor = document.createElement("details");
  editor.className = "editor-producto";
  const titulo = document.createElement("summary");
  titulo.textContent = creando ? "Agregar producto" : "Editar ficha y opciones";
  const formulario = document.createElement("form");
  formulario.className = "formulario-catalogo";
  const campos = document.createElement("fieldset");
  const datosTitulo = document.createElement("legend");
  datosTitulo.textContent = "Datos del producto";
  campos.appendChild(datosTitulo);
  const importe = { required: true, min: "0", max: "1000000", step: "0.01" };
  let id = datos.id;
  let categoria;
  let descripcion;
  let precio;
  let archivado;
  if (creando) {
    categoria = seleccionarCatalogo(campos, "Categoría", categorias[0]?.id ?? "",
      categorias.map(item => [item.id, item.nombre]));
    descripcion = campoCatalogo(campos, "Descripción", "textarea", "", { required: true, maxLength: 240 });
    precio = campoCatalogo(campos, "Precio regular (MXN)", "number", "", importe);
  } else {
    archivado = campoCatalogo(campos, "Archivar del menú público", "checkbox", datos.archivado);
  }
  const nombre = campoCatalogo(campos, "Nombre del producto", "text", datos.nombre, { required: true, maxLength: 80 });
  const tituloFoto = document.createElement("h3");
  tituloFoto.textContent = "Fotografía del producto";
  campos.appendChild(tituloFoto);
  const archivoFoto = campoCatalogo(campos, "Subir foto del dispositivo (JPG, PNG o WebP)", "file", "", {
    accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
  });
  const imagen = campoCatalogo(campos, "Ruta o enlace HTTPS de la foto (opcional)", "text", datos.imagen,
    { maxLength: 500, placeholder: "imagenes/pastor.webp" });
  archivoFoto.addEventListener("change", () => { imagen.readOnly = archivoFoto.files.length > 0; });
  const tituloPersonalizacion = document.createElement("h3");
  tituloPersonalizacion.textContent = "Contenido y personalización";
  campos.appendChild(tituloPersonalizacion);
  const incluye = campoCatalogo(campos, "Incluye (combos)", "textarea",
    datos.incluye?.join("\n"), { rows: 2, maxLength: 971 });
  const ayudaIncluye = document.createElement("small");
  ayudaIncluye.textContent = "Escribe un elemento por renglón.";
  incluye.parentElement.appendChild(ayudaIncluye);
  const maxExtras = campoCatalogo(campos, "Máximo de extras (vacío para sin límite)", "number", datos.maxExtras,
    { min: "0", max: "30", step: "1" });
  const etiquetaVariante = campoCatalogo(campos, "Etiqueta de variantes", "text", datos.etiquetaVariante,
    { maxLength: 50, placeholder: "Tamaño" });
  const ingredientes = opcionesCatalogo(campos, "Ingredientes", "ingrediente", datos.ingredientes ?? [], (fila, opcion) => {
    const incluido = campoCatalogo(fila, "Incluido de forma predeterminada", "checkbox", opcion.incluido);
    const obligatorio = campoCatalogo(fila, "Obligatorio", "checkbox", opcion.obligatorio);
    return () => ({ incluido: incluido.checked, obligatorio: obligatorio.checked });
  });
  const extras = opcionesCatalogo(campos, "Extras", "extra", datos.extras ?? [], (fila, opcion) => {
    const costo = campoCatalogo(fila, "Precio adicional (MXN)", "number", opcion.precio ?? 0, importe);
    return () => ({ precio: costo.valueAsNumber });
  });
  const vinculables = categorias.flatMap(item => item.productos)
    .filter(item => item.id !== id)
    .map(item => [item.id, item.nombre + (item.archivado ? " (archivado)" : "")]);
  const variantes = opcionesCatalogo(campos, "Variantes", "variante", datos.variantes ?? datos.tamanos ?? [], (fila, opcion) => {
    const recargo = campoCatalogo(fila, "Recargo (MXN)", "number", opcion.recargo ?? 0, importe);
    const vinculo = seleccionarCatalogo(fila, "Producto vinculado", opcion.productoId ?? "",
      [["", "Ninguno"], ...vinculables]);
    return () => ({ recargo: recargo.valueAsNumber, productoId: vinculo.value });
  });
  const guardar = document.createElement("button");
  guardar.type = "submit";
  guardar.textContent = creando ? "Crear producto" : "Guardar ficha";
  if (creando) guardar.className = "crear-producto";
  const estado = document.createElement("p");
  estado.setAttribute("role", "status");
  formulario.append(campos, guardar, estado);
  editor.append(titulo, formulario);

  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (guardar.disabled) return;
    id ??= "prod-" + crypto.randomUUID();
    const ficha = {
      id, version: datos.version ?? 0, archivado: archivado?.checked ?? false,
      nombre: nombre.value, imagen: imagen.value,
      incluye: incluye.value.split("\n").map(linea => linea.trim()).filter(Boolean),
      maxExtras: maxExtras.value === "" ? null : maxExtras.valueAsNumber,
      etiquetaVariante: etiquetaVariante.value, ingredientes: ingredientes(), extras: extras(), variantes: variantes(),
      ...(creando ? { categoriaId: categoria.value, descripcion: descripcion.value, precio: precio.valueAsNumber } : {})
    };
    campos.disabled = guardar.disabled = true;
    let requiereRecarga = false;
    estado.textContent = "Guardando…";
    try {
      const archivo = archivoFoto.files[0];
      if (archivo) {
        estado.textContent = "Preparando la foto…";
        try {
          ficha.fotoSubida = await prepararFotoProducto(archivo);
        } catch (error) {
          estado.textContent = error instanceof DOMException
            ? "No se pudo abrir la foto. Elige otro archivo JPG, PNG o WebP."
            : error.message;
          return;
        }
        if (panel.hidden || !editor.isConnected) return;
        estado.textContent = "Guardando producto y foto…";
      }
      const resultado = await solicitar("productos", creando ? "POST" : "PUT", ficha);
      if (!creando) datos.version = resultado.version;
      estado.textContent = "Guardado.";
      if (panel.hidden) return;
      let actualizado;
      try {
        actualizado = await solicitar("disponibilidad");
      } catch (error) {
        if (error.status === 401) throw error;
        estado.textContent = "La ficha se guardó. Recarga el panel para ver los cambios.";
        requiereRecarga = true;
        return;
      }
      if (panel.hidden) return;
      mostrarProductosPanel(actualizado);
      estadoCatalogo.textContent = ficha.nombre.trim() + (ficha.archivado ? " quedó archivado." : " quedó guardado.");
      estadoCatalogo.tabIndex = -1;
      estadoCatalogo.focus();
    } catch (error) {
      if (error.status === 401) mostrarError(error);
      else estado.textContent = error.status ? error.message : "No se pudo confirmar el guardado. Intenta nuevamente.";
    } finally {
      campos.disabled = guardar.disabled = requiereRecarga;
    }
  });
  return editor;
}

function filaProducto(producto, categorias) {
  const fila = document.createElement("div");
  fila.className = "fila";
  const etiqueta = document.createElement("div");
  const nombre = document.createElement("strong");
  nombre.textContent = producto.nombre;
  const estado = document.createElement("span");
  estado.className = "estado";
  const boton = document.createElement("button");
  boton.type = "button";

  function mostrarEstado() {
    estado.textContent = producto.archivado ? "Archivado" : producto.disponible ? "Disponible" : "Agotado";
    boton.textContent = producto.disponible ? "Marcar agotado" : "Volver a ofrecer";
    boton.setAttribute("aria-label", boton.textContent + ": " + producto.nombre);
  }

  boton.addEventListener("click", async () => {
    boton.disabled = true;
    mensaje.textContent = "";
    try {
      const resultado = await solicitar("disponibilidad", "PUT", {
        id: producto.id,
        disponible: !producto.disponible
      });
      producto.disponible = resultado.disponible;
      mostrarEstado();
      mensaje.textContent = producto.nombre + ": " + estado.textContent + ".";
    } catch (error) {
      mostrarError(error);
    } finally {
      boton.disabled = false;
    }
  });

  mostrarEstado();
  etiqueta.append(nombre, estado);
  fila.appendChild(etiqueta);
  if (!producto.archivado) fila.appendChild(boton);
  const productoPanel = document.createElement("div");
  productoPanel.append(fila, editorPrecios(producto), editorDescripcion(producto), editorCatalogo(producto, categorias));
  return productoPanel;
}

function actualizarOrdenCategorias() {
  listaCategorias.replaceChildren(...filasCategorias.map(fila => fila.contenedor));
  filasCategorias.forEach((fila, indice) => {
    fila.subir.disabled = indice === 0;
    fila.bajar.disabled = indice === filasCategorias.length - 1;
  });
}

function filaCategoria(categoria) {
  const contenedor = document.createElement("div");
  contenedor.className = "fila-categoria";
  const etiqueta = document.createElement("label");
  etiqueta.textContent = "Nombre de categoría";
  const nombre = document.createElement("input");
  nombre.type = "text";
  nombre.required = true;
  nombre.maxLength = 60;
  nombre.value = categoria.nombre;
  etiqueta.appendChild(nombre);

  const subir = document.createElement("button");
  const bajar = document.createElement("button");
  const fila = { id: categoria.id, contenedor, nombre, subir, bajar };

  for (const [boton, texto, salto] of [[subir, "Subir", -1], [bajar, "Bajar", 1]]) {
    boton.type = "button";
    boton.textContent = texto;
    boton.addEventListener("click", () => {
      const indice = filasCategorias.indexOf(fila);
      const destino = indice + salto;
      if (destino < 0 || destino >= filasCategorias.length) return;
      [filasCategorias[indice], filasCategorias[destino]] = [filasCategorias[destino], fila];
      actualizarOrdenCategorias();
      (boton.disabled ? nombre : boton).focus();
    });
  }
  contenedor.append(etiqueta, subir, bajar);
  return fila;
}

formularioCategorias.addEventListener("submit", async evento => {
  evento.preventDefault();
  const categorias = filasCategorias.map(fila => ({ id: fila.id, nombre: fila.nombre.value.trim() }));
  const vacia = categorias.findIndex(categoria => !categoria.nombre);
  if (vacia !== -1) {
    estadoCategorias.textContent = "Escribe un nombre para cada categoría.";
    filasCategorias[vacia].nombre.focus();
    return;
  }

  const guardar = formularioCategorias.querySelector('button[type="submit"]');
  for (const fila of filasCategorias) fila.nombre.disabled = fila.subir.disabled = fila.bajar.disabled = true;
  guardar.disabled = true;
  estadoCategorias.textContent = "Guardando…";

  try {
    const resultado = await solicitar("categorias", "PUT", { categorias });
    if (panel.hidden) return;
    resultado.categorias.forEach(({ id, nombre }, indice) => {
      filasCategorias[indice].nombre.value = nombre;
      const seccion = seccionesCategorias.get(id);
      seccion.titulo.textContent = nombre;
      productos.appendChild(seccion.contenedor);
    });
    estadoCategorias.textContent = "Categorías guardadas.";
  } catch (error) {
    if (error.status === 401) mostrarError(error);
    else estadoCategorias.textContent = error.status ? error.message : "No se pudo conectar. Intenta nuevamente.";
  } finally {
    for (const fila of filasCategorias) fila.nombre.disabled = false;
    actualizarOrdenCategorias();
    guardar.disabled = false;
  }
});

function mostrarProductosPanel(categorias) {
  altaProducto.replaceChildren(editorCatalogo(null, categorias));
  productos.replaceChildren();
  seccionesCategorias.clear();

  for (const categoria of categorias) {
    const contenedor = document.createElement("section");
    const titulo = document.createElement("h2");
    titulo.textContent = categoria.nombre;
    contenedor.append(titulo, ...categoria.productos.map(producto => filaProducto(producto, categorias)));
    seccionesCategorias.set(categoria.id, { contenedor, titulo });
    productos.appendChild(contenedor);
  }

  filasCategorias = categorias.map(filaCategoria);
  actualizarOrdenCategorias();
}

async function cargarPanel() {
  mostrarProductosPanel(await solicitar("disponibilidad"));
  acceso.hidden = true;
  panel.hidden = false;
  cargarHorarioEditor();
}

acceso.addEventListener("submit", async evento => {
  evento.preventDefault();
  const boton = acceso.querySelector("button");
  boton.disabled = true;
  mensaje.textContent = "";
  try {
    await solicitar("entrar", "POST", {
      clave: clave.value,
      recordar: document.getElementById("recordar").checked
    });
    clave.value = "";
    await cargarPanel();
  } catch (error) {
    mostrarError(error);
  } finally {
    boton.disabled = false;
  }
});

salir.addEventListener("click", async () => {
  try {
    await solicitar("salir", "POST");
    mostrarAcceso();
    mensaje.textContent = "Sesión cerrada.";
  } catch (error) {
    mostrarError(error);
  }
});

function mostrarErrorHorario(error) {
  if (error.status === 401) mostrarError(error);
  else estadoHorario.textContent = error.status ? error.message : "No se pudo conectar. Intenta nuevamente.";
}

function crearTurno(turno = { dias: [], abre: "12:00", cierra: "22:00" }) {
  const grupo = document.createElement("fieldset");
  grupo.className = "turno-horario";
  const titulo = document.createElement("legend");
  titulo.textContent = "Turno de atención";
  const dias = document.createElement("div");
  dias.className = "dias-turno";

  for (const [valor, texto] of diasHorario) {
    const etiqueta = document.createElement("label");
    const control = document.createElement("input");
    control.type = "checkbox";
    control.name = "dia";
    control.value = valor;
    control.checked = turno.dias.includes(valor);
    etiqueta.append(control, document.createTextNode(" " + texto));
    dias.appendChild(etiqueta);
  }

  const horas = document.createElement("div");
  horas.className = "horas-turno";
  for (const [nombre, texto, valor] of [
    ["abre", "Abre", turno.abre],
    ["cierra", "Cierra", turno.cierra === "24:00" ? "00:00" : turno.cierra]
  ]) {
    const etiqueta = document.createElement("label");
    etiqueta.textContent = texto;
    const control = document.createElement("input");
    control.type = "time";
    control.name = nombre;
    control.required = true;
    control.value = valor;
    etiqueta.appendChild(control);
    horas.appendChild(etiqueta);
  }

  const quitar = document.createElement("button");
  quitar.type = "button";
  quitar.textContent = "Quitar turno";
  quitar.addEventListener("click", () => {
    grupo.remove();
    agregarTurno.focus();
  });
  grupo.append(titulo, dias, horas, quitar);
  return grupo;
}

async function cargarHorarioEditor() {
  const version = ++versionHorario;
  estadoHorario.textContent = "Consultando horario…";
  try {
    const { turnos } = await solicitar("horario");
    if (version !== versionHorario) return;
    listaTurnos.replaceChildren(...turnos.map(crearTurno));
    estadoHorario.textContent = "";
    agregarTurno.disabled = guardarHorario.disabled = false;
  } catch (error) {
    if (version === versionHorario) mostrarErrorHorario(error);
  }
}

agregarTurno.addEventListener("click", () => {
  if (listaTurnos.children.length >= 32) return;
  const turno = crearTurno();
  listaTurnos.appendChild(turno);
  turno.querySelector("input").focus();
});

formularioHorario.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (guardarHorario.disabled) return;
  const version = versionHorario;
  const turnos = [];

  for (const grupo of listaTurnos.children) {
    const dias = [...grupo.querySelectorAll('input[name="dia"]:checked')].map(campo => campo.value);
    if (!dias.length) {
      estadoHorario.textContent = "Selecciona al menos un día en cada turno.";
      grupo.querySelector("input").focus();
      return;
    }
    const abre = grupo.querySelector('input[name="abre"]').value;
    const cierre = grupo.querySelector('input[name="cierra"]').value;
    turnos.push({ dias, abre, cierra: cierre === "00:00" ? "24:00" : cierre });
  }

  const controles = [...formularioHorario.querySelectorAll("input, button")];
  controles.forEach(control => { control.disabled = true; });
  estadoHorario.textContent = "Guardando…";
  try {
    await solicitar("horario", "PUT", { turnos });
    if (version === versionHorario) estadoHorario.textContent = "Horario guardado.";
  } catch (error) {
    if (version === versionHorario) mostrarErrorHorario(error);
  } finally {
    if (version === versionHorario) controles.forEach(control => { control.disabled = false; });
  }
});

function mostrarErrorAgenda(error) {
  if (error.status === 401) {
    mostrarError(error);
    return;
  }
  estadoAgenda.textContent = error.status ? error.message : "No se pudo conectar. Intenta nuevamente.";
}

function filaMesa(registro) {
  const fila = document.createElement("div");
  fila.className = "fila";
  const etiqueta = document.createElement("span");
  etiqueta.textContent = registro.hora + "–" + registro.hasta + " · " +
    registro.mesa + " · " + registro.personas + (registro.personas === 1 ? " persona" : " personas");
  const cancelar = document.createElement("button");
  cancelar.type = "button";
  cancelar.textContent = "Cancelar";
  cancelar.setAttribute("aria-label", "Cancelar " + registro.mesa + " a las " + registro.hora);

  cancelar.addEventListener("click", async () => {
    if (!window.confirm("¿Cancelar la mesa y liberar el horario?")) return;
    cancelar.disabled = true;
    try {
      await solicitar("agenda", "DELETE", { id: registro.id });
      await cargarAgenda("Mesa liberada.");
    } catch (error) {
      mostrarErrorAgenda(error);
      cancelar.disabled = false;
    }
  });

  fila.append(etiqueta, cancelar);
  return fila;
}

async function cargarAgenda(mensajeActual = "") {
  const version = ++versionAgenda;
  const fecha = fechaAgenda.value;
  mesasAgenda.replaceChildren();

  if (!fecha) {
    estadoAgenda.textContent = "Selecciona una fecha.";
    return;
  }

  estadoAgenda.textContent = "Consultando agenda…";
  try {
    const registros = await solicitar("agenda?fecha=" + encodeURIComponent(fecha));
    if (version !== versionAgenda) return;
    mesasAgenda.replaceChildren(...registros.map(filaMesa));
    estadoAgenda.textContent = mensajeActual || (registros.length ? "" : "Todavía no hay mesas registradas para esa fecha.");
  } catch (error) {
    if (version === versionAgenda) mostrarErrorAgenda(error);
  }
}

agenda.addEventListener("toggle", () => {
  if (!agenda.open || panel.hidden) return;
  if (!fechaAgenda.value) {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, "0");
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    fechaAgenda.value = ahora.getFullYear() + "-" + mes + "-" + dia;
  }
  cargarAgenda();
});

fechaAgenda.addEventListener("change", () => cargarAgenda());
formularioAgenda.addEventListener("submit", async evento => {
  evento.preventDefault();
  const boton = formularioAgenda.querySelector("button");
  if (boton.disabled) return;
  boton.disabled = true;

  const fecha = fechaAgenda.value;
  const hora = horaAgenda.value;
  const personas = Number(personasAgenda.value);
  const datos = JSON.stringify([fecha, hora, personas]);
  if (solicitudAgenda?.datos !== datos) {
    solicitudAgenda = { datos, id: crypto.randomUUID() };
  }

  try {
    const registro = await solicitar("agenda", "POST", { id: solicitudAgenda.id, fecha, hora, personas });
    solicitudAgenda = null;
    if (fechaAgenda.value === fecha && horaAgenda.value === hora && Number(personasAgenda.value) === personas) {
      horaAgenda.value = "";
      personasAgenda.value = "";
    }
    await cargarAgenda(registro.mesa + " registrada a las " + registro.hora + ".");
  } catch (error) {
    mostrarErrorAgenda(error);
  } finally {
    boton.disabled = false;
  }
});

function mostrarErrorPedidos(error) {
  if (error.status === 401) mostrarError(error);
  else estadoPedidos.textContent = error.status ? error.message : "No se pudo consultar la lista.";
}

function limpiarComanda() {
  comandaImpresa.hidden = true;
  contenidoComanda.replaceChildren();
  document.body.classList.remove("imprimiendo-comanda");
}

function imprimirComanda(contenido) {
  contenidoComanda.replaceChildren(contenido.cloneNode(true));
  comandaImpresa.hidden = false;
  document.body.classList.add("imprimiendo-comanda");
  window.print();
}

window.addEventListener("afterprint", limpiarComanda);

function tarjetaPedido(pedido) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "pedido-cocina";
  const contenido = document.createElement("div");
  const titulo = document.createElement("h2");
  titulo.textContent = "Pedido #" + pedido.folio + " · " + pedido.etiqueta;
  const { detalle } = pedido;
  const servicio = { mesa: detalle.mesa, recoger: "Recoger", domicilio: "Entrega a domicilio" }[detalle.servicio];
  const info = document.createElement("p");
  const fecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(pedido.creado);
  info.textContent = servicio + " · Recibido " + fecha;
  const productosPedido = document.createElement("ul");

  for (const linea of detalle.lineas) {
    const producto = document.createElement("li");
    producto.textContent = linea.cantidad + " × " + linea.nombre;
    for (const [etiqueta, opciones] of [["Incluye", linea.incluye], ["Sin", linea.omitidos], ["Extras", linea.extras]]) {
      if (!opciones.length) continue;
      const dato = document.createElement("small");
      dato.textContent = etiqueta + ": " + opciones.join(", ");
      producto.appendChild(dato);
    }
    productosPedido.appendChild(producto);
  }

  contenido.append(titulo, info, productosPedido);
  if (detalle.notas) {
    const notas = document.createElement("p");
    notas.className = "instrucciones-cocina";
    notas.textContent = "Instrucciones: " + detalle.notas;
    contenido.appendChild(notas);
  }

  const total = document.createElement("p");
  const moneda = new Intl.NumberFormat("es-MX", { style: "currency", currency: detalle.moneda });
  const importe = centavos => moneda.format(centavos / 100);
  total.textContent = (detalle.servicio === "domicilio" ? "Subtotal: " : "Total: ") + importe(pedido.totalCentavos);
  if (detalle.entrega) {
    total.textContent += " · " + detalle.entrega.colonia + " · Envío " + importe(detalle.entrega.envioCentavos) +
      " · Total " + importe(pedido.totalCentavos + detalle.entrega.envioCentavos);
  }
  tarjeta.append(contenido, total);

  if (pedido.acciones.length) {
    const acciones = document.createElement("div");
    acciones.className = "acciones-cocina";
    const imprimir = document.createElement("button");
    imprimir.type = "button";
    imprimir.textContent = "Imprimir comanda";
    imprimir.setAttribute("aria-label", "Imprimir comanda del pedido " + pedido.folio);
    imprimir.addEventListener("click", () => imprimirComanda(contenido));
    acciones.appendChild(imprimir);
    for (const accion of pedido.acciones) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = accion.id === "cancelado" ? "Cancelar pedido" : "Marcar " + accion.etiqueta.toLowerCase();
      boton.addEventListener("click", () => cambiarEstadoPedido(pedido, accion, boton));
      acciones.appendChild(boton);
    }
    tarjeta.appendChild(acciones);
  }
  return tarjeta;
}

async function cambiarEstadoPedido(pedido, accion, boton) {
  if (cambiandoPedido) return;
  if (accion.id === "cancelado" && !window.confirm("¿Cancelar este pedido de prueba?")) return;
  cambiandoPedido = true;
  versionPedidos++;
  boton.disabled = true;
  estadoPedidos.textContent = "Guardando estado…";
  try {
    await solicitar("pedidos", "PUT", { folio: pedido.folio, actual: pedido.estado, nuevo: accion.id });
    estadoPedidos.textContent = "Estado guardado.";
    await cargarPedidos();
  } catch (error) {
    mostrarErrorPedidos(error);
  } finally {
    boton.disabled = false;
    cambiandoPedido = false;
  }
}

async function cargarPedidos() {
  const version = ++versionPedidos;
  try {
    const pedidos = await solicitar("pedidos?vista=" + encodeURIComponent(vistaPedidos.value));
    if (version !== versionPedidos || panel.hidden) return;
    const firma = JSON.stringify(pedidos);
    if (firma !== firmaListaPedidos) {
      listaPedidos.replaceChildren(...pedidos.map(tarjetaPedido));
      firmaListaPedidos = firma;
    }
    if (!pedidos.length) estadoPedidos.textContent = "No hay pedidos en esta vista.";
    else if (estadoPedidos.textContent !== "Estado guardado.") estadoPedidos.textContent = "";
  } catch (error) {
    if (version === versionPedidos) mostrarErrorPedidos(error);
  }
}

panelPedidos.addEventListener("toggle", () => {
  if (panelPedidos.open && !panel.hidden) cargarPedidos();
});
vistaPedidos.addEventListener("change", cargarPedidos);
actualizarPedidos.addEventListener("click", cargarPedidos);
generarClaveCocina.addEventListener("click", async () => {
  if (generarClaveCocina.disabled ||
      !window.confirm("¿Generar una contraseña nueva y cerrar las sesiones de cocina activas?")) return;
  generarClaveCocina.disabled = true;
  estadoClaveCocina.textContent = "Generando la contraseña…";
  try {
    const resultado = await solicitar("cocina/clave", "POST");
    if (panel.hidden) return;
    claveCocinaNueva.value = resultado.contrasena;
    claveCocinaGenerada.hidden = false;
    estadoClaveCocina.textContent = "Contraseña generada.";
    claveCocinaNueva.focus();
    claveCocinaNueva.select();
  } catch (error) {
    if (error.status === 401) mostrarError(error);
    else estadoClaveCocina.textContent = error.status ? error.message : "No se pudo confirmar el cambio. Intenta de nuevo.";
  } finally {
    generarClaveCocina.disabled = false;
  }
});
window.setInterval(() => {
  if (panelPedidos.open && !panel.hidden && !document.hidden && !cambiandoPedido) cargarPedidos();
}, 15000);

function mostrarEstadisticas(datos) {
  const dinero = new Intl.NumberFormat("es-MX", {
    style: "currency", currency: datos.moneda
  });
  const moneda = centavos => dinero.format(centavos / 100);
  const cantidad = new Intl.NumberFormat("es-MX");
  const indicadores = [
    ["Pedidos recibidos", cantidad.format(datos.recibidos)],
    ["En curso", cantidad.format(datos.enCurso)],
    ["Entregados", cantidad.format(datos.entregados)],
    ["Cancelados", cantidad.format(datos.cancelados)],
    ["Importe de productos entregados", moneda(datos.importeCentavos)],
    ["Promedio por pedido entregado", datos.promedioCentavos === null ? "—" : moneda(datos.promedioCentavos)]
  ];
  const resumen = document.getElementById("estadisticas-resumen");
  resumen.replaceChildren(...indicadores.map(([nombre, valor]) => {
    const fila = document.createElement("div");
    const etiqueta = document.createElement("dt");
    const dato = document.createElement("dd");
    etiqueta.textContent = nombre;
    dato.textContent = valor;
    fila.append(etiqueta, dato);
    return fila;
  }));

  const listar = textos => textos.map(texto => {
    const fila = document.createElement("li");
    fila.textContent = texto;
    return fila;
  });
  document.getElementById("estadisticas-servicios").replaceChildren(...listar([
    "En la mesa: " + cantidad.format(datos.mesa),
    "Para recoger: " + cantidad.format(datos.recoger),
    "A domicilio: " + cantidad.format(datos.domicilio)
  ]));
  document.getElementById("estadisticas-productos").replaceChildren(...listar(
    datos.productos.map(producto => producto.nombre + " · " + cantidad.format(producto.unidades))
  ));
  document.getElementById("estadisticas-sin-productos").hidden = datos.productos.length > 0;
}

async function cargarEstadisticas() {
  const version = ++versionEstadisticas;
  const boton = formularioEstadisticas.querySelector("button");
  const parametros = new URLSearchParams();
  if (desdeEstadisticas.value) parametros.set("desde", desdeEstadisticas.value);
  if (hastaEstadisticas.value) parametros.set("hasta", hastaEstadisticas.value);

  boton.disabled = true;
  resultadoEstadisticas.hidden = true;
  estadoEstadisticas.textContent = "Consultando estadísticas…";
  try {
    const datos = await solicitar("estadisticas?" + parametros);
    if (version !== versionEstadisticas || panel.hidden) return;
    desdeEstadisticas.max = hastaEstadisticas.max = datos.hoy;
    desdeEstadisticas.value = datos.desde;
    hastaEstadisticas.value = datos.hasta;
    mostrarEstadisticas(datos);
    resultadoEstadisticas.hidden = false;
    estadoEstadisticas.textContent = "Período consultado.";
  } catch (error) {
    if (version !== versionEstadisticas) return;
    if (error.status === 401) mostrarError(error);
    else estadoEstadisticas.textContent = error.status ? error.message : "No se pudo consultar el período.";
  } finally {
    if (version === versionEstadisticas) boton.disabled = false;
  }
}

panelEstadisticas.addEventListener("toggle", () => {
  if (panelEstadisticas.open && !panel.hidden) cargarEstadisticas();
});
formularioEstadisticas.addEventListener("submit", evento => {
  evento.preventDefault();
  cargarEstadisticas();
});

cargarPanel().catch(error => {
  if (error.status === 401) mostrarAcceso();
  else mostrarError(error);
});
