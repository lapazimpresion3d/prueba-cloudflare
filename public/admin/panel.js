const acceso = document.getElementById("acceso");
const panel = document.getElementById("panel");
const productos = document.getElementById("productos");
const mensaje = document.getElementById("mensaje");
const clave = document.getElementById("clave");
const salir = document.getElementById("salir");
const agenda = document.getElementById("agenda");
const formularioAgenda = document.getElementById("formulario-agenda");
const fechaAgenda = document.getElementById("agenda-fecha");
const horaAgenda = document.getElementById("agenda-hora");
const personasAgenda = document.getElementById("agenda-personas");
const estadoAgenda = document.getElementById("agenda-estado");
const mesasAgenda = document.getElementById("agenda-mesas");
let solicitudAgenda = null;
let versionAgenda = 0;

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
  mesasAgenda.replaceChildren();
  estadoAgenda.textContent = "";
  agenda.open = false;
  solicitudAgenda = null;
  versionAgenda++;
  panel.hidden = true;
  acceso.hidden = false;
}

function mostrarError(error) {
  if (error.status === 401) mostrarAcceso();
  mensaje.textContent = error.status ? error.message : "No se pudo conectar. Intenta nuevamente.";
}

function filaProducto(producto) {
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
    estado.textContent = producto.disponible ? "Disponible" : "Agotado";
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
  fila.append(etiqueta, boton);
  return fila;
}

async function cargarPanel() {
  const categorias = await solicitar("disponibilidad");
  productos.replaceChildren();
  for (const categoria of categorias) {
    const titulo = document.createElement("h2");
    titulo.textContent = categoria.nombre;
    productos.append(titulo, ...categoria.productos.map(filaProducto));
  }
  acceso.hidden = true;
  panel.hidden = false;
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

cargarPanel().catch(error => {
  if (error.status === 401) mostrarAcceso();
  else mostrarError(error);
});
