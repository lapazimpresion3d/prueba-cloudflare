import test from "node:test";import assert from "node:assert/strict";
import {resolverRutaAsistente,reconciliarProgreso} from "../src/rutas-asistente.mjs";
import {catalogoInicial} from "../src/catalogo-contractual.mjs";
import {girosComerciales} from "../src/compatibilidad-modulos.mjs";
test("24 combinaciones de giros y planes conservan dependencias y exclusiones",()=>{
 for(const giro of girosComerciales)for(const p of catalogoInicial){
  const r=resolverRutaAsistente({giro,contrato:{...p,plan:p.id,seleccion:[]},operativos:[]});
  assert.equal(r.pasos.some(v=>v.id==="personal"),p.usuarios>1);
  assert.ok(r.modulos.every(m=>p.modulos.includes(m.id)&&!m.habilitado&&m.aplicable));
  for(const paso of r.pasos)assert.ok(paso.depende.every(d=>r.pasos.some(v=>v.id===d)));
  if(giro==="barberia")assert.ok(!r.modulos.some(m=>["cocina","mesas","pedidos"].includes(m.id)));
  if(giro==="restaurante")assert.ok(!r.modulos.some(m=>["citas","agendas"].includes(m.id)));
 }
});
test("sin contrato no muestra módulos, ni personal; conserva historial compatible",()=>{
 const r=resolverRutaAsistente({giro:"otro"});
 assert.deepEqual(r.bloqueos,["contrato_pendiente"]);assert.equal(r.modulos.length,0);
 const p=reconciliarProgreso({paso:"personal",visitados:["inicio","perfil","personal"],estado:"pausado"},r);
 assert.equal(p.ajustado,true);assert.equal(p.paso_guardado,"personal");assert.deepEqual(p.visitados,["inicio","perfil"]);
});
test("contratado, seleccionado y operativo no son equivalentes",()=>{
 const p=catalogoInicial[2],c={...p,plan:p.id,seleccion:["web","pedidos","cocina"],estado:"activa",inicio:0,vence:100,limites:true};
 const r=resolverRutaAsistente({giro:"restaurante",contrato:c,operativos:["web","cocina"],ahora:1});
 assert.equal(r.modulos.find(m=>m.id==="web").habilitado,true);
 assert.equal(r.modulos.find(m=>m.id==="cocina").habilitado,false);
 assert.equal(r.modulos.find(m=>m.id==="pos").seleccionado,false);
 assert.equal(resolverRutaAsistente({giro:"restaurante",contrato:c,operativos:["web"],ahora:100}).modulos.find(m=>m.id==="web").habilitado,false);
});
