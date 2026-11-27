import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {crearGestorSuscripciones,catalogoInicial} from "../src/suscripciones-comerciales.mjs";
async function fixture(){
 const sql=new DatabaseSync(":memory:");sql.exec("PRAGMA foreign_keys=ON");
 for(const f of ["0001_identidad.sql","0002_sesiones.sql","0003_altas.sql","0004_administracion.sql","0005_suscripciones.sql"])sql.exec(readFileSync(new URL("../migrations-comercios/"+f,import.meta.url),"utf8"));
 sql.exec("INSERT INTO empresas(id,nombre) VALUES('a','A'),('b','B'); INSERT INTO sucursales(empresa,id,nombre) VALUES('a','s','Centro')");
 const db={prepare(q){return {first:async()=>sql.prepare(q).get()??null,bind(...a){return {q,a,first:async()=>sql.prepare(q).get(...a)??null}}}},async batch(stm){sql.exec("BEGIN");try{const r=stm.map(({q,a})=>sql.prepare(q).run(...a));sql.exec("COMMIT");return r}catch(e){sql.exec("ROLLBACK");throw e}}};
 let now=1000;
 const g=await crearGestorSuscripciones({COMMERCE_DB:db},{habilitado:true,reloj:()=>now,modulosOperativos:["web","pos"],autorizarOperador:async r=>r.headers.get("X-Test")==="operador",autorizarComercial:async(r,d)=>{if(r.headers.get("X-Test")!=="cliente"||d.empresa!=="a")throw Error("Denegado");return {actor:"u",empresa:d.empresa};}});
 const req=t=>new Request("https://example.com/suscripciones",{method:"POST",headers:{Origin:"https://example.com","X-Test":t}});
 await g.inicializar(req("operador"));
 return {g,sql,op:req("operador"),cliente:req("cliente"),avanzar:n=>now+=n,d:{empresa:"a",plan:"p1",version:1,revision:0,estado:"activa",inicio:1000,vence:2000}};
}
test("catálogo contractual histórico v1 conserva sus tarifas y es inmutable",async()=>{const {sql}=await fixture();assert.equal(catalogoInicial.length,4);assert.equal(sql.prepare("SELECT mensualidad FROM comercial_planes WHERE id='p4'").get().mensualidad,64900);assert.throws(()=>sql.exec("UPDATE comercial_planes SET mensualidad=0"));});
test("solo operador contrata; acceso comercial aislado",async()=>{const {g,op,cliente,d}=await fixture();await assert.rejects(g.contratar(cliente,d));await g.contratar(op,d);assert.equal((await g.consultar(cliente,"a")).vigente,true);await assert.rejects(g.consultar(cliente,"b"));});
test("plan, permiso, disponibilidad y vigencia se verifican",async()=>{const {g,op,cliente,d,avanzar}=await fixture();await g.contratar(op,d);const q={empresa:"a",permiso:"empresa.ver",modulo:"web"};await g.autorizarModulo(cliente,q);await assert.rejects(g.autorizarModulo(cliente,{...q,modulo:"pos"}));await assert.rejects(g.autorizarModulo(cliente,{...q,modulo:"catalogo"}));avanzar(1000);await assert.rejects(g.autorizarModulo(cliente,q));});
test("cambio de plan usa revisión e historial; suspensión bloquea",async()=>{const {g,sql,op,cliente,d}=await fixture();await g.contratar(op,d);await g.contratar(op,{...d,plan:"p3",revision:1});await assert.rejects(g.contratar(op,{...d,revision:1}));await g.contratar(op,{...d,plan:"p3",revision:2,estado:"suspendida"});assert.equal((await g.consultar(cliente,"a")).vigente,false);assert.equal(sql.prepare("SELECT count(*) n FROM comercial_suscripcion_historial").get().n,3);});
test("reducción de plan rechaza exceso de sucursales",async()=>{const {g,sql,op,d}=await fixture();await g.contratar(op,{...d,plan:"p3"});sql.exec("INSERT INTO sucursales(empresa,id,nombre) VALUES('a','s2','Norte')");await assert.rejects(g.contratar(op,{...d,revision:1}));});
