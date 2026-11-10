const token = window.location.hash.slice(1) || window.seguimientoComal.leer()?.token || "";
const folio = document.getElementById("folio-seguimiento");
const estado = document.getElementById("estado-seguimiento");
const fecha = document.getElementById("fecha-seguimiento");
const actualizar = document.getElementById("actualizar-seguimiento");
let consultando = false;
let terminado = false;

async function cargarSeguimiento() {
  if (consultando || terminado) return;
  consultando = true;
  actualizar.disabled = true;
  try {
    const respuesta = await fetch("/api/pedidos/seguimiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store"
    });
    const pedido = await respuesta.json();
    if (!respuesta.ok) {
      estado.textContent = pedido.error;
      if (respuesta.status === 404 || respuesta.status === 400) terminado = true;
      return;
    }
    folio.textContent = "Pedido #" + pedido.folio;
    const ultimo = window.seguimientoComal.leer();
    if (!ultimo || pedido.folio >= ultimo.folio) window.seguimientoComal.guardar(token, pedido.folio);
    folio.hidden = false;
    estado.textContent = pedido.etiqueta;
    fecha.textContent = "Último cambio · " + new Intl.DateTimeFormat("es-MX", {
      dateStyle: "short", timeStyle: "short"
    }).format(pedido.actualizado);
    fecha.hidden = false;
    terminado = ["entregado", "cancelado"].includes(pedido.estado);
  } catch {
    estado.textContent = "No pudimos consultar el estado. Intenta actualizar.";
  } finally {
    consultando = false;
    actualizar.hidden = terminado;
    actualizar.disabled = false;
  }
}

if (/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/.test(token)) {
  actualizar.addEventListener("click", cargarSeguimiento);
  cargarSeguimiento();
  window.setInterval(() => {
    if (!document.hidden) cargarSeguimiento();
  }, 15000);
} else {
  estado.textContent = "Abre el enlace de seguimiento que recibiste al registrar el pedido.";
}
