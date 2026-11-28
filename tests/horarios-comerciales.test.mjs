import test from "node:test";
import assert from "node:assert/strict";
import {validarHorario,estadoHorario} from "../src/horarios-comerciales.mjs";
const semana=()=>[[],[],[],[],[],[],[]];
const config=(s,e={},z="America/Mazatlan")=>({zona_horaria:z,horario_semanal:s,excepciones_horario:e});
const estado=(h,t)=>estadoHorario(h,Date.parse(t));
test("intervalos, descanso, límite exclusivo y próxima apertura",()=>{
 const s=semana();s[0]=[[540,780],[900,1260]];const h=config(s);
 assert.equal(estado(h,"2026-11-30T16:00:00Z").abierto,true);
 assert.equal(estado(h,"2026-11-30T20:00:00Z").abierto,false);
 assert.equal(estado(h,"2026-11-30T20:00:00Z").proxima_apertura,Date.parse("2026-11-30T22:00:00Z"));
 assert.equal(estado(config(semana()),"2026-11-30T20:00:00Z").proxima_apertura,null);
});
test("noche domingo a lunes y excepción que suprime arrastre",()=>{
 const s=semana();s[6]=[[1200,1560]];
 assert.equal(estado(config(s),"2026-11-30T08:00:00Z").abierto,true);
 assert.equal(estado(config(s,{"2026-11-30":[]}),"2026-11-30T08:00:00Z").abierto,false);
 assert.equal(estado(config(s,{"2026-11-29":[]}),"2026-11-30T08:00:00Z").abierto,false);
});
test("excepción especial y horario de verano: salto y repetición",()=>{
 const h=config(semana(),{"2026-03-08":[[120,240]]},"America/New_York");
 assert.equal(estado(h,"2026-03-08T06:59:00Z").proxima_apertura,Date.parse("2026-03-08T07:00:00Z"));
 const repetido=config(semana(),{"2026-11-01":[[90,105]]},"America/New_York");
 assert.equal(estado(repetido,"2026-11-01T05:46:00Z").proxima_apertura,Date.parse("2026-11-01T06:30:00Z"));
});
test("validación de fechas, zonas, traslapes y arrastre semanal",()=>{
 const s=semana();s[6]=[[1200,1560]];s[0]=[[60,180]];
 assert.throws(()=>validarHorario(config(s)));
 assert.throws(()=>validarHorario(config(semana(),{"2026-02-30":[]})));
 assert.throws(()=>validarHorario(config(semana(),{},"Invalid/Zone")));
 const a=semana();a[0]=[[100,300],[200,400]];assert.throws(()=>validarHorario(config(a)));
 assert.throws(()=>validarHorario(config(semana(),{"2026-11-30":[[1200,1560]]})));
});
