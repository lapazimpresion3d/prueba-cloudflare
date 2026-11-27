import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {crearSesionesComerciales} from "../src/sesiones-comerciales.mjs";
async function fixture(habilitado=true){
 const sql=new DatabaseSync(":memory:");sql.exec("PRAGMA foreign_keys=ON");
 for(const f of ["0001_identidad.sql","0002_sesiones.sql"])sql.exec(readFileSync(new URL("../migrations-comercios/"+f,import.meta.url),"utf8"));
 sql.exec("INSERT INTO usuarios(id,emisor,sujeto) VALUES('u1','issuer','owner'),('u2','issuer','cashier')");
 const db={prepare(q){return {first:async()=>sql.prepare(q).get()??null,bind(...a){return {first:async()=>sql.prepare(q).get(...a)??null,run:async()=>sql.prepare(q).run(...a)}}}}};
 let now=100000000;const s=await crearSesionesComerciales({COMMERCE_DB:db},{habilitado,reloj:()=>now,verificarIdentidad:async r=>({emisor:"issuer",sujeto:r.headers.get("X-Test-Subject")||"owner",emailVerified:r.headers.get("X-Test-Verified")!=="no"})});
 const req=(cookie="",headers={})=>new Request("https://example.com/comercial",{method:"POST",headers:{Origin:"https://example.com",Cookie:cookie,...headers}});
 const login=async()=>{const r=await s.iniciar(req());return r.cookie.split(";")[0];};
 return {sql,s,req,login,avanzar:n=>now+=n};
}
test("sesiones deshabilitadas y correo no verificado",async()=>{const a=await fixture(false);await assert.rejects(a.s.iniciar(a.req()));const b=await fixture();await assert.rejects(b.s.iniciar(b.req("",{"X-Test-Verified":"no"})));await assert.rejects(b.s.iniciar(b.req("",{"X-Test-Subject":"unknown"})));});
test("cookie segura, hash y aislamiento de demo",async()=>{const {sql,s,req}=await fixture();const r=await s.iniciar(req());assert.match(r.cookie,/Secure; HttpOnly; SameSite=Strict/);const c=r.cookie.split(";")[0];assert.notEqual(sql.prepare("SELECT hash FROM comercio_sesiones").get().hash,c.split("=")[1]);assert.equal((await s.autenticar(req(c))).actor,"u1");assert.equal(await s.autenticar(req(c.replace("__Host-lapaz-comercial","__Host-lapaz-demo"))),null);assert.equal(await s.autenticar(req(c+"; "+c)),null);});
test("inactividad y duración máxima",async()=>{const a=await fixture(),c=await a.login();a.avanzar(30*60000);assert.equal(await a.s.autenticar(a.req(c)),null);const b=await fixture(),d=await b.login();for(let i=0;i<16;i++){b.avanzar(29*60000);assert.ok(await b.s.autenticar(b.req(d)));}b.avanzar(16*60000);assert.equal(await b.s.autenticar(b.req(d)),null);});
test("revocación individual, global y origen",async()=>{const {s,req,login,sql}=await fixture();const a=await login(),b=await login();await assert.rejects(s.cerrar(req(a,{Origin:"https://otro.example"})));await s.cerrar(req(a));assert.equal(await s.autenticar(req(a)),null);assert.ok(await s.autenticar(req(b)));const c=await login();await s.revocarTodas(req(b));assert.equal(await s.autenticar(req(c)),null);assert.equal(await s.autenticar(req(b)),null);assert.equal(sql.prepare("SELECT count(*) n FROM comercio_sesion_eventos WHERE evento='revocacion'").get().n,3);});
test("desactivación de usuario invalida acceso",async()=>{const {sql,s,req,login}=await fixture();const c=await login();sql.exec("UPDATE usuarios SET activo=0 WHERE id='u1'");assert.equal(await s.autenticar(req(c)),null);await assert.rejects(s.iniciar(req()));});

 test("inicio de sesión exige POST y origen exacto antes de emitir cookie",async()=>{const {s,req,sql}=await fixture();for(const r of [new Request("https://example.com/comercial"),req("",{Origin:"https://otro.example"}),new Request("https://example.com/comercial",{method:"POST"}),req("",{Origin:"null"})])await assert.rejects(s.iniciar(r),/Origen no permitido/);assert.equal(sql.prepare("SELECT count(*) n FROM comercio_sesiones").get().n,0);await s.iniciar(req());assert.equal(sql.prepare("SELECT count(*) n FROM comercio_sesiones").get().n,1);});
