import test from "node:test";
import assert from "node:assert/strict";
import {mesasComal,admiteMesas,horariosMesa,validarReserva,crearReservasLocales,enlaceMesa} from "../public/demostraciones/mesas-practica.mjs";
const ahora=()=>Date.parse("2026-11-27T18:00:00Z"),fecha="2026-11-28",d={fecha,personas:4,mesa:"3",inicio:720,datosCliente:{cliente:"cliente-1",nota:""}};
test("capacidad, horario original, lunes cerrado, anticipación",()=>{
 assert.deepEqual(mesasComal.map(m=>m.capacidad),[2,2,4,4,8]);
 const slots=horariosMesa([],fecha,4,ahora());
 assert.equal(slots.length,18);assert.equal(slots.at(-1).fin,1320);assert.deepEqual(slots[0].mesas,["3","4","5"]);
 assert.equal(horariosMesa([],"2026-11-30",4,ahora()).length,0);
 assert.equal(horariosMesa([],"2026-12-12",4,ahora()).length,0);
 assert.throws(()=>validarReserva({...d,mesa:"1"},[],ahora()));
});
test("historial, bloqueo por intervalo y liberación tras cancelación",()=>{
 const m=new Map(),almacen={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},repo=crearReservasLocales(almacen,{ahora,folio:()=>"1"});
 const c=repo.crear(d);assert.equal(c.datosCliente.cliente.id,"cliente-1");
 assert.throws(()=>repo.crear({...d,solicitud:"2",inicio:750}));
 assert.ok(horariosMesa(repo.leer(),fecha,4,ahora()).find(x=>x.inicio===810).mesas.includes("3"));
 repo.cambiar(c.solicitud,"pendiente","confirmada");repo.cambiar(c.solicitud,"confirmada","cancelada");
 assert.ok(horariosMesa(repo.leer(),fecha,4,ahora())[0].mesas.includes("3"));
});
test("cinco enlaces individuales y exclusión de P1",()=>{
 assert.equal(admiteMesas("taqueria-el-comal","p1"),false);
 assert.equal(admiteMesas("barberia-elite","p4"),false);
 for(const m of mesasComal){const url=new URL(enlaceMesa("https://demo.example","p4",m.id));assert.equal(url.searchParams.get("mesa"),m.id);assert.equal(url.searchParams.get("plan"),"p4");}
 assert.throws(()=>enlaceMesa("https://demo.example","p4","6"));
});
