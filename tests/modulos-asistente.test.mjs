import test from "node:test";
import assert from "node:assert/strict";
import {evaluarModulosAsistente} from "../src/modulos-asistente.mjs";
import {resolverRutaAsistente} from "../src/rutas-asistente.mjs";
import {catalogoInicial} from "../src/catalogo-contractual.mjs";
const perfil={pasos:{perfil:{estado_validacion:"valido"},presentacion:{estado_validacion:"valido"}}},org={pasos:{sucursales:{estado_validacion:"valido"}}};
test("guía por giro y contrato, sin confundir configuración con activación",()=>{
 for(const giro of ["restaurante","cafeteria","tienda","barberia","taller","otro"])for(const p of catalogoInicial){
  const ruta=resolverRutaAsistente({giro,contrato:{plan:p.id,version:p.version,usuarios:p.usuarios,sucursales:p.sucursales,modulos:p.modulos,seleccion:[],revision:1,revisionActivacion:0},operativos:[]});
  const v=evaluarModulosAsistente(ruta,perfil,org,"a");
  assert.deepEqual(v.modulos.map(m=>m.id),ruta.modulos.map(m=>m.id));
  assert.ok(v.modulos.every(m=>!m.habilitado&&!m.seleccionado));
  assert.equal(v.modulos.find(m=>m.id==="web").estado_validacion,"valido");
  assert.equal(v.modulos.find(m=>m.id==="catalogo").estado_configuracion,"sin_integracion");
  assert.equal(v.paso.estado_validacion,"pendiente");
 }
});
test("sin contrato no hay configuración de módulos",()=>{
 const v=evaluarModulosAsistente(resolverRutaAsistente({giro:"otro"}),perfil,org,"a");
 assert.deepEqual(v.modulos,[]);assert.equal(v.paso.estado_validacion,"pendiente");
});
test("cambios de contrato y dependencias no habilitadas",()=>{
 const p=catalogoInicial[2],contrato={plan:p.id,version:1,usuarios:p.usuarios,sucursales:p.sucursales,modulos:p.modulos,seleccion:["web","pos","caja"],estado:"activa",inicio:0,vence:100,limites:true,revision:1,revisionActivacion:1};
 const ruta=resolverRutaAsistente({giro:"restaurante",contrato,operativos:["web","pos","caja"],ahora:1});
 const v=evaluarModulosAsistente(ruta,perfil,org,"a");
 assert.equal(v.modulos.find(m=>m.id==="pos").habilitado,true);
 assert.equal(v.modulos.find(m=>m.id==="pos").estado_validacion,"pendiente");
 const siguiente=evaluarModulosAsistente(resolverRutaAsistente({giro:"restaurante",contrato:{...contrato,seleccion:["web"],revisionActivacion:2},operativos:["web","pos","caja"],ahora:1}),perfil,org,"a",v.referencia);
 assert.equal(siguiente.cambios.contrato,true);assert.equal(siguiente.cambios.modulos,true);
 assert.ok(siguiente.modulos.find(m=>m.id==="caja").bloqueos.includes("dependencia_no_habilitada:pos"));
});
