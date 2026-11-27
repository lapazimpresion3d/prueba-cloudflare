import test from "node:test";
import assert from "node:assert/strict";
import {datosCitaDemo,datosPedidoDemo,seleccionPedido} from "../public/demostraciones/clientes-practica.mjs";
import {obtenerEstablecimiento} from "../public/demostraciones/establecimientos.mjs";
import {crearPedidosPractica} from "../public/demostraciones/pedidos-practica.mjs";
import {crearCitasPractica} from "../public/demostraciones/citas-practica.mjs";
const d={cliente:"cliente-1",pago:"efectivo",nota:"separado",mesa:"2",direccion:"domicilio-1"};
const almacen=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test("solo datos ficticios válidos, modalidad y pago requeridos",()=>{
 assert.throws(()=>datosCitaDemo({cliente:""}));
 assert.throws(()=>datosPedidoDemo({...d,cliente:"Nombre real"},"local","restaurante"));
 assert.throws(()=>datosPedidoDemo({...d,mesa:""},"local","restaurante"));
 assert.throws(()=>datosPedidoDemo({...d,direccion:""},"domicilio","restaurante"));
 assert.throws(()=>datosPedidoDemo({...d,pago:""},"recoger","restaurante"));
 assert.equal(datosPedidoDemo(d,"recoger","restaurante").entrega,null);
 assert.equal(datosPedidoDemo(d,"recoger","restaurante").mesa,null);
 assert.equal(seleccionPedido(d,"domicilio","restaurante").mesa,"");
});
test("pedido conserva cliente y mesa al recuperar y cambiar estado",()=>{
 const a=almacen(),id="taqueria-el-comal",p=crearPedidosPractica(a,id,"p4",{folio:()=>"1"});
 const x=p.crear(obtenerEstablecimiento(id).catalogo,[{id:"pastor",cantidad:1}],"local",d);
 assert.equal(x.datosCliente.mesa,"2");
 assert.equal(crearPedidosPractica(a,id,"p4").leer()[0].datosCliente.cliente.id,"cliente-1");
 assert.equal(p.cambiar("DEMO-1","recibido","preparando").datosCliente.pago.id,"efectivo");
});
test("cita conserva identidad y comentario al confirmar",()=>{
 const a=almacen(),id="barberia-elite",c=crearCitasPractica(a,id,"p2",{ahora:()=>Date.parse("2026-11-27T16:00:00Z"),folio:()=>"1"});
 c.crear(obtenerEstablecimiento(id).catalogo,{servicio:"corte",recurso:"barbero-a",fecha:"2026-11-28",inicio:600,datosCliente:{cliente:"cliente-2",nota:"primera-visita"}});
 assert.equal(c.leer()[0].datosCliente.nota,"Primera visita");
 assert.equal(c.cambiar("CITA-1","pendiente","confirmada").datosCliente.cliente.id,"cliente-2");
});
