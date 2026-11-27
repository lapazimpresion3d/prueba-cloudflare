import test from "node:test";
import assert from "node:assert/strict";
import {admiteCocina,admiteComandas,accionesCocina,comandasActivas,agruparComandas,nuevosListos} from "../public/demostraciones/cocina-practica.mjs";
const pedido=(folio,estado,modalidad,mesa,creado)=>({folio,estado,modalidad,datosCliente:{mesa},creado,detalle:[{cantidad:2}],total:5000});
const pedidos=[pedido("B","recibido","local","2",2),pedido("A","preparando","local","2",1),pedido("C","listo","recoger",null,3),pedido("D","cancelado","local","2",4),pedido("E","entregado","local","1",5),pedido("F","recibido","domicilio",null,6)];
test("habilitación según giro y plan",()=>{
 assert.equal(admiteCocina("taqueria-el-comal","p1"),false);assert.equal(admiteCocina("taqueria-el-comal","p2"),true);
 assert.equal(admiteCocina("cafe-mirador","p2"),true);assert.equal(admiteCocina("mundo-mascotas","p4"),false);
 assert.equal(admiteComandas("taqueria-el-comal","p2"),false);assert.equal(admiteComandas("taqueria-el-comal","p3"),true);assert.equal(admiteComandas("cafe-mirador","p4"),false);
});
test("comandas activas ordenadas, por mesa y modalidad",()=>{
 assert.deepEqual(comandasActivas(pedidos).map(p=>p.folio),["A","B","C","F"]);
 assert.deepEqual(comandasActivas(pedidos,{mesa:"2",mesas:true}).map(p=>p.folio),["A","B"]);
 assert.deepEqual(comandasActivas(pedidos,{estado:"listo"}).map(p=>p.folio),["C"]);
 const grupo=agruparComandas(comandasActivas(pedidos,{mesas:true}))[0];assert.equal(grupo.destino,"Mesa 2");assert.equal(grupo.unidades,4);assert.equal(grupo.total,10000);
});
test("acciones diferenciadas por vista",()=>{
 assert.deepEqual(accionesCocina("recibido"),["preparando"]);assert.deepEqual(accionesCocina("preparando"),["listo"]);assert.deepEqual(accionesCocina("listo"),[]);
 assert.deepEqual(accionesCocina("listo",true),["entregado"]);assert.deepEqual(accionesCocina("recibido",true),[]);
});
test("avisa transición a listo una vez y no pedidos históricos",()=>{
 const actual=[pedido("A","listo","local","2",1),pedido("B","listo","local","2",2),pedido("C","listo","local","2",3)];
 assert.deepEqual(nuevosListos(new Map([["A","preparando"],["B","listo"]]),actual),["A"]);
 assert.deepEqual(nuevosListos(new Map(actual.map(p=>[p.folio,p.estado])),actual),[]);
 assert.deepEqual(nuevosListos(new Map(),actual),[]);
});
