import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { atenderDemo, contextoDemo, validarCatalogoDemo } from "../src/demostraciones.mjs";
import { establecimientos } from "../public/demostraciones/establecimientos.mjs";

function d1(){
  const sql=new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON;"+readFileSync(new URL("../migrations-demo/0001_practica.sql",import.meta.url),"utf8"));
  sql.exec(readFileSync(new URL("../migrations-demo/0002_perfiles.sql",import.meta.url),"utf8"));
  const wrap=(q,args=[])=>({bind:(...v)=>wrap(q,v),first:async()=>sql.prepare(q).get(...args)??null,run:async()=>sql.prepare(q).run(...args)});
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
  catalogo[0].imagen="data:image/jpeg;base64,/9j/AA==";
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:0,catalogo})).status,200);
  assert.equal((await (await llamar(env,ruta,"GET",a)).json()).catalogo[0].imagen,catalogo[0].imagen);
  assert.equal((await (await llamar(env,ruta,"GET",b)).json()).catalogo[0].imagen,original);
  catalogo[0].imagen="";
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:1,catalogo})).status,200);
  assert.equal((await (await llamar(env,ruta,"GET",a)).json()).catalogo[0].imagen,"");
  catalogo[0].imagen="https://example.invalid/x";
  assert.equal((await llamar(env,ruta,"PUT",a,{revision:2,catalogo})).status,400);
});
