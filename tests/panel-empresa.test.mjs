import test from "node:test";
import assert from "node:assert/strict";
import {contextoEmpresa,almacenEmpresa} from "../public/demostraciones/empresa-practica.mjs";
import {establecimientos} from "../public/demostraciones/establecimientos.mjs";
import {planes,capacidades} from "../public/demostraciones/config.mjs";
import {crearPanelPrivado} from "../src/panel-empresa-privado.mjs";
test("20 contextos y capacidades sin duplicar matriz",()=>{
 const claves=new Set();
 for(const e of establecimientos)for(const p of planes){const c=contextoEmpresa(e.id,p.id);claves.add(c.clave);assert.deepEqual(c.modulos,capacidades(e,p.id));}
 assert.equal(claves.size,20);assert.throws(()=>contextoEmpresa("otro","p1"));assert.throws(()=>contextoEmpresa(establecimientos[0].id,"p9"));
});
test("aislamiento, límites y restauración",()=>{
 const m=new Map(),s={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 const c=contextoEmpresa("taqueria-el-comal","p4"),a=almacenEmpresa(c,s),b=almacenEmpresa(contextoEmpresa("taqueria-el-comal","p1"),s),d=almacenEmpresa(contextoEmpresa("cafe-mirador","p4"),s);
 a.guardar({sucursal:3,personal:["propietario","cajero"]});assert.equal(a.leer().sucursal,3);assert.equal(b.leer().sucursal,1);assert.equal(d.leer().sucursal,1);
 assert.throws(()=>b.guardar({sucursal:2,personal:["propietario"]}));assert.throws(()=>a.guardar({sucursal:1,personal:["propietario","propietario"]}));
 d.guardar({sucursal:2,personal:["propietario"]});a.restaurar();assert.equal(d.leer().sucursal,2);assert.equal(a.leer().sucursal,1);m.set(c.clave,"{");assert.equal(a.leer().sucursal,1);
 assert.throws(()=>almacenEmpresa(c,null).guardar({sucursal:1,personal:["propietario"]}));
});
test("panel privado cerrado por defecto y control de vigencia",async()=>{
 const r=new Request("https://example.test/"),sesiones={autenticar:async()=>({actor:"real"})},nucleo={autorizar:async(_,c)=>{assert.equal(c.permiso,"empresa.ver");assert.equal(c.empresa,"a");}},suscripciones={consultar:async()=>({vigente:false})};
 await assert.rejects(crearPanelPrivado({sesiones,nucleo,suscripciones})(r,"a"),/deshabilitado/);
 await assert.rejects(crearPanelPrivado({sesiones,nucleo,suscripciones,habilitado:true})(r,"a"),/vigente/);
 await assert.rejects(crearPanelPrivado({sesiones:{autenticar:async()=>null},nucleo,suscripciones,habilitado:true})(r,"a"),/Autenticación/);
 const f=crearPanelPrivado({sesiones,nucleo,suscripciones:{consultar:async()=>({vigente:true,plan:"p1",estado:"prueba",usuarios:1,sucursales:1})},habilitado:true});assert.equal((await f(r,"a")).plan,"p1");
});
