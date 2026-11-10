export function fechaNegocio(zonaHoraria) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHoraria || "America/Mazatlan", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date(Date.now()));
  const campos = Object.fromEntries(partes.map(({type, value}) => [type,value]));
  return campos.year + "-" + campos.month + "-" + campos.day;
}

function fechaValida(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(valor + "T00:00:00Z");
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0,10) === valor;
}

export function validarPromocion(promocion, especialCentavos) {
  if (promocion == null) return null;
  if (especialCentavos === null || !fechaValida(promocion.desde) || !fechaValida(promocion.hasta) ||
      promocion.desde > promocion.hasta) {
    throw new Error("Indica un precio especial y fechas válidas. La fecha final debe ser igual o posterior a la inicial.");
  }
  return {desde:promocion.desde, hasta:promocion.hasta};
}

export function aplicarPrecio(producto, precio, hoy, administrando) {
  delete producto.promocion;
  producto.precio = precio.precio_centavos / 100;
  const estado = !precio.fecha_desde ? null : hoy < precio.fecha_desde ? "programada" :
    hoy > precio.fecha_hasta ? "finalizada" : "activa";
  if (precio.especial_centavos !== null && (administrando || !estado || estado === "activa")) {
    producto.precioEspecial = precio.especial_centavos / 100;
  } else {
    delete producto.precioEspecial;
  }
  if (administrando && estado) producto.promocion = {desde:precio.fecha_desde, hasta:precio.fecha_hasta, estado};
}
