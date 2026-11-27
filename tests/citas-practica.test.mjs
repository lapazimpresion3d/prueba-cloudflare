import test from "node:test";
import assert from "node:assert/strict";
import {establecimientos,obtenerEstablecimiento} from "../public/demostraciones/establecimientos.mjs";
import {planes} from "../public/demostraciones/config.mjs";
import {admiteCitas,recursosCita,serviciosCita,relojLocal,sumarDias,horariosCita,crearCitasPractica,transicionesCita} from "../public/demostraciones/citas-practica.mjs";
const id="barberia-elite",catalogo=obtenerEstablecimiento(id).catalogo;
const ahora=()=>Date.parse("2026-11-27T16:00:00Z");
const datos={servicio:"corte",recurso:"barbero-a",fecha:"2026-11-28",inicio:600};
const almacen=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const opciones=()=>{let n=0;return {ahora,folio:()=>String(++n)};};
test("seis combinaciones de citas, P1 y otros giros excluidos",()=>{
 let n=0;for(const e of establecimientos)for(const p of planes){const esperado=p.id!=="p1"&&["barberia","taller"].includes(e.giro);assert.equal(admiteCitas(e.id,p.id),esperado);if(esperado)n++;}
 assert.equal(n,6);assert.equal(admiteCitas("constructor","p4"),false);assert.throws(()=>crearCitasPractica(almacen(),id,"p1"));
});
test("zona horaria, días cerrados y ventana de 30 días",()=>{
 assert.deepEqual(relojLocal(ahora()),{fecha:"2026-11-27",minuto:540});
 assert.equal(sumarDias("2026-11-30",1),"2026-12-01");
 for(const fecha of ["2026-11-26","2026-11-30","2026-12-28","2026-11-31","2026-02-30"])assert.equal(horariosCita(id,catalogo,[],{...datos,fecha},ahora()).length,0);
 assert.ok(horariosCita(id,catalogo,[],{...datos,fecha:"2026-12-27"},ahora()).length);
 const hoy=Date.parse("2026-11-27T18:30:00Z");
 assert.ok(horariosCita(id,catalogo,[],{...datos,fecha:"2026-11-27"},hoy).every(s=>s.inicio>690));
});
test("duración exacta, pausas y cierre",()=>{
 const slots=horariosCita(id,catalogo,[],datos,ahora());
 assert.equal(slots[0].inicio,600);assert.equal(slots[0].fin,635);
 assert.ok(slots.every(s=>s.fin<=1200&&(s.fin<=840||s.inicio>=900)));
 assert.ok(!slots.some(s=>s.inicio===825||s.inicio===840));
 assert.equal(horariosCita(id,catalogo,[],{...datos,servicio:"pomada"},ahora()).length,0);
 assert.equal(horariosCita(id,catalogo.map(p=>({...p,disponible:false})),[],datos,ahora()).length,0);
});
test("solapamientos de servicios distintos y recursos separados",()=>{
 const a=almacen(),r=crearCitasPractica(a,id,"p2",opciones());
 const c=r.crear(catalogo,datos);assert.equal(c.fin,635);
 const slots=horariosCita(id,catalogo,r.leer(),{...datos,servicio:"barba"},ahora());
 assert.ok(!slots.some(s=>s.inicio===600||s.inicio===615||s.inicio===630));
 assert.ok(slots.some(s=>s.inicio===645));
 assert.throws(()=>r.crear(catalogo,{...datos,servicio:"barba",inicio:630}));
 assert.ok(r.crear(catalogo,{...datos,recurso:"barbero-b",inicio:660}));
 assert.throws(()=>r.crear(catalogo,{...datos,inicio:601}));
});
test("confirmación, cancelación, liberación y congelación de precio",()=>{
 const r=crearCitasPractica(almacen(),id,"p2",opciones()),c=r.crear(catalogo,datos);
 assert.equal(c.precioCentavos,18000);
 assert.throws(()=>r.cambiar(c.folio,"pendiente","atendida"));
 r.cambiar(c.folio,"pendiente","confirmada");assert.throws(()=>r.cambiar(c.folio,"pendiente","cancelada"));
 r.cambiar(c.folio,"confirmada","cancelada");
 assert.ok(horariosCita(id,catalogo,r.leer(),datos,ahora()).some(s=>s.inicio===600));
 const nuevo=r.crear(catalogo.map(p=>({...p,precioCentavos:1})),datos);
 assert.equal(nuevo.precioCentavos,1);assert.equal(r.leer().find(x=>x.folio===c.folio).precioCentavos,18000);
 assert.deepEqual(transicionesCita("cancelada"),[]);
});
test("aislamiento, persistencia y agenda del taller",()=>{
 const a=almacen(),o=opciones(),b=crearCitasPractica(a,id,"p2",o),t=crearCitasPractica(a,"auto-servicio-bahia","p2",o);
 b.crear(catalogo,datos);
 const cat=obtenerEstablecimiento("auto-servicio-bahia").catalogo;
 const c=t.crear(cat,{servicio:"aceite",recurso:"tecnico-a",fecha:datos.fecha,inicio:480});
 assert.equal(c.fin,540);assert.equal(c.precioCentavos,65000);
 assert.equal(crearCitasPractica(a,id,"p4",o).leer().length,1);
 assert.equal(crearCitasPractica(almacen(),id,"p2",o).leer().length,0);
 b.restaurar();assert.equal(b.leer().length,0);assert.equal(t.leer().length,1);
 assert.equal(recursosCita("otro").length,0);assert.equal(serviciosCita(cat).length,3);
});
test("fallo de almacenamiento no confirma cita y datos corruptos no se muestran",()=>{
 const a={getItem(){return null},setItem(){throw Error("quota")}},r=crearCitasPractica(a,id,"p2",opciones());
 assert.throws(()=>r.crear(catalogo,datos));assert.equal(r.leer().length,0);
 const b=almacen();b.setItem("lapaz:demo:citas:v1:"+id,JSON.stringify({version:1,establecimiento:id,citas:[{folio:"CITA-1",estado:"confirmada"}]}));
 assert.equal(crearCitasPractica(b,id,"p2",opciones()).leer().length,0);
});
