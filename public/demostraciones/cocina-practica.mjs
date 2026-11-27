import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {capacidades} from "./config.mjs";
export const admiteCocina=(id,plan)=>capacidades(obtenerEstablecimiento(id),plan).some(m=>m.id==="cocina"&&m.estadoEfectivo==="disponible");
export const admiteComandas=(id,plan)=>capacidades(obtenerEstablecimiento(id),plan).some(m=>m.id==="mesas"&&m.estadoEfectivo==="disponible");
export const activosCocina=["recibido","preparando","listo"];
export function accionesCocina(estado,mesas=false){
 return mesas?(estado==="listo"?["entregado"]:[]):estado==="recibido"?["preparando"]:estado==="preparando"?["listo"]:[];
}
export function destinoPedido(p){
 if(p.modalidad==="local")return p.datosCliente?.mesa?"Mesa "+p.datosCliente.mesa:"Local sin mesa";
 return p.modalidad==="recoger"?"Recoger en mostrador":p.modalidad==="domicilio"?"Entrega a domicilio":"Sin modalidad";
}
export function comandasActivas(pedidos,{mesa="",estado="",mesas=false}={}){
 return pedidos.filter(p=>activosCocina.includes(p.estado)&&(!estado||p.estado===estado)&&(!mesas||p.modalidad==="local")&&(!mesa||(mesa==="sin-mesa"?p.modalidad==="local"&&!p.datosCliente?.mesa:p.datosCliente?.mesa===mesa))).sort((a,b)=>a.creado-b.creado||a.folio.localeCompare(b.folio));
}
export function agruparComandas(pedidos){
 const grupos=new Map();
 for(const p of pedidos){const destino=destinoPedido(p);if(!grupos.has(destino))grupos.set(destino,[]);grupos.get(destino).push(p);}
 return [...grupos].map(([destino,pedidos])=>({destino,pedidos,unidades:pedidos.reduce((n,p)=>n+p.detalle.reduce((s,l)=>s+l.cantidad,0),0),total:pedidos.reduce((n,p)=>n+p.total,0)}));
}
export function nuevosListos(prev,actual){
 return actual.filter(p=>p.estado==="listo"&&prev.has(p.folio)&&prev.get(p.folio)!=="listo").map(p=>p.folio);
}
