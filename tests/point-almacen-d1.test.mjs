import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {crearAlmacenProveedores} from "../src/point-almacen-d1.mjs";
const cifrado={version:1,iv:"ficticio",datos:"ficticio"};
function fixture(){
 const sql=new DatabaseSync(":memory:");
 sql.exec(readFileSync(new URL("../migrations-proveedores/0001_credenciales.sql",import.meta.url),"utf8"));
 const db={prepare(q){return {first:async()=>sql.prepare(q).get()??null,bind(...a){return {first:async()=>sql.prepare(q).get(...a)??null,run:async()=>sql.prepare(q).run(...a)}}}}};
 return {sql,db};
}
test("aislamiento de base",async()=>{const {db}=fixture();await assert.rejects(crearAlmacenProveedores({PROVIDER_DB:db,DEMO_DB:db}));});
test("estado OAuth consumo único y aislamiento",async()=>{const {db}=fixture(),a=await crearAlmacenProveedores({PROVIDER_DB:db}),e={hash:"a".repeat(64),comercio:"a",entorno:"prueba",actor:"admin",expira:1000,cifrado};await a.crearEstado(e);assert.equal(await a.consumirEstado({...e,actor:"otro",ahora:100}),null);assert.equal(await a.consumirEstado({...e,ahora:1000}),null);const r=await Promise.all([a.consumirEstado({...e,ahora:100}),a.consumirEstado({...e,ahora:100})]);assert.equal(r.filter(Boolean).length,1);});
test("reserva única, revisión y rotación",async()=>{const {db}=fixture(),a=await crearAlmacenProveedores({PROVIDER_DB:db});const r=await Promise.all([a.reservar("a","prueba"),a.reservar("a","prueba")]);assert.equal(r.filter(Boolean).length,1);const l=r.find(Boolean);await a.confirmar(l,{vendedor:"1",expira:Date.now()+10000,cifrado});await assert.rejects(a.confirmar(l,{vendedor:"1",expira:1,cifrado}));const n=await a.reservar("a","prueba");assert.equal(n.vendedor,"1");await assert.rejects(a.confirmar(n,{vendedor:"2",expira:1,cifrado}));await a.marcarIncierto(n);assert.equal(await a.reservar("a","prueba"),null);assert.ok(await a.reservar("a","produccion"));});
test("desvinculación local elimina credenciales y conserva auditoría",async()=>{const {db,sql}=fixture(),a=await crearAlmacenProveedores({PROVIDER_DB:db});const l=await a.reservar("a","prueba");await a.confirmar(l,{vendedor:"1",expira:1,cifrado});const e=await a.estado("a","prueba");assert.equal(e.expirado,true);assert.equal(Object.hasOwn(e,"cifrado"),false);await a.desvincularLocal("a","prueba",e.revision);assert.equal((await a.estado("a","prueba")).estado,"desvinculado");assert.equal(sql.prepare("SELECT cifrado FROM proveedor_credenciales").get().cifrado,null);assert.ok(sql.prepare("SELECT count(*) n FROM proveedor_eventos").get().n>=2);});
