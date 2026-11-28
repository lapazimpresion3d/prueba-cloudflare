import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync,readdirSync} from "node:fs";
import {crearSeguridadCentral} from "../src/seguridad-central.mjs";
import {crearAuditoriaCentral} from "../src/auditoria-central.mjs";
import {crearRutasCentral} from "../src/rutas-http-central.mjs";
import {rolesCentral} from "../src/permisos-central.mjs";
const origen="https://central.invalid",n=1000000;
async function fixture(){
 const sql=new DatabaseSync(":memory:");sql.exec("PRAGMA foreign_keys=ON");
 const dir=new URL("../migrations-comercios/",import.meta.url);for(const f of readdirSync(dir).filter(x=>x.endsWith(".sql")).sort())sql.exec(readFileSync(new URL(f,dir),"utf8"));
 const tokens={};let k=0;
 for(const rol of Object.keys(rolesCentral)){const t=String(++k).repeat(64);tokens[rol]=t;const h=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");sql.prepare("INSERT INTO central_operadores(id,emisor,sujeto,rol) VALUES(?,'issuer',?,?)").run(rol,rol,rol);sql.prepare("INSERT INTO central_sesiones(hash,operador,creado,expira,ultima) VALUES(?,?,?,?,?)").run(h,rol,n-1,n+10000,n);}
 const db={prepare(q){const bind=(...a)=>({q,a,first:async()=>sql.prepare(q).get(...a)??null,all:async()=>({results:sql.prepare(q).all(...a)}),run:async()=>sql.prepare(q).run(...a)});return {...bind(),bind};},async batch(stm){sql.exec("BEGIN");try{const r=stm.map(({q,a})=>({results:sql.prepare(q).all(...a)}));sql.exec("COMMIT");return r}catch(e){sql.exec("ROLLBACK");throw e}}};
 const autenticarCentral=async r=>{const t=r.headers.get("Cookie")?.split("=")[1],rol=Object.keys(tokens).find(k=>tokens[k]===t);return rol?{emisor:"issuer",sujeto:rol}:null;};
 const opts={habilitado:true,autenticarCentral,reloj:()=>n},env={COMMERCE_DB:db};
 const seguridad=await crearSeguridadCentral(env,opts),auditoria=await crearAuditoriaCentral(env,{...opts,exportaciones:{}});
 const req=(rol,p,d)=>new Request(origen+"/interno/central"+p,{headers:{Cookie:"__Host-lapaz-central="+tokens[rol],...(d?{Origin:origen,"Content-Type":"application/json"}:{})},...(d?{method:"POST",body:JSON.stringify(d)}:{})});
 return {sql,env,opts,seguridad,auditoria,req,autenticarCentral};
}
test("roles reales en SQLite restringen navegación, operaciones y sesiones revocadas",async()=>{const x=await fixture();try{
 const h=crearRutasCentral({habilitado:true,origen,acceso:{autenticarCentral:x.autenticarCentral,cerrar:async()=>({cookie:""})},seguridad:x.seguridad,auditoria});
 for(const [rol,permisos] of Object.entries(rolesCentral)){const r=await h(x.req(rol,"/navegacion"));assert.equal(r.status,200);assert.deepEqual((await r.json()).secciones.map(s=>s.id).sort(),permisos.filter(p=>!p.includes(".")).sort());}
 assert.equal((await h(x.req("consulta","/operadores"))).status,403);
 assert.equal((await h(x.req("comercial","/auditoria-datos"))).status,403);
 const cambio={id:"consulta",rol:"comercial",activo:1,motivo:"Prueba de regresión",confirmacion:"CAMBIAR:consulta"};
 assert.equal((await h(x.req("consulta","/operadores-cambiar",cambio))).status,403);
 assert.equal((await h(x.req("administrador","/operadores-cambiar",cambio))).status,200);
 assert.equal(x.sql.prepare("SELECT rol FROM central_operadores WHERE id='consulta'").get().rol,"comercial");
 assert.equal((await h(x.req("consulta","/navegacion"))).status,403);
 assert.equal(x.sql.prepare("SELECT count(*) n FROM central_auditoria WHERE accion='operador.cambio'").get().n,1);
 await assert.rejects(x.seguridad.cambiar(x.req("administrador","/operadores-cambiar",{...cambio,id:"administrador",confirmacion:"CAMBIAR:administrador"}),{...cambio,id:"administrador",confirmacion:"CAMBIAR:administrador"}));
 }finally{x.sql.close();}});
test("auditoría real pagina sin duplicados y omite campos privados",async()=>{const x=await fixture();try{
 const ins=x.sql.prepare("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,posterior) VALUES('administrador',NULL,'prueba','privado',?,?)");
 for(let i=0;i<52;i++)ins.run(n+i,JSON.stringify({estado:"activa",token:"secreto",motivo:"privado"}));
 const r=x.req("administrador","/auditoria-datos"),a=await x.auditoria.listar(r,{accion:"prueba"});assert.equal(a.items.length,50);assert.ok(a.antes!==null);
 const b=await x.auditoria.listar(r,{accion:"prueba",antes:a.antes});assert.equal(b.items.length,2);assert.equal(new Set([...a.items,...b.items].map(x=>x.id)).size,52);assert.equal(b.antes,null);assert.deepEqual(a.items[0].posterior,{estado:"activa"});assert.equal(Object.hasOwn(a.items[0],"objetivo"),false);
 await assert.rejects(x.auditoria.listar(x.req("consulta","/auditoria-datos")));
 }finally{x.sql.close();}});
test("servicios centrales rechazan binding compartido con demo",async()=>{const x=await fixture();try{await assert.rejects(crearSeguridadCentral({...x.env,DEMO_DB:x.env.COMMERCE_DB},x.opts));await assert.rejects(crearAuditoriaCentral({...x.env,DB:x.env.COMMERCE_DB},{...x.opts,exportaciones:{}}));}finally{x.sql.close();}});
