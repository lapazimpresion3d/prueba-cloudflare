import test from "node:test";
import assert from "node:assert/strict";
import {horarioEntregaAbierto,cotizarEntregaDemo} from "../public/demostraciones/entrega-practica.mjs";
import {obtenerEstablecimiento} from "../public/demostraciones/establecimientos.mjs";
import {resumirCarrito,resumirPedidoConfirmado,crearPedidosPractica} from "../public/demostraciones/pedidos-practica.mjs";
import {prepararSolicitudPedido} from "../public/demostraciones/pedidos-remotos.mjs";
const id="taqueria-el-comal",cat=obtenerEstablecimiento(id).catalogo,d={cliente:"cliente-1",pago:"efectivo",nota:"",direccion:"domicilio-1"},lineas=[{id:"pastor",cantidad:4}];
const abierto=Date.parse("2026-11-27T19:00:00Z"),cerrado=Date.parse("2026-11-28T04:30:00Z");
test("horario de La Paz y lunes cerrado",()=>{
 assert.equal(horarioEntregaAbierto(abierto),true);
 assert.equal(horarioEntregaAbierto(abierto-60000),false);
 assert.equal(horarioEntregaAbierto(cerrado),false);
 assert.equal(horarioEntregaAbierto(Date.parse("2026-11-30T19:00:00Z")),false);
});
test("tarifas y mínimos de tres zonas",()=>{
 for(const [direccion,min,envio] of [["domicilio-1",10000,2500],["domicilio-2",15000,3500],["domicilio-3",20000,5000]]){
  const q=cotizarEntregaDemo(direccion,min,"simulado",cerrado);assert.equal(q.envioCentavos,envio);assert.equal(q.error,"");assert.equal(cotizarEntregaDemo(direccion,min-1,"simulado",cerrado).faltante,1);
 }
 assert.equal(resumirCarrito(id,cat,lineas,"domicilio").cotizacion.envioCentavos,null);
});
test("confirmación valida cobertura mínimo y horario; recogida independiente",()=>{
 assert.throws(()=>resumirPedidoConfirmado(id,cat,lineas,"domicilio",d,"actual",cerrado));
 assert.throws(()=>resumirPedidoConfirmado(id,cat,[{id:"pastor",cantidad:3}],"domicilio",d,"simulado",cerrado));
 assert.throws(()=>resumirPedidoConfirmado(id,cat,lineas,"domicilio",{...d,direccion:"fuera"},"simulado",cerrado));
 const r=resumirPedidoConfirmado(id,cat,lineas,"domicilio",d,"simulado",cerrado);
 assert.equal(r.total,12500);assert.equal(r.entrega.horario,"simulado");
 assert.equal(prepararSolicitudPedido(r,false,"id",d).horarioEntrega,"simulado");
 assert.equal(resumirPedidoConfirmado(id,cat,lineas,"recoger",d,"actual",cerrado).total,10000);
});
test("historial conserva tarifa y compatibilidad con pedidos anteriores",()=>{
 const m=new Map(),a={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},r=crearPedidosPractica(a,id,"p4",{ahora:()=>abierto,folio:()=>"1"});
 const p=r.crear(cat,lineas,"domicilio",d);
 assert.equal(crearPedidosPractica(a,id,"p4").leer()[0].total,12500);
 assert.equal(r.cambiar(p.folio,"recibido","preparando").entrega.envioCentavos,2500);
 const k="lapaz:demo:pedidos:v1:"+id,v=JSON.parse(m.get(k));delete v.pedidos[0].entrega;v.pedidos[0].cargo=3500;v.pedidos[0].total=13500;m.set(k,JSON.stringify(v));
 assert.equal(crearPedidosPractica(a,id,"p4").leer()[0].total,13500);
});
