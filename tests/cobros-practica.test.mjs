import test from "node:test";
import assert from "node:assert/strict";
import {aplicarCobro,estadoCobro,validarCambioPedido,centavosCobro,resumenCobros,referenciaRepetida} from "../public/demostraciones/cobros-practica.mjs";
const p={folio:"DEMO-1",estado:"listo",total:12500};
const d={accion:"registrar",revision:0,totalEsperado:12500,metodo:"efectivo",recibidoCentavos:15000};
const transferencia={...d,metodo:"transferencia",recibidoCentavos:12500,referencia:"DEMO-123456"};
test("efectivo exacto, cambio, importes inválidos y transferencia",()=>{
 const a=aplicarCobro(p,d,1);assert.equal(a.cobro.importeCentavos,12500);assert.equal(a.cobro.cambioCentavos,2500);
 assert.throws(()=>aplicarCobro(p,{...d,recibidoCentavos:100}));
 assert.throws(()=>aplicarCobro(p,{...transferencia,recibidoCentavos:15000}));
 assert.throws(()=>aplicarCobro(p,{...transferencia,referencia:"123456"}));
 assert.equal(centavosCobro("125.25"),12525);assert.throws(()=>centavosCobro("1e3"));
});
test("anulación y corrección conservan historial y revisión",()=>{
 const a=aplicarCobro(p,d,1);assert.throws(()=>aplicarCobro(a,{...d,revision:1}));
 const b=aplicarCobro(a,{accion:"anular",revision:1,motivo:"Método incorrecto"},2);assert.equal(b.cobro,null);
 assert.throws(()=>aplicarCobro(b,d));
 const c=aplicarCobro(b,{...transferencia,revision:2},3);assert.equal(c.historialCobros.length,3);assert.equal(c.cobro.referencia,"DEMO-123456");
 assert.ok(referenciaRepetida([c],{folio:"DEMO-2"},c.cobro));
});
test("entrega y cancelación conciliadas y estado histórico",()=>{
 assert.throws(()=>validarCambioPedido(p,"entregado"));const a=aplicarCobro(p,d,1);
 assert.doesNotThrow(()=>validarCambioPedido(a,"entregado"));assert.throws(()=>validarCambioPedido(a,"cancelado"));
 assert.throws(()=>aplicarCobro({...p,estado:"entregado"},d));
 assert.equal(estadoCobro({...p,estado:"entregado"}),"historico");assert.equal(estadoCobro({...p,total:0}),"sin_cargo");
 assert.equal(resumenCobros([a,{...p,folio:"DEMO-2"}]).pendiente,12500);
});
