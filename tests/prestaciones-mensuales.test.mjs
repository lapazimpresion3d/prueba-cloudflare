import test from "node:test";
import assert from "node:assert/strict";
import {catalogoInicial} from "../src/catalogo-contractual.mjs";
import {propuestaPrestaciones,consultarPropuestaPrestaciones} from "../src/prestaciones-mensuales.mjs";
test("propuesta no vinculante, cuatro niveles y cupos contractuales intactos",()=>{
 assert.equal(propuestaPrestaciones.aprobada,false);
 assert.equal(propuestaPrestaciones.estado,"borrador");
 for(const p of catalogoInicial){const x=consultarPropuestaPrestaciones(p.id,p.version);assert.equal(x.aprobada,false);assert.equal(x.usuarios,p.usuarios);assert.equal(x.sucursales,p.sucursales);assert.ok(Object.isFrozen(x.limites));assert.ok(x.comunes.includes("respaldos"));assert.ok(x.extras.includes("dominio_personalizado"));}
 assert.deepEqual(catalogoInicial.map(p=>p.mensualidad),[14900,29900,44900,64900]);
 assert.throws(()=>consultarPropuestaPrestaciones("p1",2));
 assert.throws(()=>consultarPropuestaPrestaciones("__proto__"));
});
test("niveles incrementales y objetivos no garantizados",()=>{const xs=catalogoInicial.map(p=>consultarPropuestaPrestaciones(p.id));for(let i=1;i<xs.length;i++){for(const k of ["productos","imagenesMiB","datosMiB","asistenciaMinutos","retencionDias"])assert.ok(xs[i].limites[k]>=xs[i-1].limites[k]);assert.ok(xs[i].limites.respuestaDiasHabiles<=xs[i-1].limites.respuestaDiasHabiles);assert.ok(xs[i].limites.respaldoHoras<=xs[i-1].limites.respaldoHoras);}assert.match(xs[0].condiciones.respuesta,/no plazo de resolución/);});
