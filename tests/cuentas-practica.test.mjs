import test from "node:test";
import assert from "node:assert/strict";
import {admiteCuentas,validarApertura,consumoCuenta,enlaceComanda} from "../public/demostraciones/cuentas-practica.mjs";
import {aplicarCobro,estadoCobro,validarCambioPedido} from "../public/demostraciones/cobros-practica.mjs";
const id="b7a48289-b63a-4ec4-8e19-c376f91aef77",c={cuenta_id:id,mesa:"3",cerrado:null},p={cuenta:id,folio:"DEMO-A",total:12500,estado:"listo"};
test("cuenta por giro, capacidad y enlace de captura",()=>{
 assert.equal(admiteCuentas("taqueria-el-comal","p3"),true);
 assert.equal(admiteCuentas("taqueria-el-comal","p2"),false);
 assert.equal(admiteCuentas("cafe-mirador","p4"),false);
 assert.throws(()=>validarApertura({cuenta:id,mesa:"1",personas:4}));
 assert.doesNotThrow(()=>validarApertura({cuenta:id,mesa:"3",personas:4}));
 assert.ok(enlaceComanda(c,"p4").includes("cuenta="+id+"&captura=mesero"));
});
test("servicio antes del cobro solo para comanda de cuenta y consumo conciliado",()=>{
 assert.doesNotThrow(()=>validarCambioPedido(p,"entregado"));
 assert.throws(()=>validarCambioPedido({...p,cuenta:undefined},"entregado"));
 const a={...p,estado:"entregado"};
 assert.equal(estadoCobro(a),"pendiente");
 const b=aplicarCobro(a,{accion:"registrar",revision:0,totalEsperado:12500,metodo:"efectivo",recibidoCentavos:15000},1);
 const otro={...p,cuenta:"otra",total:9000},cancelado={...p,estado:"cancelado",total:5000};
 assert.equal(consumoCuenta(c,[p,otro,cancelado]).total,12500);
 assert.equal(consumoCuenta(c,[p]).puedeCerrar,false);
 assert.equal(consumoCuenta(c,[b,otro,cancelado]).puedeCerrar,true);
 assert.equal(consumoCuenta({...c,cerrado:1},[b]).puedeCerrar,false);
});
