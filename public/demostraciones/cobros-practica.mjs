// Registro simulado, sin integración bancaria ni movimiento de dinero.
export const motivosAnulacion=Object.freeze(["Importe incorrecto","Método incorrecto","Comprobante incorrecto","Cancelación del pedido"]);
export const metodosCobroDemo={efectivo:"Efectivo",transferencia:"Transferencia",tarjeta_externa:"Tarjeta · terminal independiente"};
export const revisionCobro=p=>p.revisionCobro??0;
export function estadoCobro(p){
 if(p.cobro&&p.cobro.importeCentavos===p.total)return "cobrado";
 if(p.estado==="cancelado")return "cancelado";
 if(p.total===0)return "sin_cargo";
 if(p.estado==="entregado"&&!p.cobro&&!p.cuenta)return "historico";
 return "pendiente";
}
export const nombresCobro={cobrado:"Cobro confirmado",cancelado:"Cancelado",sin_cargo:"Sin cargo",historico:"Entregado anteriormente · sin registro de cobro",pendiente:"Pendiente de pago"};
export function validarCambioPedido(p,destino){
 if(destino==="entregado"&&!p.cuenta&&p.total>0&&estadoCobro(p)!=="cobrado")throw Error("Confirma el cobro exacto antes de entregar.");
 if(destino==="entregado"&&p.total===0&&p.cobro)throw Error("El pedido sin cargo no debe tener cobro.");
 if(destino==="cancelado"&&p.cobro)throw Error("Anula el registro de cobro antes de cancelar. No equivale a devolver dinero.");
}
export function centavosCobro(texto){
 const s=String(texto).trim();if(!/^\d{1,7}(\.\d{1,2})?$/.test(s))throw Error("Indica un importe válido en pesos, con hasta dos decimales.");
 const [a,b=""]=s.split(".");return Number(a)*100+Number(b.padEnd(2,"0"));
}
export function aplicarCobro(p,d,fecha=Date.now()){
 if(!d||!Number.isSafeInteger(d.revision)||d.revision!==revisionCobro(p))throw Error("El cobro cambió. Actualiza el pedido.");
 if(p.estado==="cancelado"||p.estado==="entregado"&&!p.cuenta)throw Error("No se modifica el cobro de un pedido cerrado.");
 if(!Number.isSafeInteger(p.total)||p.total<=0)throw Error("Este pedido no requiere cobro.");
 const historial=p.historialCobros??[];
 if(!Array.isArray(historial)||historial.length>=20)throw Error("Límite de correcciones de práctica alcanzado.");
 let cobro,evento;
 if(d.accion==="registrar"){
  if(p.cobro)throw Error("Ya existe un cobro activo. Anúlalo antes de corregir.");
  if(d.totalEsperado!==p.total)throw Error("El total del pedido cambió.");
  const m=d.metodo,recibido=d.recibidoCentavos;
  if(!Object.hasOwn(metodosCobroDemo,m)||!Number.isSafeInteger(recibido)||recibido< p.total||recibido>100000000)throw Error("Revisa el método y el importe recibido.");
  if(m!=="efectivo"&&recibido!==p.total)throw Error("La transferencia debe coincidir exactamente con el total.");
  const referencia=m!=="efectivo"?d.referencia:"";
  if(m!=="efectivo"&&(typeof referencia!=="string"||!/^DEMO-[0-9]{6}$/.test(referencia)))throw Error("Usa un folio ficticio DEMO-123456.");
  cobro={metodo:m,importeCentavos:p.total,recibidoCentavos:recibido,cambioCentavos:recibido-p.total,referencia,fecha};
  evento={accion:"registrar",fecha,cobro};
 }else if(d.accion==="anular"){
  if(p.cobro?.grupo)throw Error("Anula el cobro completo desde cuentas de mesa.");
  if(!p.cobro||!motivosAnulacion.includes(d.motivo))throw Error("Selecciona un motivo de anulación válido.");
  cobro=null;evento={accion:"anular",fecha,cobro:p.cobro,motivo:d.motivo};
 }else throw Error("Acción de cobro inválida.");
 return {...p,cobro,revisionCobro:revisionCobro(p)+1,historialCobros:[...historial,evento]};
}
export function resumenCobros(pedidos){
 const r={cobrado:0,efectivo:0,transferencia:0,tarjeta_externa:0,pendiente:0,cantidadPendiente:0,historicos:0};
 for(const p of pedidos){const e=estadoCobro(p);if(e==="cobrado"){r.cobrado+=p.cobro.importeCentavos;r[p.cobro.metodo]+=p.cobro.importeCentavos;}else if(e==="pendiente"){r.pendiente+=p.total;r.cantidadPendiente++;}else if(e==="historico")r.historicos++;}
 return r;
}
export function referenciaRepetida(pedidos,p,cobro){return !!cobro?.referencia&&pedidos.some(x=>x.folio!==p.folio&&x.cobro?.referencia===cobro.referencia);}
