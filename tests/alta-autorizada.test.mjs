import test from "node:test";import assert from "node:assert/strict";import {DatabaseSync} from "node:sqlite";import {readFileSync,readdirSync} from "node:fs";import {crearAltaAutorizada} from "../src/alta-autorizada.mjs";
async function fixture(){const sql=new DatabaseSync(":memory:");sql.exec("PRAGMA foreign_keys=ON");const dir=new URL("../migrations-comercios/",import.meta.url);for(const f of readdirSync(dir).filter(x=>x.endsWith(".sql")).sort())sql.exec(readFileSync(new URL(f,dir),"utf8"));const token="a".repeat(64),h=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))).toString("hex");sql.exec("INSERT INTO central_operadores(id,emisor,sujeto) VALUES('op','issuer','central'); INSERT INTO comercial_planes VALUES('p1',1,'P1',75000,14900,'MXN',1,1,'[]');");sql.prepare("INSERT INTO central_sesiones(hash,operador,creado,expira,ultima) VALUES(?,'op',1,999999,1)").run(h);const db={prepare(q){return {first:async()=>sql.prepare(q).get(),bind(...a){return {q,a,first:async()=>sql.prepare(q).get(...a)}}}},async batch(stm){sql.exec("BEGIN");try{const r=stm.map(({q,a})=>({results:sql.prepare(q).all(...a)}));sql.exec("COMMIT");return r}catch(e){sql.exec("ROLLBACK");throw e}}};let sujeto="owner";const a=await crearAltaAutorizada({COMMERCE_DB:db},{habilitado:true,reloj:()=>1000,autenticarCentral:async()=>({emisor:"issuer",sujeto:"central"}),verificarPropietario:async()=>({emisor:"issuer",sujeto,emailVerified:true})});const req=(c=true)=>new Request("https://example.invalid/alta",{method:"POST",headers:{Origin:"https://example.invalid",...(c?{Cookie:"__Host-lapaz-central="+token}:{})}});return {a,sql,req,cambiar:v=>sujeto=v};}
const datos={nombre:"Tienda ejemplo",sucursal:"Principal",giro:"tienda",plan:"p1",version:1,emisor:"issuer",sujeto:"owner"};
test("alta autorizada, identidad exacta, consumo único y sin contratación automática",async()=>{const x=await fixture();await assert.rejects(x.a.preparar(x.req(false),datos));const p=await x.a.preparar(x.req(),datos);x.cambiar("other");await assert.rejects(x.a.aceptar(x.req(false),p.id));x.cambiar("owner");const r=await x.a.aceptar(x.req(false),p.id);assert.equal(r.estado,"configuracion");assert.equal(x.sql.prepare("SELECT giro FROM comercio_perfiles_privados").get().giro,"tienda");assert.equal(x.sql.prepare("SELECT rol FROM membresias").get().rol,"propietario");assert.equal(x.sql.prepare("SELECT count(*) n FROM comercial_suscripciones").get().n,0);await assert.rejects(x.a.aceptar(x.req(false),p.id));assert.equal(x.sql.prepare("SELECT count(*) n FROM empresas").get().n,1);});
test("revocación central y propietario desactivado impiden alta",async()=>{const x=await fixture();const p=await x.a.preparar(x.req(),datos);x.sql.exec("INSERT INTO usuarios(id,emisor,sujeto,activo) VALUES('u','issuer','owner',0)");await assert.rejects(x.a.aceptar(x.req(false),p.id));assert.equal(x.sql.prepare("SELECT count(*) n FROM empresas").get().n,0);x.sql.exec("UPDATE central_sesiones SET revocado=1000");await assert.rejects(x.a.preparar(x.req(),datos));});

async function altaProspecto(x){
 const token="b".repeat(64),h=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))).toString("hex");
 x.sql.prepare("INSERT INTO comercio_prospectos_oidc VALUES(?,?,?,?,?)").run(h,"issuer","owner",1,2000);
 const {emisor,sujeto,...d}=datos;
 return x.a.prepararProspecto(x.req(),d,token);
}
test("invitación opaca, emisión única, auditoría y bloqueo de aceptación histórica",async()=>{
 const x=await fixture(),p=await altaProspecto(x);
 await assert.rejects(x.a.aceptar(x.req(false),p.id));
 await assert.rejects(x.a.emitirInvitacion(x.req(false),p.id));
 const resultados=await Promise.allSettled([x.a.emitirInvitacion(x.req(),p.id),x.a.emitirInvitacion(x.req(),p.id)]);
 assert.equal(resultados.filter(r=>r.status==="fulfilled").length,1);
 const r=resultados.find(r=>r.status==="fulfilled").value;
 assert.match(r.token,/^[a-f0-9]{64}$/);
 assert.equal(r.expira,p.expira);
 const fila=x.sql.prepare("SELECT * FROM comercio_invitaciones_propietario").get();
 assert.equal(fila.hash,Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(r.token))).toString("hex"));
 assert.equal(fila.alta,p.id);
 assert.equal(fila.consumido,null);
 assert.ok(!JSON.stringify(fila).includes(r.token));
 assert.equal(x.sql.prepare("SELECT count(*) n FROM central_auditoria WHERE accion='alta.invitacion_emitida'").get().n,1);
 assert.ok(!JSON.stringify(x.sql.prepare("SELECT * FROM central_auditoria").all()).includes(r.token));
 await assert.rejects(x.a.aceptar(x.req(false),p.id));
 assert.equal(x.sql.prepare("SELECT count(*) n FROM empresas").get().n,0);
});
test("invitación rechaza altas históricas, vencidas, canceladas y operador revocado",async()=>{
 const x=await fixture(),h=await x.a.preparar(x.req(),datos);
 await assert.rejects(x.a.emitirInvitacion(x.req(),h.id));
 const p=await altaProspecto(x);
 x.sql.prepare("UPDATE comercio_altas_pendientes SET creado=1,expira=1000 WHERE id=?").run(p.id);
 await assert.rejects(x.a.emitirInvitacion(x.req(),p.id));
 x.sql.prepare("UPDATE comercio_altas_pendientes SET expira=2000,estado='cancelada' WHERE id=?").run(p.id);
 await assert.rejects(x.a.emitirInvitacion(x.req(),p.id));
 const p2=await altaProspecto(x);
 x.sql.exec("UPDATE central_sesiones SET revocado=1000");
 await assert.rejects(x.a.emitirInvitacion(x.req(),p2.id));
 assert.equal(x.sql.prepare("SELECT count(*) n FROM comercio_invitaciones_propietario").get().n,0);
});
