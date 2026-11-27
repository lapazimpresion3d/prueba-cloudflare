import {jpegPrueba} from "./fixtures/jpeg-prueba.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { atenderDemo, contextoDemo, validarCatalogoDemo } from "../src/demostraciones.mjs";
import { establecimientos } from "../public/demostraciones/establecimientos.mjs";
import {relojLocal,sumarDias} from "../public/demostraciones/citas-practica.mjs";

function d1(){
  const sql=new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON;"+readFileSync(new URL("../migrations-demo/0001_practica.sql",import.meta.url),"utf8"));
  sql.exec(readFileSync(new URL("../migrations-demo/0002_perfiles.sql",import.meta.url),"utf8"));
  sql.exec(readFileSync(new URL("../migrations-demo/0003_pedidos.sql",import.meta.url),"utf8"));
  sql.exec(readFileSync(new URL("../migrations-demo/0004_citas.sql",import.meta.url),"utf8"));
  sql.exec(readFileSync(new URL("../migrations-demo/0005_reservaciones.sql",import.meta.url),"utf8"));
  sql.exec(readFileSync(new URL("../migrations-demo/0006_cuentas.sql",import.meta.url),"utf8"));
  const wrap=(q,args=[])=>({bind:(...v)=>wrap(q,v),first:async()=>sql.prepare(q).get(...args)??null,all:async()=>({results:sql.prepare(q).all(...args)}),run:async()=>sql.prepare(q).run(...args)});
  return {sql,prepare:q=>wrap(q),batch:async ss=>{sql.exec("BEGIN");try{for(const s of ss)await s.run();sql.exec("COMMIT");}catch(e){sql.exec("ROLLBACK");throw e;}}};
}
const base="https://demo.example";
const json=(data,status=200,headers={})=>Response.json(data,{status,headers});
const path="/api/demo/catalogo?negocio=cafe-mirador&plan=p1";
const otra="/api/demo/catalogo?negocio=barberia-elite&plan=p4";
const seed=id=>establecimientos.find(e=>e.id===id).catalogo.map(p=>({...p,disponible:true}));
function llamar(env,ruta,method="GET",cookie="",body,origin=base,ip="192.0.2.1"){
  const headers={"CF-Connecting-IP":ip};
  if(cookie)headers.Cookie=cookie;
  if(method!=="GET")headers.Origin=origin;
  if(body!==undefined)headers["Content-Type"]="application/json";
  const req=new Request(base+ruta,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return atenderDemo(req,env,new URL(req.url),json);
}
function envDemo(){return {DEMO_DB:d1(),DEMO_RATE_SECRET:"x".repeat(40),DB:{prepare(){throw Error("DB estable no permitida");}}};}
async function iniciar(env,ip){
  const r=await llamar(env,"/api/demo/sesion","POST","",undefined,base,ip);
  assert.equal(r.status,201);
  const cookie=r.headers.get("Set-Cookie");
  assert.match(cookie,/HttpOnly; SameSite=Strict/);
  return cookie.split(";")[0];
}
test("20 contextos válidos y contexto desconocido sin fallback",()=>{
  for(const e of establecimientos)for(const plan of ["p1","p2","p3","p4"])assert.equal(contextoDemo(e.id,plan).establecimiento.id,e.id);
  assert.equal(contextoDemo("otro","p1"),null);
  assert.equal(contextoDemo("cafe-mirador","otro"),null);
});
test("catálogos tipados y restringidos al establecimiento",()=>{
  const lista=seed("cafe-mirador");
  assert.equal(validarCatalogoDemo("cafe-mirador",lista).length,6);
  assert.throws(()=>validarCatalogoDemo("barberia-elite",lista));
  assert.throws(()=>validarCatalogoDemo("cafe-mirador",[lista[0],lista[0]]));
  assert.throws(()=>validarCatalogoDemo("cafe-mirador",[{...lista[0],disponible:"sí"}]));
  assert.throws(()=>validarCatalogoDemo("cafe-mirador",[{...lista[0],precioCentavos:-1}]));
});
test("registro público sin acceso D1, métodos y configuración ausente",async()=>{
  const env={DB:{prepare(){throw Error("no");}}};
  assert.equal((await llamar(env,"/api/demo/registro")).status,200);
  const ctx=await llamar(env,"/api/demo/contexto?negocio=cafe-mirador&plan=p1");
  assert.equal((await ctx.json()).persistenciaConfigurada,false);
  assert.equal((await llamar(env,"/api/demo/contexto?negocio=otro&plan=p1")).status,404);
  assert.equal((await llamar(env,"/api/demo/sesion","GET")).status,405);
  assert.equal((await llamar(env,"/api/demo/sesion","POST")).status,503);
  assert.equal((await llamar(env,"/api/demo/desconocido")).status,404);
});
test("origen, cookie y dos sesiones aisladas; revisión conflictiva",async()=>{
  const env=envDemo();
  assert.equal((await llamar(env,"/api/demo/sesion","POST","",undefined,"https://otro.example")).status,403);
  assert.equal((await llamar(env,path)).status,401);
  const a=await iniciar(env,"192.0.2.1"),b=await iniciar(env,"192.0.2.2");
  assert.notEqual(a,b);
  const lista=seed("cafe-mirador");lista[0].precioCentavos=1;
  const r=await llamar(env,path,"PUT",a,{revision:0,catalogo:lista});
  assert.equal(r.status,200);assert.equal((await r.json()).revision,1);
  assert.equal((await llamar(env,path,"PUT",a,{revision:0,catalogo:lista})).status,409);
  assert.equal((await (await llamar(env,path,"GET",a)).json()).catalogo[0].precioCentavos,1);
  assert.equal((await (await llamar(env,path,"GET",b)).json()).revision,0);
  assert.equal((await (await llamar(env,otra,"GET",a)).json()).revision,0);
  assert.equal((await llamar(env,otra,"PUT",a,{revision:0,catalogo:lista})).status,400);
  assert.equal((await llamar(env,path,"PUT",a,{revision:1,catalogo:lista})).status,200);
  env.DEMO_DB.sql.exec("UPDATE demo_sesiones SET expira=0");
  assert.equal((await llamar(env,path,"GET",a)).status,401);
});
test("límite de cinco sesiones por origen y limpieza en cascada",async()=>{
  const env=envDemo();
  const a=await iniciar(env);
  await llamar(env,path,"PUT",a,{revision:0,catalogo:seed("cafe-mirador")});
  for(let i=0;i<4;i++)await iniciar(env);
  assert.equal((await llamar(env,"/api/demo/sesion","POST")).status,429);
  env.DEMO_DB.sql.exec("UPDATE demo_sesiones SET expira=0; UPDATE demo_limites SET vence=0;");
  await iniciar(env);
  assert.equal(env.DEMO_DB.sql.prepare("SELECT count(*) AS n FROM demo_catalogos").get().n,0);
});

test("una base sin marca de esquema no habilita persistencia ni sesiones",async()=>{
  const env=envDemo();
  env.DEMO_DB.sql.exec("DELETE FROM demo_identidad");
  const r=await llamar(env,"/api/demo/contexto?negocio=cafe-mirador&plan=p1");
  assert.equal((await r.json()).persistenciaConfigurada,false);
  assert.equal((await llamar(env,"/api/demo/sesion","POST")).status,503);
  env.DEMO_DB.sql.exec("INSERT INTO demo_identidad VALUES ('lapaz-demo-practica',1)");
  assert.equal((await (await llamar(env,"/api/demo/contexto?negocio=cafe-mirador&plan=p1")).json()).persistenciaConfigurada,true);
});

test("perfil remoto privado, revisiones, separación y migración opcional",async()=>{
  const env=envDemo(),ruta="/api/demo/perfil?negocio=cafe-mirador&plan=p1",otra="/api/demo/perfil?negocio=barberia-elite&plan=p4";
  assert.equal((await llamar(env,ruta)).status,401);
  const a=await iniciar(env,"192.0.2.1"),b=await iniciar(env,"192.0.2.2");
  const inicial=await (await llamar(env,ruta,"GET",a)).json();
  assert.equal(inicial.revision,0);
  const perfil={...inicial.perfil,nombre:"Café de práctica"};
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:0,perfil})).status,200);
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:0,perfil})).status,409);
  assert.equal((await (await llamar(env,ruta,"GET",a)).json()).perfil.nombre,"Café de práctica");
  assert.equal((await (await llamar(env,ruta,"GET",b)).json()).revision,0);
  assert.equal((await (await llamar(env,otra,"GET",a)).json()).revision,0);
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:1,perfil:{...perfil,logo:"https://example.invalid"}})).status,400);
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:1,perfil})).status,200);
  env.DEMO_DB.sql.exec("DELETE FROM demo_sesiones;");
  assert.equal(env.DEMO_DB.sql.prepare("SELECT count(*) AS n FROM demo_perfiles").get().n,0);
  env.DEMO_DB.sql.exec("DROP TABLE demo_perfiles;");
  assert.equal((await (await llamar(env,"/api/demo/contexto?negocio=cafe-mirador&plan=p1")).json()).perfilConfigurado,false);
  assert.equal((await llamar(env,ruta)).status,503);
  assert.equal((await (await llamar(env,"/api/demo/contexto?negocio=cafe-mirador&plan=p1")).json()).persistenciaConfigurada,true);
});

test("catálogo remoto conserva fotografía y eliminación explícita sin compartir sesiones",async()=>{
  const env=envDemo(),ruta="/api/demo/catalogo?negocio=taqueria-el-comal&plan=p1";
  const a=await iniciar(env,"192.0.2.10"),b=await iniciar(env,"192.0.2.11"),catalogo=seed("taqueria-el-comal");
  const original=catalogo[0].imagen;
  catalogo[0].imagen=jpegPrueba();
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:0,catalogo})).status,200);
  assert.equal((await (await llamar(env,ruta,"GET",a)).json()).catalogo[0].imagen,catalogo[0].imagen);
  assert.equal((await (await llamar(env,ruta,"GET",b)).json()).catalogo[0].imagen,original);
  catalogo[0].imagen="";
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:1,catalogo})).status,200);
  assert.equal((await (await llamar(env,ruta,"GET",a)).json()).catalogo[0].imagen,"");
  catalogo[0].imagen="https://example.invalid/x";
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:2,catalogo})).status,400);
});

test("pedidos remotos: plan, origen, precios, idempotencia, aislamiento y transición",async()=>{
  const env=envDemo(),ruta="/api/demo/pedidos?negocio=cafe-mirador&plan=p2",otra="/api/demo/pedidos?negocio=mundo-mascotas&plan=p2";
  const a=await iniciar(env,"192.0.2.1"),b=await iniciar(env,"192.0.2.2");
  const solicitud="b7a48289-b63a-4ec4-8e19-c376f91aef77",pedido={solicitud,catalogo:"original",modalidad:"domicilio",lineas:[{id:"espresso",cantidad:2,precioEsperado:4500}],totalEsperado:12500};
  assert.equal((await llamar(env,ruta)).status,401);
  assert.equal((await llamar(env,ruta.replace("p2","p1"),"POST",a,pedido)).status,403);
  assert.equal((await llamar(env,ruta,"POST",a,pedido,"https://otro.example")).status,403);
  assert.equal((await llamar(env,ruta,"POST",a,{...pedido,totalEsperado:1})).status,409);
  const creado=await llamar(env,ruta,"POST",a,pedido);assert.equal(creado.status,201);assert.equal((await creado.json()).pedido.total,12500);
  const repetido=await llamar(env,ruta,"POST",a,pedido);assert.equal(repetido.status,200);assert.equal((await repetido.json()).repetido,true);
  assert.equal((await llamar(env,ruta,"POST",a,{...pedido,modalidad:"local"})).status,409);
  assert.equal((await (await llamar(env,ruta,"GET",b)).json()).pedidos.length,0);
  assert.equal((await (await llamar(env,otra,"GET",a)).json()).pedidos.length,0);
  assert.equal((await llamar(env,ruta,"PATCH",b,{solicitud,esperado:"recibido",destino:"preparando"})).status,404);
  assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud,esperado:"recibido",destino:"entregado"})).status,409);
  assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud,esperado:"recibido",destino:"preparando"})).status,200);
  assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud,esperado:"recibido",destino:"cancelado"})).status,409);
  assert.equal((await (await llamar(env,ruta,"GET",a)).json()).pedidos[0].estado,"preparando");
  env.DEMO_DB.sql.exec("UPDATE demo_sesiones SET expira=0");assert.equal((await llamar(env,ruta,"GET",a)).status,401);
  env.DEMO_DB.sql.exec("DELETE FROM demo_sesiones");assert.equal(env.DEMO_DB.sql.prepare("SELECT count(*) AS n FROM demo_pedidos").get().n,0);
});
test("catálogo personalizado guardado y límite de 30 pedidos por negocio",async()=>{
  const env=envDemo(),ruta="/api/demo/pedidos?negocio=cafe-mirador&plan=p2",a=await iniciar(env);
  const body={solicitud:"b7a48289-b63a-4ec4-8e19-c376f91aef77",catalogo:"personalizado",modalidad:"local",lineas:[{id:"espresso",cantidad:1,precioEsperado:1234}],totalEsperado:1234};
  assert.equal((await llamar(env,ruta,"POST",a,body)).status,409);
  const catalogo=seed("cafe-mirador");catalogo[0].precioCentavos=1234;
  assert.equal((await llamar(env,path,"PUT",a,{revision:0,catalogo})).status,200);
  assert.equal((await llamar(env,ruta,"POST",a,body)).status,201);
  for(let i=1;i<30;i++)assert.equal((await llamar(env,ruta,"POST",a,{...body,solicitud:"b7a48289-b63a-4ec4-8e19-"+String(i).padStart(12,"0")})).status,201);
  assert.equal((await llamar(env,ruta,"POST",a,{...body,solicitud:"b7a48289-b63a-4ec4-8e19-000000000031"})).status,409);
  assert.equal((await (await llamar(env,ruta,"GET",a)).json()).pedidos.length,30);
  env.DEMO_DB.sql.exec("DROP TABLE demo_pedidos");
  const ctx=await (await llamar(env,"/api/demo/contexto?negocio=cafe-mirador&plan=p2")).json();
  assert.equal(ctx.pedidosConfigurados,false);assert.equal(ctx.persistenciaConfigurada,true);assert.equal(ctx.perfilConfigurado,true);
  assert.equal((await llamar(env,ruta,"GET",a)).status,503);
});

test("citas remotas: intervalo atómico, precio/duración, idempotencia y cancelación",async()=>{
  const env=envDemo(),ruta="/api/demo/citas?negocio=barberia-elite&plan=p2",a=await iniciar(env,"192.0.2.1"),b=await iniciar(env,"192.0.2.2");
  let fecha=sumarDias(relojLocal().fecha,1);if(new Date(fecha+"T00:00:00Z").getUTCDay()===1)fecha=sumarDias(fecha,1);
  const solicitud="b7a48289-b63a-4ec4-8e19-c376f91aef77",cita={solicitud,catalogo:"original",servicio:"corte",recurso:"barbero-a",fecha,inicio:600,precioEsperado:18000,duracionEsperada:35};
  const otra={...cita,solicitud:"b7a48289-b63a-4ec4-8e19-c376f91aef78",inicio:630};
  assert.equal((await llamar(env,ruta)).status,401);
  assert.equal((await llamar(env,ruta.replace("p2","p1"),"POST",a,cita)).status,403);
  assert.equal((await llamar(env,ruta,"POST",a,cita,"https://otro.example")).status,403);
  assert.equal((await llamar(env,ruta,"POST",a,{...cita,precioEsperado:1})).status,409);
  assert.equal((await llamar(env,ruta,"POST",a,{...cita,duracionEsperada:5})).status,409);
  assert.equal((await llamar(env,ruta,"POST",a,{...cita,inicio:840})).status,409);
  const [x,y]=await Promise.all([llamar(env,ruta,"POST",a,cita),llamar(env,ruta,"POST",a,otra)]);
  assert.deepEqual([x.status,y.status].sort(),[201,409]);
  const ganadora=x.status===201?cita:otra,perdedora=x.status===201?otra:cita;
  assert.equal((await (await llamar(env,ruta,"POST",a,ganadora)).json()).repetida,true);
  assert.equal((await llamar(env,ruta,"POST",a,{...ganadora,inicio:690})).status,409);
  assert.equal((await (await llamar(env,ruta,"GET",b)).json()).citas.length,0);
  assert.equal((await llamar(env,ruta,"POST",b,cita)).status,201);
  assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud:ganadora.solicitud,esperado:"pendiente",destino:"atendida"})).status,409);
  assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud:ganadora.solicitud,esperado:"pendiente",destino:"cancelada"})).status,200);
  assert.equal((await llamar(env,ruta,"POST",a,perdedora)).status,201);
  assert.equal((await (await llamar(env,ruta,"GET",a)).json()).citas.length,2);
  env.DEMO_DB.sql.exec("DELETE FROM demo_sesiones");assert.equal(env.DEMO_DB.sql.prepare("SELECT count(*) AS n FROM demo_citas").get().n,0);
  env.DEMO_DB.sql.exec("DROP TABLE demo_citas");
  const ctx=await (await llamar(env,"/api/demo/contexto?negocio=barberia-elite&plan=p2")).json();
  assert.equal(ctx.citasConfiguradas,false);assert.equal(ctx.pedidosConfigurados,true);
});

test("reservaciones: capacidad, exclusión de intervalos, aislamiento y cancelación",async()=>{
 const env=envDemo(),ruta="/api/demo/reservaciones?negocio=taqueria-el-comal&plan=p4",a=await iniciar(env,"192.0.2.1"),b=await iniciar(env,"192.0.2.2");
 let fecha=sumarDias(relojLocal().fecha,1);if(new Date(fecha+"T00:00:00Z").getUTCDay()===1)fecha=sumarDias(fecha,1);
 const d={solicitud:"b7a48289-b63a-4ec4-8e19-c376f91aef77",fecha,personas:4,mesa:"3",inicio:720,datosCliente:{cliente:"cliente-1",nota:""}};
 const otro={...d,solicitud:"b7a48289-b63a-4ec4-8e19-c376f91aef78",inicio:750};
 assert.equal((await llamar(env,ruta,"GET")).status,401);
 assert.equal((await llamar(env,ruta.replace("p4","p1"),"POST",a,d)).status,403);
 assert.equal((await llamar(env,ruta,"POST",a,{...d,mesa:"1"})).status,409);
 const [x,y]=await Promise.all([llamar(env,ruta,"POST",a,d),llamar(env,ruta,"POST",a,otro)]);
 assert.deepEqual([x.status,y.status].sort(),[201,409]);
 const gana=x.status===201?d:otro,pierde=x.status===201?otro:d;
 assert.equal((await (await llamar(env,ruta,"POST",a,gana)).json()).repetida,true);
 assert.equal((await (await llamar(env,ruta,"GET",b)).json()).reservas.length,0);
 assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud:gana.solicitud,esperado:"pendiente",destino:"cancelada"})).status,200);
 assert.equal((await llamar(env,ruta,"POST",a,pierde)).status,201);
 env.DEMO_DB.sql.exec("DELETE FROM demo_sesiones");assert.equal(env.DEMO_DB.sql.prepare("SELECT count(*) AS n FROM demo_reservaciones").get().n,0);
});

test("cobros: conciliación, folio único activo, conflictos e aislamiento",async()=>{
 const env=envDemo(),ruta="/api/demo/pedidos?negocio=taqueria-el-comal&plan=p4",a=await iniciar(env,"192.0.2.1"),b=await iniciar(env,"192.0.2.2");
 const solicitud="b7a48289-b63a-4ec4-8e19-c376f91aef77",otro="b7a48289-b63a-4ec4-8e19-c376f91aef78";
 const pedido={solicitud,catalogo:"original",modalidad:"recoger",lineas:[{id:"pastor",cantidad:5,precioEsperado:2500}],totalEsperado:12500};
 for(const id of [solicitud,otro])assert.equal((await llamar(env,ruta,"POST",a,{...pedido,solicitud:id})).status,201);
 const patch=(id,cobro,cookie=a)=>llamar(env,ruta,"PATCH",cookie,{solicitud:id,cobro});
 const pagar={accion:"registrar",revision:0,totalEsperado:12500,metodo:"transferencia",recibidoCentavos:12500,referencia:"DEMO-123456"};
 assert.equal((await patch(solicitud,pagar,b)).status,404);
 assert.equal((await patch(solicitud,{...pagar,recibidoCentavos:12499})).status,409);
 const resultados=await Promise.all([patch(solicitud,pagar),patch(otro,pagar)]);
 assert.deepEqual(resultados.map(x=>x.status).sort(),[200,409]);
 const ganador=resultados[0].status===200?solicitud:otro;
 assert.equal((await patch(ganador,pagar)).status,409);
 assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud:ganador,esperado:"recibido",destino:"cancelado"})).status,409);
 assert.equal((await patch(ganador,{accion:"anular",revision:1,motivo:"Método incorrecto"})).status,200);
 for(const [esperado,destino] of [["recibido","preparando"],["preparando","listo"]])assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud:ganador,esperado,destino})).status,200);
 assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud:ganador,esperado:"listo",destino:"entregado"})).status,409);
 assert.equal((await patch(ganador,{...pagar,revision:2,metodo:"efectivo",recibidoCentavos:15000})).status,200);
 assert.equal((await llamar(env,ruta,"PATCH",a,{solicitud:ganador,esperado:"listo",destino:"entregado"})).status,200);
 assert.equal((await patch(ganador,{accion:"anular",revision:3,motivo:"Importe incorrecto"})).status,409);
 const p=(await (await llamar(env,ruta,"GET",a)).json()).pedidos.find(p=>p.solicitud===ganador);assert.equal(p.historialCobros.length,3);assert.equal(p.cobro.cambioCentavos,2500);
});

test("cuentas abiertas: aislamiento, ocupación, comandas, entrega y cierre",async()=>{
 const env=envDemo(),cuentas="/api/demo/cuentas?negocio=taqueria-el-comal&plan=p4",pedidos="/api/demo/pedidos?negocio=taqueria-el-comal&plan=p4",a=await iniciar(env,"192.0.2.1"),b=await iniciar(env,"192.0.2.2");
 const cuenta="b7a48289-b63a-4ec4-8e19-c376f91aef77",otra="b7a48289-b63a-4ec4-8e19-c376f91aef78",solicitud="b7a48289-b63a-4ec4-8e19-c376f91aef79";
 const abrir={cuenta,mesa:"3",personas:4};
 assert.equal((await llamar(env,cuentas.replace("p4","p2"),"POST",a,abrir)).status,403);
 assert.equal((await llamar(env,cuentas,"POST",a,abrir)).status,201);
 assert.equal((await llamar(env,cuentas,"POST",a,abrir)).status,200);
 assert.equal((await llamar(env,cuentas,"POST",a,{...abrir,cuenta:otra})).status,409);
 assert.equal((await (await llamar(env,cuentas,"GET",b)).json()).cuentas.length,0);
 const d={cuenta,captura:"mesero",solicitud,catalogo:"original",modalidad:"local",lineas:[{id:"pastor",cantidad:5,precioEsperado:2500}],totalEsperado:12500,datosCliente:{cliente:"cliente-1",pago:"efectivo",mesa:"3",nota:""}};
 assert.equal((await llamar(env,pedidos,"POST",b,d)).status,409);
 assert.equal((await llamar(env,pedidos,"POST",a,{...d,datosCliente:{...d.datosCliente,mesa:"2"}})).status,409);
 assert.equal((await llamar(env,pedidos,"POST",a,d)).status,201);
 assert.equal((await llamar(env,cuentas,"PATCH",a,{cuenta,accion:"cerrar"})).status,409);
 for(const [esperado,destino] of [["recibido","preparando"],["preparando","listo"],["listo","entregado"]])assert.equal((await llamar(env,pedidos,"PATCH",a,{solicitud,esperado,destino})).status,200);
 assert.equal((await llamar(env,cuentas,"PATCH",a,{cuenta,accion:"cerrar"})).status,409);
 assert.equal((await llamar(env,pedidos,"PATCH",a,{solicitud,cobro:{accion:"registrar",revision:0,totalEsperado:12500,metodo:"efectivo",recibidoCentavos:12500}})).status,200);
 assert.equal((await llamar(env,cuentas,"PATCH",a,{cuenta,accion:"cerrar"})).status,200);
 assert.equal((await llamar(env,pedidos,"POST",a,{...d,solicitud:otra})).status,409);
 assert.equal((await llamar(env,pedidos,"POST",a,d)).status,200);
 assert.equal((await llamar(env,pedidos,"PATCH",a,{solicitud,cobro:{accion:"anular",revision:1,motivo:"Importe incorrecto"}})).status,409);
 assert.equal((await llamar(env,cuentas,"POST",a,{...abrir,cuenta:otra})).status,201);
});

test("cobro acumulado atómico, anulación conjunta y folio de terminal externa",async()=>{
 const env=envDemo(),cuentas="/api/demo/cuentas?negocio=taqueria-el-comal&plan=p4",pedidos="/api/demo/pedidos?negocio=taqueria-el-comal&plan=p4",a=await iniciar(env,"192.0.2.1");
 const uid=n=>"b7a48289-b63a-4ec4-8e19-c376f91aef"+n,cuenta=uid("70"),ids=[uid("71"),uid("72")];
 assert.equal((await llamar(env,cuentas,"POST",a,{cuenta,mesa:"3",personas:4})).status,201);
 for(const solicitud of ids){
  assert.equal((await llamar(env,pedidos,"POST",a,{cuenta,captura:"mesero",solicitud,catalogo:"original",modalidad:"local",lineas:[{id:"pastor",cantidad:2,precioEsperado:2500}],totalEsperado:5000,datosCliente:{cliente:"cliente-1",pago:"efectivo",mesa:"3",nota:""}})).status,201);
  for(const [esperado,destino] of [["recibido","preparando"],["preparando","listo"],["listo","entregado"]])assert.equal((await llamar(env,pedidos,"PATCH",a,{solicitud,esperado,destino})).status,200);
 }
 const leer=async()=>(await (await llamar(env,pedidos,"GET",a)).json()).pedidos.filter(p=>p.cuenta===cuenta);
 const version=ps=>JSON.stringify(ps.map(p=>[p.solicitud,p.estado,p.total,p.revisionCobro??0]).sort((a,b)=>a[0].localeCompare(b[0])));
 const d={cuenta,accion:"cobrar",operacion:uid("73"),version:version(await leer()),totalEsperado:10000,metodo:"efectivo",recibidoCentavos:15000};
 assert.equal((await llamar(env,cuentas,"PATCH",a,d)).status,200);
 let ps=await leer();assert.equal(ps.reduce((s,p)=>s+p.cobro.importeCentavos,0),10000);assert.equal(ps.reduce((s,p)=>s+p.cobro.cambioCentavos,0),5000);
 assert.equal((await llamar(env,cuentas,"PATCH",a,d)).status,409);
 assert.equal((await llamar(env,pedidos,"PATCH",a,{solicitud:ids[0],cobro:{accion:"anular",revision:1,motivo:"Método incorrecto"}})).status,409);
 assert.equal((await llamar(env,cuentas,"PATCH",a,{cuenta,accion:"anular_cobro",operacion:uid("74"),grupo:d.operacion,version:version(ps),motivo:"Método incorrecto"})).status,200);
 ps=await leer();assert.ok(ps.every(p=>!p.cobro));
 assert.equal((await llamar(env,cuentas,"PATCH",a,{...d,operacion:uid("75"),version:version(ps),metodo:"tarjeta_externa",recibidoCentavos:10000,referencia:"DEMO-123456"})).status,200);
 assert.equal((await llamar(env,cuentas,"PATCH",a,{cuenta,accion:"cerrar"})).status,200);
});
