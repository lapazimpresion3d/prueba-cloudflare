import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {crearNucleoComercial,rolesIniciales} from "../src/nucleo-comercial.mjs";
async function fixture(){
 const sql=new DatabaseSync(":memory:");sql.exec("PRAGMA foreign_keys=ON");sql.exec(readFileSync(new URL("../migrations-comercios/0001_identidad.sql",import.meta.url),"utf8"));
 sql.exec("INSERT INTO empresas(id,nombre) VALUES('a','A'),('b','B'); INSERT INTO sucursales(empresa,id,nombre) VALUES('a','s1','Uno'),('a','s2','Dos'),('b','s1','Otra'); INSERT INTO usuarios(id,emisor,sujeto) VALUES('u1','issuer','owner'),('u2','issuer','cashier'); INSERT INTO roles VALUES('a','owner','Owner'),('a','cashier','Cashier'),('b','owner','Owner'); INSERT INTO membresias VALUES('a','u1','owner',1,'empresa'),('a','u2','cashier',1,'sucursales'); INSERT INTO membresia_sucursales VALUES('a','u2','s1');");
 for(const [rol,lista] of [["owner",rolesIniciales.propietario],["cashier",rolesIniciales.cajero]])for(const p of lista)sql.prepare("INSERT INTO rol_permisos VALUES('a',?,?)").run(rol,p);
 const db={prepare(q){return {first:async()=>sql.prepare(q).get()??null,bind(...a){return {first:async()=>sql.prepare(q).get(...a)??null}}}}};
 const auth=async request=>request==="owner"||request==="cashier"?{emisor:"issuer",sujeto:request}:null;
 const n=await crearNucleoComercial({COMMERCE_DB:db},{autenticar:auth});
 return {sql,db,n,auth};
}
test("propietario autorizado y cajero sin permisos financieros",async()=>{const {n}=await fixture();assert.equal((await n.autorizar("owner",{empresa:"a",permiso:"proveedores.administrar"})).actor,"u1");await assert.rejects(n.autorizar("cashier",{empresa:"a",permiso:"proveedores.administrar"}));});
test("aislamiento entre empresas y sucursales",async()=>{const {n}=await fixture();await n.autorizar("cashier",{empresa:"a",sucursal:"s1",permiso:"pos.operar"});for(const q of [{empresa:"a",sucursal:"s2"},{empresa:"b",sucursal:"s1"},{empresa:"a"}])await assert.rejects(n.autorizar("cashier",{...q,permiso:"pos.operar"}));await assert.rejects(n.autorizar("owner",{empresa:"b",permiso:"empresa.ver"}));});
test("identidad no autenticada y permiso desconocido rechazados",async()=>{const {n}=await fixture();await assert.rejects(n.autorizar("anonymous",{empresa:"a",permiso:"empresa.ver"}));await assert.rejects(n.autorizar("owner",{empresa:"a",permiso:"root"}));});
test("desactivación de usuario, membresía y sucursal efectiva inmediatamente",async()=>{const {n,sql}=await fixture();const q={empresa:"a",sucursal:"s1",permiso:"pos.operar"};for(const [off,on] of [["UPDATE usuarios SET activo=0 WHERE id='u2'","UPDATE usuarios SET activo=1 WHERE id='u2'"],["UPDATE membresias SET activa=0 WHERE usuario='u2'","UPDATE membresias SET activa=1 WHERE usuario='u2'"],["UPDATE sucursales SET activa=0 WHERE empresa='a' AND id='s1'","UPDATE sucursales SET activa=1 WHERE empresa='a' AND id='s1'"],["UPDATE empresas SET activa=0 WHERE id='a'","UPDATE empresas SET activa=1 WHERE id='a'"]]){sql.exec(off);await assert.rejects(n.autorizar("cashier",q));sql.exec(on);await n.autorizar("cashier",q);}});
test("esquema y base separados, claves foráneas por empresa",async()=>{const {db,auth,sql}=await fixture();await assert.rejects(crearNucleoComercial({COMMERCE_DB:db,DEMO_DB:db},{autenticar:auth}));assert.throws(()=>sql.exec("INSERT INTO membresia_sucursales VALUES('b','u2','s1')"));assert.deepEqual(sql.prepare("PRAGMA foreign_key_check").all(),[]);});

test("empresa.ver permite consultar solo sucursal autorizada, no administrar",async()=>{const {n,sql}=await fixture();assert.equal((await n.autorizar("cashier",{empresa:"a",sucursal:"s1",permiso:"empresa.ver"})).actor,"u2");for(const q of [{empresa:"a",sucursal:"s2"},{empresa:"b",sucursal:"s1"},{empresa:"a"}])await assert.rejects(n.autorizar("cashier",{...q,permiso:"empresa.ver"}));await assert.rejects(n.autorizar("owner",{empresa:"a",sucursal:"s1",permiso:"empresa.administrar"}));sql.exec("UPDATE sucursales SET activa=0 WHERE empresa='a' AND id='s1'");await assert.rejects(n.autorizar("cashier",{empresa:"a",sucursal:"s1",permiso:"empresa.ver"}));});
