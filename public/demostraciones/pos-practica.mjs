// POS local de práctica. No transmite ventas ni usa proveedores financieros.
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {capacidades} from "./config.mjs";
import {normalizarOpciones,claveLinea} from "./menu-comal-practica.mjs";
import {aplicarCobro,referenciaRepetida,motivosAnulacion} from "./cobros-practica.mjs";
import {clientesDemo} from "./clientes-practica.mjs";
import {contextoEmpresa,almacenEmpresa} from "./empresa-practica.mjs";
const MAX=100000000,LIM=50,copy=x=>JSON.parse(JSON.stringify(x));
export function admitePos(id,plan){return capacidades(obtenerEstablecimiento(id),plan).some(m=>m.id==="pos"&&m.estadoEfectivo==="disponible");}
export function resumirVenta(id,catalogo,lineas,descuento=0){
 if(!obtenerEstablecimiento(id)||!Array.isArray(catalogo)||!Array.isArray(lineas)||lineas.length>30||!Number.isSafeInteger(descuento)||descuento<0||descuento>100)throw Error("Venta inválida.");
 const vistos=new Set(),detalle=lineas.map(l=>{
  if(!l||!Number.isSafeInteger(l.cantidad)||l.cantidad<1||l.cantidad>20)throw Error("Cantidad inválida.");
  const p=catalogo.find(p=>p.id===l.id);
  if(!p||p.disponible===false||!["fisico","alimento","servicio"].includes(p.tipo)||!Number.isSafeInteger(p.precioCentavos)||p.precioCentavos<0||p.precioCentavos>MAX)throw Error("Producto o servicio no disponible.");
  const o=normalizarOpciones(id,p,catalogo,l.opciones),v={id:p.id,nombre:p.nombre,cantidad:l.cantidad,precioCentavos:o.precio,subtotal:o.precio*l.cantidad,...(o.seleccion?{opciones:o.seleccion,personalizacion:o.detalles}:{})};
  const k=claveLinea(v);if(vistos.has(k))throw Error("Partida duplicada.");vistos.add(k);return v;
 });
 const subtotal=detalle.reduce((n,l)=>n+l.subtotal,0);if(!Number.isSafeInteger(subtotal)||subtotal>MAX)throw Error("Importe supera límite de práctica.");
 const descuentoCentavos=Math.round(subtotal*descuento/100);
 return {detalle,subtotal,descuento,descuentoCentavos,total:subtotal-descuentoCentavos};
}
export function crearPosPractica(storage,id,plan,{empresaStorage=storage,ahora=Date.now,folio=()=>crypto.randomUUID()}={}){
 if(!admitePos(id,plan))throw Error("POS incluido solo en P3 y P4.");
 const c=contextoEmpresa(id,plan),empresa=almacenEmpresa(c,empresaStorage),key="lapaz:pos:practica:v1:"+id+":"+plan;
 function contexto(sucursal,empleado,supervisor=false){
  const d=empresa.leer(),rol=d.personal[empleado];
  if(!Number.isInteger(sucursal)||!d.activas.includes(sucursal)||!Number.isInteger(empleado)||!rol||d.asignaciones[empleado]!==null&&d.asignaciones[empleado]!==sucursal||supervisor&&!["propietario","administrador","encargado"].includes(rol))throw Error("Rol o sucursal de práctica no autorizado.");
  return {sucursal,empleado,rol};
 }
 function leer(){
  if(!storage)throw Error("Almacenamiento no disponible.");
  const raw=storage.getItem(key);if(!raw)return [];
  const v=JSON.parse(raw);if(!Array.isArray(v)||v.length>LIM||v.some(x=>!x||typeof x.folio!=="string"||!Array.isArray(x.detalle)||!["vendido","cancelado"].includes(x.estado)))throw Error("Historial de práctica inválido.");
  return copy(v);
 }
 function guardar(v){storage.setItem(key,JSON.stringify(v));}
 function vender(catalogo,lineas,d){
  const actor=contexto(d.sucursal,d.empleado,d.descuento>0),r=resumirVenta(id,catalogo,lineas,d.descuento??0);
  if(!r.detalle.length)throw Error("Agrega productos o servicios.");
  if(r.total!==d.totalEsperado)throw Error("El total cambió. Revisa la venta.");
  if(d.cliente&&!clientesDemo.some(x=>x.id===d.cliente))throw Error("Cliente ficticio inválido.");
  const ventas=leer();if(ventas.length>=LIM)throw Error("Límite de 50 ventas de práctica.");
  const f="POS-"+folio();if(!/^POS-[a-zA-Z0-9-]{1,80}$/.test(f)||ventas.some(x=>x.folio===f))throw Error("Folio duplicado.");
  let v={...r,...actor,folio:f,creado:ahora(),cliente:d.cliente||"",estado:"recibido",revisionCobro:0};
  if(r.total>0){v=aplicarCobro(v,{accion:"registrar",revision:0,totalEsperado:r.total,metodo:d.metodo,recibidoCentavos:d.recibidoCentavos,referencia:d.referencia},ahora());if(referenciaRepetida(ventas,v,v.cobro))throw Error("Folio de cobro repetido.");}
  else if(d.recibidoCentavos!==0)throw Error("Venta sin cargo no admite cobro.");
  v.estado="vendido";guardar([v,...ventas]);return copy(v);
 }
 function cancelar(f,sucursal,empleado,motivo){
  const actor=contexto(sucursal,empleado,true),ventas=leer(),v=ventas.find(x=>x.folio===f&&x.sucursal===sucursal);
  if(!v||v.estado!=="vendido"||!motivosAnulacion.includes(motivo))throw Error("Cancelación inválida.");
  if(v.cobro)Object.assign(v,aplicarCobro(v,{accion:"anular",revision:v.revisionCobro,motivo},ahora()));
  v.estado="cancelado";v.cancelacion={...actor,motivo,fecha:ahora()};guardar(ventas);return copy(v);
 }
 return {contexto,leer:s=>{contexto(s.sucursal,s.empleado);return leer().filter(v=>v.sucursal===s.sucursal);},vender,cancelar,empresa:()=>empresa.leer()};
}
