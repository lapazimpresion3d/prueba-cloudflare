import test from "node:test";
import assert from "node:assert/strict";
import {crearIntentoPoint,cuerpoPoint,pesosPoint,verificarOrdenPoint,clientePoint} from "../src/pagos/point.mjs";
const i=crearIntentoPoint({intento:"b7a48289-b63a-4ec4-8e19-c376f91aef77",terminal:"NEWLAND_N950__PRUEBA",importeCentavos:46000,comercio:"123456"});
const o={id:"ORD0123456789",type:"point",user_id:"123456",currency:"MXN",country_code:"MEX",external_reference:i.referencia,config:{point:{terminal_id:i.terminal}},status:"processed",status_detail:"accredited",total_paid_amount:"460.00",transactions:{payments:[{id:"PAY0123456789",amount:"460",paid_amount:"460.00",status:"processed",status_detail:"accredited"}]}};
test("cuerpo exacto, centavos y referencia sin datos personales",()=>{
 assert.equal(pesosPoint(46001),"460.01");assert.throws(()=>pesosPoint(0));assert.throws(()=>pesosPoint(1.2));
 assert.deepEqual(cuerpoPoint(i).transactions.payments,[{amount:"460.00"}]);assert.equal(cuerpoPoint(i).type,"point");
 assert.throws(()=>cuerpoPoint({...i,referencia:"otra"}));
});
test("acreditación exige identidad, comercio, terminal, moneda e importe",()=>{
 assert.equal(verificarOrdenPoint(i,o).resultado,"acreditado");
 for(const cambio of [{user_id:"999"},{currency:"USD"},{country_code:"ARG"},{external_reference:"otra"},{config:{point:{terminal_id:"OTRA"}}},{total_paid_amount:"459.99"},{status_detail:"pending"},{transactions:{payments:[{...o.transactions.payments[0],paid_amount:"459.99"}]}},{transactions:{payments:[...o.transactions.payments,...o.transactions.payments]}}])assert.throws(()=>verificarOrdenPoint(i,{...o,...cambio}));
 assert.throws(()=>verificarOrdenPoint(i,o,"ORD0987654321"));
});
test("estados no acreditados no confirman cobro",()=>{
 for(const status of ["created","at_terminal","action_required","processing"])assert.equal(verificarOrdenPoint(i,{...o,status}).resultado,"pendiente");
 for(const status of ["failed","canceled","expired","refunded"])assert.equal(verificarOrdenPoint(i,{...o,status}).resultado,status);
 assert.equal(verificarOrdenPoint(i,{...o,status:"unknown"}).resultado,"revision_manual");
});
test("transporte inyectado: POST idempotente y GET de conciliación",async()=>{
 const llamadas=[];const c=clientePoint({accessToken:"TOKEN-FICTICIO-SIN-RED-123",transporte:async(url,opt)=>{llamadas.push({url,opt});return {ok:true,json:async()=>o};}});
 await c.crear(i);await c.crear(i);await c.consultar(i,o.id);
 assert.equal(llamadas[0].url,"https://api.mercadopago.com/v1/orders");assert.equal(llamadas[0].opt.headers["X-Idempotency-Key"],i.intento);
 assert.equal(llamadas[1].opt.headers["X-Idempotency-Key"],i.intento);assert.equal(llamadas[0].opt.body,llamadas[1].opt.body);
 assert.equal(llamadas[2].opt.method,"GET");assert.equal(llamadas[2].url,"https://api.mercadopago.com/v1/orders/"+o.id);
 await assert.rejects(c.consultar(i,"../otro"));
});
test("errores ambiguos no se consideran rechazo ni exponen credenciales",async()=>{
 const c=clientePoint({accessToken:"TOKEN-FICTICIO-SIN-RED-123",transporte:async()=>{throw Error("TOKEN-FICTICIO-SIN-RED-123");}});
 await assert.rejects(c.crear(i),e=>e.status===0&&!e.message.includes("TOKEN"));
 const d=clientePoint({accessToken:"TOKEN-FICTICIO-SIN-RED-123",transporte:async()=>({ok:false,status:500})});
 await assert.rejects(d.crear(i),e=>e.status===500);
});

test("GET documentado puede omitir moneda y total global; rechaza propinas y devoluciones no conciliadas",()=>{
 const {currency,total_paid_amount,...get}=o;
 assert.equal(verificarOrdenPoint(i,get).resultado,"acreditado");
 for(const campo of ["tip_amount","refunded_amount"])assert.throws(()=>verificarOrdenPoint(i,{...get,transactions:{payments:[{...o.transactions.payments[0],[campo]:"1.00"}]}}));
 assert.throws(()=>verificarOrdenPoint(i,{...get,transactions:{...o.transactions,refunds:[{id:"REF123"}]}}));
});
test("solo lista terminales PDV",async()=>{
 const c=clientePoint({accessToken:"TOKEN-FICTICIO-SIN-RED-123",transporte:async(url,opt)=>{assert.equal(opt.method,"GET");assert.ok(url.includes("/terminals/v1/list?"));return {ok:true,json:async()=>({data:{terminals:[{id:i.terminal,operating_mode:"PDV"},{id:"OTRA",operating_mode:"SELF_SERVICE"}]}})};}});
 assert.deepEqual(await c.terminales(),[{id:i.terminal,modo:"PDV"}]);
});
