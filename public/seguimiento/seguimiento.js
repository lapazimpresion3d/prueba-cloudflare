const token = window.location.hash.slice(1) || window.seguimientoComal.leer()?.token || "";
const folio = document.getElementById("folio-seguimiento");
const estado = document.getElementById("estado-seguimiento");
const fecha = document.getElementById("fecha-seguimiento");
const actualizar = document.getElementById("actualizar-seguimiento");
const cobroSeguimiento = document.getElementById("cobro-seguimiento");
const detalleSeguimiento = document.getElementById("detalle-seguimiento");
const servicioSeguimiento = document.getElementById("servicio-seguimiento");
const productosSeguimiento = document.getElementById("productos-seguimiento");
const notasSeguimiento = document.getElementById("notas-seguimiento");
const importesSeguimiento = document.getElementById("importes-seguimiento");
let consultando = false;
let terminado = false;
let referenciaInvalida = false;
let detalleMostrado = false;

function mostrarDetallePedido(pedido) {
  const { detalle, subtotalCentavos } = pedido;
  const dinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: detalle.moneda });
  const importe = centavos => dinero.format(centavos / 100);
  servicioSeguimiento.textContent = {
    mesa: "Pedido en " + detalle.mesa,
    recoger: "Para recoger en el establecimiento",
    domicilio: detalle.entrega ? "Entrega a domicilio · " + detalle.entrega.colonia : "Entrega a domicilio"
  }[detalle.servicio];

  const productos = detalle.lineas.map(linea => {
    const producto = document.createElement("li");
    const nombre = document.createElement("strong");
    nombre.textContent = linea.cantidad + " × " + linea.nombre;
    producto.appendChild(nombre);
    for (const [etiqueta, opciones] of [["Incluye", linea.incluye], ["Sin", linea.omitidos], ["Extras", linea.extras]]) {
      if (!opciones?.length) continue;
      const dato = document.createElement("small");
      dato.textContent = etiqueta + " · " + opciones.join(", ");
      producto.appendChild(dato);
    }
    const precio = document.createElement("p");
    precio.textContent = "Precio unitario " + importe(linea.precioUnitarioCentavos) +
      " · Subtotal " + importe(linea.precioUnitarioCentavos * linea.cantidad);
    producto.appendChild(precio);
    return producto;
  });
  productosSeguimiento.replaceChildren(...productos);
  notasSeguimiento.textContent = detalle.notas ? "Instrucciones · " + detalle.notas : "";
  notasSeguimiento.hidden = !detalle.notas;
  const importes = [["Subtotal de productos", importe(subtotalCentavos)]];
  if (detalle.servicio === "domicilio") {
    importes.push(["Envío", detalle.entrega ? importe(detalle.entrega.envioCentavos) : "Por confirmar"]);
  }
  if (detalle.servicio !== "domicilio" || detalle.entrega) {
    importes.push(["Total", importe(subtotalCentavos + (detalle.entrega?.envioCentavos ?? 0))]);
  }
  importesSeguimiento.replaceChildren(...importes.map(([etiqueta, valor]) => {
    const fila = document.createElement("div");
    const titulo = document.createElement("dt");
    const cantidad = document.createElement("dd");
    titulo.textContent = etiqueta;
    cantidad.textContent = valor;
    fila.append(titulo, cantidad);
    return fila;
  }));
  detalleSeguimiento.hidden = false;
  detalleMostrado = true;
}

async function cargarSeguimiento() {
  if (consultando || referenciaInvalida) return;
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
      if (respuesta.status === 404 || respuesta.status === 400) {
        referenciaInvalida = true;
        detalleSeguimiento.hidden = cobroSeguimiento.hidden = true;
      }
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
    const dinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: pedido.detalle?.moneda ?? "MXN" });
    const sinCosto = pedido.subtotalCentavos === 0 &&
      (pedido.detalle?.servicio !== "domicilio" || pedido.detalle.entrega?.envioCentavos === 0);
    const estadoCobro = pedido.cobro ? "Pagado · " + dinero.format(pedido.cobro.importeCentavos / 100) :
      sinCosto ? "Pedido sin costo" : "Pago pendiente de confirmar";
    if (cobroSeguimiento.textContent !== estadoCobro) cobroSeguimiento.textContent = estadoCobro;
    cobroSeguimiento.hidden = false;
    if (!detalleMostrado && pedido.detalle) mostrarDetallePedido(pedido);
    terminado = ["entregado", "cancelado"].includes(pedido.estado);
  } catch {
    estado.textContent = "No pudimos consultar el estado. Intenta actualizar.";
  } finally {
    consultando = false;
    actualizar.hidden = referenciaInvalida;
    actualizar.disabled = false;
  }
}

if (/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/.test(token)) {
  actualizar.addEventListener("click", cargarSeguimiento);
  cargarSeguimiento();
  window.setInterval(() => {
    if (!document.hidden && !terminado) cargarSeguimiento();
  }, 15000);
} else {
  estado.textContent = "Abre el enlace de seguimiento que recibiste al registrar el pedido.";
}
