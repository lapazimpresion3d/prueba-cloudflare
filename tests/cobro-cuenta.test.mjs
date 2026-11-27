import test from "node:test";
import assert from "node:assert/strict";
import {versionCuenta,prepararCobroCuenta} from "../public/demostraciones/cobro-cuenta.mjs";
import {resumenCobros,aplicarCobro} from "../public/demostraciones/cobros-practica.mjs";
const cuenta="b7a48289-b63a-4ec4-8e19-c376f91aef79";
const c={cerrado:null,cuenta_id:cuenta},op="b7a48289-b63a-4ec4-8e19-c376f91aef77",op2="b7a48289-b63a-4ec4-8e19-c376f91aef78";
const pedidos=[{solicitud:"a",cuenta,estado:"entregado",total:12500},{solicitud:"b",cuenta,estado:"entregado",total:5000},{solicitud:"c",cuenta,estado:"cancelado",total:7500}];
const d={accion:"cobrar",version:versionCuenta(pedidos),operacion:op,totalEsperado:17500,metodo:"efectivo",recibidoCentavos:20000};
test("cobro agrupado sin duplicar venta, efectivo ni cambio",()=>{
 const a=prepararCobroCuenta(c,pedidos,d,1);assert.equal(a.length,2);
 assert.equal(a.reduce((s,p)=>s+p.cobro.recibidoCentavos,0),20000);
 assert.equal(a.reduce((s,p)=>s+p.cobro.cambioCentavos,0),2500);
 assert.equal(resumenCobros(a).cobrado,17500);
 assert.throws(()=>prepararCobroCuenta(c,[...a,pedidos[2]],d));
 assert.throws(()=>aplicarCobro(a[0],{accion:"anular",revision:1,motivo:"Método incorrecto"}));
 const b=prepararCobroCuenta(c,[...a,pedidos[2]],{accion:"anular_cobro",version:versionCuenta([...a,pedidos[2]]),operacion:op2,grupo:op,motivo:"Método incorrecto"});
 assert.ok(b.every(p=>!p.cobro&&p.historialCobros.length===2));
});
test("terminal independiente, saldo restante, y validaciones",()=>{
 const a=prepararCobroCuenta(c,pedidos,{...d,metodo:"tarjeta_externa",recibidoCentavos:17500,referencia:"DEMO-123456"});
 assert.equal(resumenCobros(a).tarjeta_externa,17500);
 assert.throws(()=>prepararCobroCuenta(c,pedidos,{...d,metodo:"transferencia",referencia:"DEMO-123456"}));
 assert.throws(()=>prepararCobroCuenta({cerrado:1},pedidos,d));
 const pendientes=[a[0],pedidos[1],pedidos[2]];
 assert.equal(prepararCobroCuenta(c,pendientes,{...d,operacion:op2,version:versionCuenta(pendientes),totalEsperado:5000,recibidoCentavos:5000}).length,1);
});

test("pedido entregado sin cuenta no admite cobro agrupado",()=>{
 const fuera=pedidos.map(({cuenta,...p})=>p);
 assert.throws(()=>prepararCobroCuenta(c,fuera,{...d,version:versionCuenta(fuera)}),/pedido cerrado/);
});
