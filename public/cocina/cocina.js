const accesoCocina = document.getElementById("acceso-cocina");
const tableroCocina = document.getElementById("tablero-cocina");
const estadoCocina = document.getElementById("estado-cocina");
const claveCocina = document.getElementById("clave-cocina");
const actualizarCocina = document.getElementById("actualizar-cocina");
const salirCocina = document.getElementById("salir-cocina");
const columnasCocina = [
  ["confirmado", document.getElementById("confirmados-cocina"), "Aún no hay pedidos por preparar."],
  ["preparacion", document.getElementById("preparacion-cocina"), "Aún no hay pedidos en preparación."]
];
const horaCocina = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" });
let ocupado = false;
let firmaPedidos = "";

async function solicitarCocina(ruta, method = "GET", datos) {
  const respuesta = await fetch("/api/cocina/" + ruta, {
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

function mostrarAccesoCocina(error) {
  tableroCocina.hidden = true;
  accesoCocina.hidden = error.status === 503;
  for (const [, contenedor] of columnasCocina) contenedor.replaceChildren();
  firmaPedidos = "";
  estadoCocina.textContent = error.message;
}

function mostrarErrorCocina(error) {
  if (error.status === 401 || error.status === 503) mostrarAccesoCocina(error);
  else estadoCocina.textContent = error.status ? error.message : "No se pudo conectar. Intenta actualizar.";
}

function textoCocina(etiqueta, texto) {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  return elemento;
}

function tarjetaCocina(pedido) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "pedido-cocina";
  const detalle = pedido.detalle;
  const servicio = { mesa: detalle.mesa, recoger: "Para recoger", domicilio: "Entrega a domicilio" }[detalle.servicio];
  const productos = document.createElement("ul");
  for (const linea of detalle.lineas) {
    const producto = textoCocina("li", linea.cantidad + " × " + linea.nombre);
    for (const [etiqueta, valores] of [["Incluye", linea.incluye], ["Sin", linea.omitidos], ["Extras", linea.extras]]) {
      if (valores?.length) producto.appendChild(textoCocina("small", etiqueta + " · " + valores.join(", ")));
    }
    productos.appendChild(producto);
  }
  tarjeta.append(textoCocina("h3", "Pedido #" + pedido.folio),
    textoCocina("p", servicio + " · " + horaCocina.format(pedido.creado)), productos);
  if (detalle.notas) {
    const nota = textoCocina("p", "Instrucciones · " + detalle.notas);
    nota.className = "nota-cocina";
    tarjeta.appendChild(nota);
  }
  for (const accion of pedido.acciones) {
    const etiqueta = accion.id === "preparacion" ? "Iniciar preparación" : "Marcar listo";
    const boton = textoCocina("button", etiqueta);
    boton.type = "button";
    boton.setAttribute("aria-label", etiqueta + " para el pedido " + pedido.folio);
    boton.addEventListener("click", () => operarCocina(async () => {
      boton.disabled = true;
      try {
        await solicitarCocina("pedidos", "PUT", { folio: pedido.folio, actual: pedido.estado, nuevo: accion.id });
        const mensaje = "Pedido #" + pedido.folio + " · " + accion.etiqueta;
        estadoCocina.textContent = mensaje;
        await cargarCocina(mensaje);
      } catch (error) {
        if (error.status !== 404 && error.status !== 409) throw error;
        await cargarCocina("El pedido cambió. La lista se actualizó.");
      } finally {
        boton.disabled = false;
      }
    }));
    tarjeta.appendChild(boton);
  }
  return tarjeta;
}

async function cargarCocina(mensaje) {
  const pedidos = await solicitarCocina("pedidos");
  const firma = JSON.stringify(pedidos);
  if (firma !== firmaPedidos) {
    for (const [estado, contenedor, vacio] of columnasCocina) {
      const tarjetas = pedidos.filter(pedido => pedido.estado === estado).map(tarjetaCocina);
      contenedor.replaceChildren(...(tarjetas.length ? tarjetas : [textoCocina("p", vacio)]));
    }
    firmaPedidos = firma;
  }
  accesoCocina.hidden = true;
  tableroCocina.hidden = false;
  estadoCocina.textContent = mensaje ?? "";
}

async function operarCocina(operacion) {
  if (ocupado) return;
  ocupado = true;
  actualizarCocina.disabled = salirCocina.disabled = true;
  try {
    await operacion();
  } catch (error) {
    mostrarErrorCocina(error);
  } finally {
    ocupado = false;
    actualizarCocina.disabled = salirCocina.disabled = false;
  }
}

accesoCocina.addEventListener("submit", evento => {
  evento.preventDefault();
  operarCocina(async () => {
    const boton = accesoCocina.querySelector("button");
    boton.disabled = true;
    try {
      await solicitarCocina("entrar", "POST", { clave: claveCocina.value });
      claveCocina.value = "";
      await cargarCocina();
    } finally {
      boton.disabled = false;
    }
  });
});

actualizarCocina.addEventListener("click", () => operarCocina(() => cargarCocina("Pedidos actualizados.")));
salirCocina.addEventListener("click", () => operarCocina(async () => {
  await solicitarCocina("salir", "POST");
  mostrarAccesoCocina({ status: 401, message: "Sesión cerrada." });
  claveCocina.focus();
}));

window.setInterval(() => {
  if (!tableroCocina.hidden && !document.hidden) operarCocina(() => cargarCocina());
}, 15000);
operarCocina(() => cargarCocina());
