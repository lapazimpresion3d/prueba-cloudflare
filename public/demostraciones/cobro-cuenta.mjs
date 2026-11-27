import {cuentaIdValida} from "./cuentas-practica.mjs";
import {aplicarCobro,revisionCobro,motivosAnulacion} from "./cobros-practica.mjs";
// La firma de revisión incluye todas las comandas, no solo el saldo.
export function versionCuenta(pedidos){
 return JSON.stringify(pedidos.map(p=>[p.solicitud,p.estado,p.total,revisionCobro(p)]).sort((a,b)=>a[0].localeCompare(b[0])));
}
export function prepararCobroCuenta(c,pedidos,d,fecha=Date.now()){
 if(c.cerrado!==null||d.version!==versionCuenta(pedidos))throw Error("La cuenta cambió o está cerrada. Actualiza.");
 if(!cuentaIdValida(d.operacion)||pedidos.some(p=>p.historialCobros?.some(e=>e.operacion===d.operacion||e.cobro?.grupo?.id===d.operacion)))throw Error("Operación inválida.");
 if(d.accion==="cobrar"){
  const pendientes=pedidos.filter(p=>p.estado!=="cancelado"&&p.total>0&&!p.cobro).sort((a,b)=>a.solicitud.localeCompare(b.solicitud));
  const total=pendientes.reduce((n,p)=>n+p.total,0);
  if(!total||total!==d.totalEsperado||pedidos.some(p=>p.estado!=="cancelado"&&p.estado!=="entregado"))throw Error("Entrega todas las comandas y revisa el saldo.");
  if(!["efectivo","transferencia","tarjeta_externa"].includes(d.metodo)||!Number.isSafeInteger(d.recibidoCentavos)||d.recibidoCentavos<total||d.recibidoCentavos>100000000||d.metodo!=="efectivo"&&d.recibidoCentavos!==total)throw Error("Importe o método inválido.");
  if(d.metodo!=="efectivo"&&!/^DEMO-[0-9]{6}$/.test(d.referencia||""))throw Error("Usa un folio ficticio DEMO-123456.");
  const referencia=d.metodo==="efectivo"?"":d.referencia;
  return pendientes.map((p,i)=>{
   const recibido=p.total+(i===0?d.recibidoCentavos-total:0);
   const n=aplicarCobro(p,{accion:"registrar",revision:revisionCobro(p),totalEsperado:p.total,metodo:d.metodo,recibidoCentavos:recibido,referencia},fecha);
   const grupo={id:d.operacion,total,recibido:d.recibidoCentavos,cambio:d.recibidoCentavos-total};
   n.cobro={...n.cobro,grupo};n.historialCobros.at(-1).cobro=n.cobro;
   return n;
  });
 }
 if(d.accion==="anular_cobro"){
  if(!cuentaIdValida(d.grupo)||!motivosAnulacion.includes(d.motivo))throw Error("Motivo o grupo inválido.");
  const grupo=pedidos.filter(p=>p.cobro?.grupo?.id===d.grupo);
  if(!grupo.length)throw Error("No hay cobro activo para anular.");
  return grupo.map(p=>{
   const n=aplicarCobro({...p,cobro:{...p.cobro,grupo:undefined}},{accion:"anular",revision:revisionCobro(p),motivo:d.motivo},fecha);
   n.historialCobros.at(-1).cobro=p.cobro;n.historialCobros.at(-1).operacion=d.operacion;return n;
  });
 }
 throw Error("Acción inválida.");
}
