import {admiteCalendario,intervaloCalendario,eventoCalendario} from "./calendario-practica.mjs";
import {crearCitasPractica} from "./citas-practica.mjs";
import {crearReservasLocales} from "./mesas-practica.mjs";
import {crearTurismo} from "./turismo-practica.mjs";
import {crearSalidasTurismo} from "./turismo-salidas.mjs";
const minutos=h=>Number(h.slice(0,2))*60+Number(h.slice(3));
export function eventosFuente(storage,id,plan,hoy){
 if(!admiteCalendario(id,plan))throw Error("Giro no compatible.");
 const evento=(id,titulo,f,inicio,duracion,recursos)=>eventoCalendario({id,titulo,...intervaloCalendario(f,inicio,duracion),recursos});
 if(id==="bahia-tours"){
 const r=crearTurismo(storage,plan,hoy),a=crearSalidasTurismo(storage,plan,hoy),d=a.leer(),cat=r.catalogo.leer(),reservas=r.leer().filter(x=>x.estado==="confirmada"),items=new Map();
 for(const s of d.salidas.filter(x=>x.abierta)){items.set(s.id,evento("salida:"+s.id,"Salida turística de práctica",s.fecha,minutos(s.hora),s.duracion*60,[s.transporte,s.guia]));}
 for(const x of reservas){const k=x.experiencia+":"+x.fecha;if(!items.has(k)){const e=cat.find(t=>t.id===x.experiencia);items.set(k,evento("salida:"+k,"Salida turística de práctica",x.fecha,minutos(x.tarifa.hora),(x.tarifa.duracion??e?.duracion??1)*60,[]));}}
 for(const x of d.bloqueos)items.set("bloqueo:"+x.id,evento("bloqueo:"+x.id,"Mantenimiento de práctica",x.fecha,minutos(x.hora),x.duracion*60,[x.recurso]));
 return [...items.values()];}
 if(id==="taqueria-el-comal")return crearReservasLocales(storage).leer().filter(x=>x.estado==="confirmada").map(x=>evento("mesa:"+x.solicitud,"Reservación de mesa de práctica",x.fecha,x.inicio,x.fin-x.inicio,["mesa-"+x.mesa]));
 return crearCitasPractica(storage,id,plan).leer().filter(x=>x.estado==="confirmada").map(x=>evento("cita:"+x.folio,"Cita de práctica",x.fecha,x.inicio,x.fin-x.inicio,[x.recurso]));
}
