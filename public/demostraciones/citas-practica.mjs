import {datosCitaDemo} from "./clientes-practica.mjs";
// Agenda local ficticia. Nunca consulta ni modifica la agenda operativa de El Comal.
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {capacidades} from "./config.mjs";
const agenda={
 "barberia-elite":{dias:[0,2,3,4,5,6],recursos:[
  {id:"barbero-a",nombre:"Barbero A",inicio:600,fin:1200,pausa:[840,900]},
  {id:"barbero-b",nombre:"Barbero B",inicio:660,fin:1140,pausa:[900,960]}]},
 "auto-servicio-bahia":{dias:[1,2,3,4,5,6],recursos:[
  {id:"tecnico-a",nombre:"Técnico A · bahía 1",inicio:480,fin:1020,pausa:[780,840]},
  {id:"tecnico-b",nombre:"Técnico B · bahía 2",inicio:540,fin:1020,pausa:[840,900]}]}
};
const zona="America/Mazatlan",MAX=60;
const copia=x=>JSON.parse(JSON.stringify(x));
const estados={pendiente:["confirmada","cancelada"],confirmada:["atendida","no_asistio","cancelada"],atendida:[],no_asistio:[],cancelada:[]};
export const nombresCita={pendiente:"Pendiente",confirmada:"Confirmada",atendida:"Atendida",no_asistio:"No asistió",cancelada:"Cancelada"};
export function admiteCitas(id,plan){
 const e=obtenerEstablecimiento(id);
 return Object.hasOwn(agenda,id)&&!!e&&capacidades(e,plan).some(m=>m.id==="citas"&&m.estadoEfectivo==="disponible");
}
export function recursosCita(id){return Object.hasOwn(agenda,id)?copia(agenda[id].recursos):[];}
export function serviciosCita(catalogo){return catalogo.filter(p=>p.tipo==="servicio"&&p.disponible!==false&&Number.isSafeInteger(p.duracionMinutos)&&p.duracionMinutos>=5&&p.duracionMinutos<=1440&&Number.isSafeInteger(p.precioCentavos)&&p.precioCentavos>=0&&p.precioCentavos<=100000000);}
export function relojLocal(ms=Date.now()){
 const partes=new Intl.DateTimeFormat("en-CA",{timeZone:zona,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(ms));
 const p=Object.fromEntries(partes.map(x=>[x.type,x.value]));
 return {fecha:p.year+"-"+p.month+"-"+p.day,minuto:Number(p.hour)*60+Number(p.minute)};
}
function fechaUTC(s){
 if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
 const d=new Date(s+"T00:00:00Z");
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?d:null;
}
export function sumarDias(fecha,n){const d=fechaUTC(fecha);if(!d)throw Error("Fecha inválida.");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export const horaCita=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
export function transicionesCita(s){return Object.hasOwn(estados,s)?[...estados[s]]:[];}
export function horariosCita(id,catalogo,citas,{servicio,recurso,fecha},ms=Date.now()){
 const cfg=Object.hasOwn(agenda,id)?agenda[id]:null,r=cfg?.recursos.find(x=>x.id===recurso),p=serviciosCita(catalogo).find(x=>x.id===servicio),d=fechaUTC(fecha),hoy=relojLocal(ms);
 if(!r||!p||!d||fecha<hoy.fecha||fecha>sumarDias(hoy.fecha,30)||!cfg.dias.includes(d.getUTCDay()))return [];
 const lista=[];
 for(let inicio=r.inicio;inicio+p.duracionMinutos<=r.fin;inicio+=15){
   const fin=inicio+p.duracionMinutos;
   if(fecha===hoy.fecha&&inicio<=hoy.minuto||inicio<r.pausa[1]&&fin>r.pausa[0])continue;
   if(citas.some(c=>c.fecha===fecha&&c.recurso===recurso&&c.estado!=="cancelada"&&inicio<c.fin&&fin>c.inicio))continue;
   lista.push({inicio,fin});
 }
 return lista;
}
function validaCita(c,id){
 if(!c||typeof c.folio!=="string"||!/^CITA-[a-zA-Z0-9-]{1,80}$/.test(c.folio)||!fechaUTC(c.fecha)||!recursosCita(id).some(r=>r.id===c.recurso)||typeof c.servicio!=="string"||typeof c.nombreServicio!=="string"||c.nombreServicio.length>100||!Number.isInteger(c.inicio)||!Number.isInteger(c.fin)||c.inicio<0||c.fin>1440||c.fin-c.inicio<5||!Number.isSafeInteger(c.precioCentavos)||c.precioCentavos<0||c.precioCentavos>100000000||!Object.hasOwn(estados,c.estado)||!Array.isArray(c.historial)||c.historial.length<1||c.historial.length>3)return false;
 return c.historial.every((h,i)=>h&&Number.isSafeInteger(h.fecha)&&(i===0?h.estado==="pendiente":transicionesCita(c.historial[i-1].estado).includes(h.estado)))&&c.historial.at(-1).estado===c.estado;
}
export function crearCitasPractica(almacen,id,plan,{ahora=()=>Date.now(),folio=()=>crypto.randomUUID()}={}){
 if(!admiteCitas(id,plan))throw Error("Citas no disponibles para este negocio y plan.");
 const clave="lapaz:demo:citas:v1:"+id;
 function leer(){
   try{const raw=almacen?.getItem(clave);if(!raw)return [];const v=JSON.parse(raw);
    if(raw.length<=120000&&v.version===1&&v.establecimiento===id&&Array.isArray(v.citas)&&v.citas.length<=MAX&&new Set(v.citas.map(c=>c?.folio)).size===v.citas.length&&v.citas.every(c=>validaCita(c,id)))return copia(v.citas);
   }catch{}return [];
 }
 function guardar(citas){
   try{if(!almacen)throw Error("sin almacenamiento");almacen.setItem(clave,JSON.stringify({version:1,establecimiento:id,citas}));}
   catch{throw Error("No se pudo conservar la agenda de práctica. No se guardó el cambio.");}
 }
 function crear(catalogo,datos){
   const citas=leer(),p=serviciosCita(catalogo).find(x=>x.id===datos.servicio),slot=horariosCita(id,catalogo,citas,datos,ahora()).find(h=>h.inicio===datos.inicio);
   if(!p||!slot)throw Error("Horario no disponible. Selecciona otro.");
   if(citas.length>=MAX)throw Error("Límite de 60 citas de práctica. Restablece la agenda desde el panel.");
   const f="CITA-"+folio();if(!/^CITA-[a-zA-Z0-9-]{1,80}$/.test(f)||citas.some(c=>c.folio===f))throw Error("Folio inválido o repetido.");
   const c={...(datos.datosCliente===undefined?{}:{datosCliente:datosCitaDemo(datos.datosCliente)}),folio:f,servicio:p.id,nombreServicio:p.nombre,precioCentavos:p.precioCentavos,recurso:datos.recurso,fecha:datos.fecha,...slot,estado:"pendiente",historial:[{estado:"pendiente",fecha:ahora()}]};
   guardar([c,...citas]);return copia(c);
 }
 function cambiar(folio,esperado,destino){
   const citas=leer(),c=citas.find(x=>x.folio===folio);
   if(!c||c.estado!==esperado||!transicionesCita(c.estado).includes(destino))throw Error("La cita cambió o la transición no está permitida.");
   c.estado=destino;c.historial.push({estado:destino,fecha:ahora()});guardar(citas);return copia(c);
 }
 return {leer,crear,cambiar,restaurar:()=>guardar([])};
}
