const token = window.location.hash.slice(1);
const folio = document.getElementById("folio-seguimiento");
const estado = document.getElementById("estado-seguimiento");
const fecha = document.getElementById("fecha-seguimiento");
const actualizar = document.getElementById("actualizar-seguimiento");
const cobroSeguimiento = document.getElementById("cobro-seguimiento");
const botonAviso = document.getElementById("avisar-transferencia");
const estadoAviso = document.getElementById("estado-aviso-transferencia");
const instruccionesPago = document.getElementById("instrucciones-pago");
const totalPago = document.getElementById("total-pago");
const referenciaPago = document.getElementById("referencia-pago");
const datosTransferencia = document.getElementById("datos-transferencia");
const detalleSeguimiento = document.getElementById("detalle-seguimiento");
const servicioSeguimiento = document.getElementById("servicio-seguimiento");
const productosSeguimiento = document.getElementById("productos-seguimiento");
const notasSeguimiento = document.getElementById("notas-seguimiento");
const importesSeguimiento = document.getElementById("importes-seguimiento");
let consultando = false;
let avisando = false;
let terminado = false;
let referenciaInvalida = false;
let detalleMostrado = false;
let envioMostrado;
let totalReportable;

function mostrarDetallePedido(pedido) {
  const { detalle, subtotalCentavos } = pedido;
  const dinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: detalle.moneda });
  const importe = centavos => dinero.format(centavos / 100);
  servicioSeguimiento.textContent = {
    mesa: "Pedido en " + detalle.mesa,
    recoger: "Para recoger en el establecimiento",
    domicilio: detalle.entrega?.colonia ? "Entrega a domicilio · " + detalle.entrega.colonia : "Entrega a domicilio"
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
  envioMostrado = detalle.entrega?.envioCentavos;
}

async function cargarSeguimiento() {
  if (consultando || avisando || referenciaInvalida) return;
  consultando = true;
  actualizar.disabled = botonAviso.disabled = true;
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
        botonAviso.hidden = estadoAviso.hidden = true;
        instruccionesPago.hidden = true;
      }
      return;
    }
    folio.textContent = "Pedido #" + pedido.folio;
    window.seguimientoComal.guardar(token, pedido.folio);
    folio.hidden = false;
    estado.textContent = pedido.etiqueta;
    fecha.textContent = "Último cambio · " + new Intl.DateTimeFormat("es-MX", {
      dateStyle: "short", timeStyle: "short"
    }).format(pedido.actualizado);
    fecha.hidden = false;
    const dinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: pedido.detalle?.moneda ?? "MXN" });
    const sinCosto = pedido.subtotalCentavos === 0 &&
      (pedido.detalle?.servicio !== "domicilio" || pedido.detalle.entrega?.envioCentavos === 0);
    const cancelado = pedido.estado === "cancelado";
    const envioPendiente = pedido.detalle?.servicio === "domicilio" && !pedido.detalle.entrega;
    const puedeAvisar = !pedido.cobro && !sinCosto && !cancelado && !envioPendiente;
    totalReportable = pedido.totalAPagarCentavos;
    const mostrarDatosPago = puedeAvisar && pedido.totalAPagarCentavos > 0 && !pedido.transferenciaReportada;
    instruccionesPago.hidden = !mostrarDatosPago;
    if (mostrarDatosPago) {
      totalPago.textContent = "Total a pagar · " + dinero.format(pedido.totalAPagarCentavos / 100);
      referenciaPago.hidden = datosTransferencia.hidden = !pedido.instruccionesTransferencia;
      referenciaPago.textContent = "Referencia para la transferencia · Pedido " + pedido.folio;
      datosTransferencia.textContent = pedido.instruccionesTransferencia;
    }
    const estadoCobro = pedido.cobro ? "Pagado · " + dinero.format(pedido.cobro.importeCentavos / 100) :
      cancelado ? "Pedido cancelado" :
      sinCosto ? "Pedido sin costo" :
      pedido.transferenciaReportada ? "Transferencia reportada. El negocio está por verificar el pago." :
      envioPendiente ? "Envío por cotizar. Aquí aparecerá el total cuando el negocio confirme el costo." :
      pedido.transferenciaNoLocalizada ? "El negocio aún no localiza la transferencia. Revisa los datos y vuelve a avisar si ya la hiciste." :
      "Pago pendiente de confirmar";
    if (cobroSeguimiento.textContent !== estadoCobro) cobroSeguimiento.textContent = estadoCobro;
    cobroSeguimiento.hidden = false;
    botonAviso.hidden = !puedeAvisar || Boolean(pedido.transferenciaReportada);
    if (botonAviso.hidden) estadoAviso.hidden = true;
    if (pedido.detalle && (!detalleMostrado || envioMostrado !== pedido.detalle.entrega?.envioCentavos)) {
      mostrarDetallePedido(pedido);
    }
    terminado = cancelado || (pedido.estado === "entregado" && (pedido.cobro || sinCosto));
  } catch {
    estado.textContent = "No pudimos consultar el estado. Intenta actualizar.";
  } finally {
    consultando = false;
    actualizar.hidden = referenciaInvalida;
    actualizar.disabled = botonAviso.disabled = false;
  }
}

async function avisarTransferencia() {
  if (consultando || avisando || botonAviso.hidden) return;
  avisando = true;
  botonAviso.disabled = actualizar.disabled = true;
  estadoAviso.hidden = false;
  estadoAviso.textContent = "Enviando aviso…";
  let actualizarDespues = false;
  try {
    const respuesta = await fetch("/api/pedidos/avisar-transferencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, totalCentavos: totalReportable }),
      cache: "no-store"
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) {
      estadoAviso.textContent = resultado.error ?? "No pudimos enviar el aviso.";
      actualizarDespues = respuesta.status === 409 || respuesta.status === 404;
      return;
    }
    cobroSeguimiento.textContent = "Transferencia reportada. El negocio está por verificar el pago.";
    botonAviso.hidden = estadoAviso.hidden = instruccionesPago.hidden = true;
  } catch {
    estadoAviso.textContent = "No pudimos confirmar el envío del aviso. Intenta nuevamente.";
  } finally {
    avisando = false;
    botonAviso.disabled = actualizar.disabled = false;
    if (actualizarDespues) cargarSeguimiento();
  }
}

window.addEventListener("hashchange", () => window.location.reload());

if (!token) {
  document.getElementById("mis-pedidos").hidden = false;
} else {
  document.getElementById("pedido-seguimiento").hidden = false;
  document.getElementById("volver-mis-pedidos").hidden = false;
}

if (/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/.test(token)) {
  actualizar.addEventListener("click", cargarSeguimiento);
  botonAviso.addEventListener("click", avisarTransferencia);
  cargarSeguimiento();
  window.setInterval(() => {
    if (!document.hidden && !terminado) cargarSeguimiento();
  }, 15000);
} else if (token) {
  estado.textContent = "Abre el enlace de seguimiento que recibiste al registrar el pedido.";
}
