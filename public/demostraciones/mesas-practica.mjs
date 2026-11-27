import {relojLocal,sumarDias,horaCita} from "./citas-practica.mjs";
import {datosCitaDemo,seleccionCita} from "./clientes-practica.mjs";
export const mesasComal=Object.freeze([2,2,4,4,8].map((capacidad,i)=>Object.freeze({id:String(i+1),nombre:"Mesa "+(i+1),capacidad})));
export const admiteMesas=(id,plan)=>id==="taqueria-el-comal"&&["p2","p3","p4"].includes(plan);
export const estadosReserva={pendiente:"Pendiente",confirmada:"Confirmada",atendida:"Atendida",cancelada:"Cancelada",no_asistio:"No asistió"};
export const transicionesReserva=s=>({pendiente:["confirmada","cancelada"],confirmada:["atendida","cancelada","no_asistio"]}[s]||[]);
export function horariosMesa(reservas,fecha,personas,ms=Date.now()){
 const hoy=relojLocal(ms);
 if(typeof fecha!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(fecha)||fecha<hoy.fecha||fecha>sumarDias(hoy.fecha,14)||!Number.isInteger(personas)||personas<1||personas>8)return [];
 const d=new Date(fecha+"T00:00:00Z");if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==fecha||d.getUTCDay()===1)return [];
 const slots=[];
 for(let inicio=720;inicio+90<=1320;inicio+=30){
  if(fecha===hoy.fecha&&inicio<=hoy.minuto)continue;
  const fin=inicio+90;
  const mesas=mesasComal.filter(m=>m.capacidad>=personas&&!reservas.some(r=>r.mesa===m.id&&r.fecha===fecha&&r.estado!=="cancelada"&&r.estado!=="no_asistio"&&r.inicio<fin&&r.fin>inicio));
  if(mesas.length)slots.push({inicio,fin,mesas:mesas.map(m=>m.id)});
 }
 return slots;
}
export function validarReserva(d,reservas=[],ms=Date.now()){
 const cliente=datosCitaDemo(d.datosCliente),seleccion=seleccionCita(d.datosCliente);
 const slot=horariosMesa(reservas,d.fecha,d.personas,ms).find(s=>s.inicio===d.inicio&&s.mesas.includes(d.mesa));
 if(!slot)throw Error("Mesa u horario no disponible. Actualiza la disponibilidad.");
 return {fecha:d.fecha,personas:d.personas,mesa:d.mesa,inicio:slot.inicio,fin:slot.fin,datosCliente:cliente,seleccion};
}
export function enlaceMesa(origen,plan,mesa,practica=false){
 if(!admiteMesas("taqueria-el-comal",plan)||!mesasComal.some(m=>m.id===mesa))throw Error("Mesa inválida.");
 return new URL("/demostraciones/negocio/?"+new URLSearchParams({negocio:"taqueria-el-comal",plan,mesa,...(practica?{practica:"1"}:{})}),origen).href;
}
export function crearReservasLocales(almacen,{ahora=()=>Date.now(),folio=()=>crypto.randomUUID()}={}){
 const clave="lapaz:demo:reservas:v1:taqueria-el-comal";
 function leer(){const raw=almacen.getItem(clave);if(!raw)return [];const v=JSON.parse(raw);if(!Array.isArray(v)||v.length>60)throw Error("Historial local inválido.");return v;}
 function guardar(v){almacen.setItem(clave,JSON.stringify(v));}
 function crear(d){const r=leer();if(r.length>=60)throw Error("Límite de 60 reservaciones.");const {seleccion,...v}=validarReserva(d,r,ahora());const c={...v,solicitud:d.solicitud||folio(),estado:"pendiente"};if(r.some(x=>x.solicitud===c.solicitud))throw Error("Solicitud repetida.");guardar([c,...r]);return c;}
 function cambiar(id,esperado,destino){const r=leer(),c=r.find(x=>x.solicitud===id);if(!c||c.estado!==esperado||!transicionesReserva(esperado).includes(destino))throw Error("Estado actualizado o transición inválida.");c.estado=destino;guardar(r);return c;}
 return {leer,crear,cambiar};
}
export {relojLocal,sumarDias,horaCita};
