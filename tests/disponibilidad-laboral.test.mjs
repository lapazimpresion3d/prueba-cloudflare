import test from "node:test";
import assert from "node:assert/strict";
import {validarTurnos,evaluarDisponibilidad} from "../src/disponibilidad-laboral.mjs";
const semana=()=>[[],[],[],[],[],[],[]];
const s=(id,intervalos,ex={})=>({sucursal:id,horario_semanal:intervalos,excepciones_horario:ex});
const config=(sucursales,ausencias=[])=>({zona_horaria:"America/Mazatlan",sucursales,ausencias});
test("turnos partidos, nocturnos y solapamientos semanales y excepcionales",()=>{
 const a=semana(),b=semana();a[6]=[[1200,1560]];b[0]=[[60,180]];
 assert.throws(()=>validarTurnos(config([s("a",a),s("b",b)])),/simultáneos/);
 b[0]=[[120,180]];assert.doesNotThrow(()=>validarTurnos(config([s("a",a),s("b",b)])));
 assert.throws(()=>validarTurnos(config([s("a",a),s("b",b,{"2026-11-30":[[60,90]]})])),/simultáneos/);
});
test("disponibilidad exige intervalo completo, horario comercial, recurso y ausencia",()=>{
 const a=semana();a[0]=[[540,780],[900,1200]];
 const comercial={zona_horaria:"America/Mazatlan",horario_semanal:a,excepciones_horario:{}};
 const d={turnos:config([s("a",a)]),sucursal:"a",comercial,inicio:Date.parse("2026-11-30T16:00:00Z"),fin:Date.parse("2026-11-30T17:00:00Z")};
 assert.equal(evaluarDisponibilidad(d),true);
 assert.equal(evaluarDisponibilidad({...d,fin:Date.parse("2026-11-30T21:00:00Z")}),false);
 assert.equal(evaluarDisponibilidad({...d,turnos:config([s("a",a)],["2026-11-30"])}),false);
 assert.equal(evaluarDisponibilidad({...d,recurso:{...comercial,excepciones_horario:{"2026-11-30":[]}}}),false);
});
