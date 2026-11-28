// Datos ficticios por negocio y plan. Sin red, pagos ni autoridad comercial.
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {planes,capacidades} from "./config.mjs";
export const categorias=Object.freeze({funcionamiento:"Problema de funcionamiento",ayuda:"Ayuda para utilizar la plataforma",modificacion:"Solicitud de modificación",suscripcion:"Consulta sobre mi suscripción",nueva_funcion:"Solicitud de nueva funcionalidad",mejora:"Propuesta de mejora",otro:"Otro"});
export const estados=Object.freeze({abierto:"Abierto",en_proceso:"En proceso",espera_cliente:"Esperando información del cliente",resuelto:"Resuelto",cancelado:"Cancelado"});
export const impactos=Object.freeze({bajo:"Bajo",parcial:"Parcial",bloqueante:"Bloqueante"});
const propio=(o,k)=>typeof k==="string"&&Object.hasOwn(o,k);
const texto=(s,min,max)=>{if(typeof s!=="string"||s.trim().length<min||s.trim().length>max)throw Error("Revisa la longitud de los campos.");return s.trim();};
const fecha=s=>{if(typeof s!=="string"||!Number.isFinite(Date.parse(s)))throw Error("Fecha inválida.");return new Date(s).toISOString();};
const copia=x=>JSON.parse(JSON.stringify(x));
export function contextoSoporte(id,plan){
 const e=obtenerEstablecimiento(id);if(!e||!planes.some(p=>p.id===plan))throw Error("Negocio o paquete de práctica desconocido.");
 return {id,plan,nombre:e.nombre,modulos:["General",...capacidades(e,plan).filter(m=>m.estadoEfectivo==="disponible").map(m=>m.nombre)]};
}
export function validarSolicitud(ctx,d){
 if(!d||!propio(categorias,d.categoria)||!propio(impactos,d.impacto)||!ctx.modulos.includes(d.modulo))throw Error("Categoría, impacto o módulo inválido.");
 return {titulo:texto(d.titulo,3,120),descripcion:texto(d.descripcion,3,2000),categoria:d.categoria,impacto:d.impacto,modulo:d.modulo};
}
function ejemplos(ctx,ahora){
 const f=n=>new Date(ahora-n*86400000).toISOString();
 return [
 {id:"EJ-1",titulo:"Consulta sobre el catálogo",descripcion:"¿Cómo puedo actualizar la información de mi negocio?",categoria:"ayuda",impacto:"bajo",modulo:"General",estado:"abierto",prioridad:null,creado:f(1),actualizado:f(1),mensajes:[]},
 {id:"EJ-2",titulo:"Revisión de presentación móvil",descripcion:"La vista de práctica necesita una revisión.",categoria:"funcionamiento",impacto:"parcial",modulo:"General",estado:"en_proceso",prioridad:"normal",creado:f(3),actualizado:f(2),mensajes:[{autor:"Lapazimpresion3d (ejemplo)",texto:"Estamos revisando la presentación móvil de ejemplo.",fecha:f(2)}]},
 {id:"EJ-3",titulo:"Orientación para editar horarios",descripcion:"Solicité ayuda para cambiar el horario.",categoria:"ayuda",impacto:"bajo",modulo:"General",estado:"resuelto",prioridad:"baja",creado:f(7),actualizado:f(6),mensajes:[{autor:"Lapazimpresion3d (ejemplo)",texto:"Puedes editar los horarios desde Información del negocio.",fecha:f(6)}]},
 {id:"EJ-4",titulo:"Aclaración de información",descripcion:"Consulta de práctica sobre una modificación.",categoria:"modificacion",impacto:"bajo",modulo:"General",estado:"espera_cliente",prioridad:"normal",creado:f(4),actualizado:f(3),mensajes:[{autor:"Lapazimpresion3d (ejemplo)",texto:"Indica qué texto de ejemplo deseas modificar.",fecha:f(3)}]}
 ];
}
function validarRegistro(ctx,d){
 const s=validarSolicitud(ctx,d);
 if(typeof d.id!=="string"||!(/^(EJ-[1-4]|SOL-[1-9][0-9]{0,5})$/).test(d.id)||!propio(estados,d.estado)||![null,"baja","normal","alta","critica"].includes(d.prioridad)||!Array.isArray(d.mensajes)||d.mensajes.length>20)throw Error("Registro de práctica inválido.");
 const creado=fecha(d.creado),actualizado=fecha(d.actualizado);if(actualizado<creado)throw Error("Fechas inválidas.");
 const mensajes=d.mensajes.map(m=>{if(!["Lapazimpresion3d (ejemplo)","Cliente (práctica)"].includes(m.autor))throw Error("Autor inválido.");return {autor:m.autor,texto:texto(m.texto,1,3000),fecha:fecha(m.fecha)};});
 return {...s,id:d.id,estado:d.estado,prioridad:d.prioridad,creado,actualizado,mensajes};
}
export function crearSoportePractica(storage,id,plan,reloj=Date.now){
 const ctx=contextoSoporte(id,plan),key="lapaz:soporte:practica:v1:"+id+":"+plan;
 const leer=()=>{const raw=storage.getItem(key);if(raw===null){const d=ejemplos(ctx,reloj());guardar(d);return d;}if(raw.length>500000)throw Error("Datos de práctica demasiado grandes.");const doc=JSON.parse(raw);if(doc.version!==1||doc.id!==id||doc.plan!==plan||!Array.isArray(doc.solicitudes)||doc.solicitudes.length>50)throw Error("Datos de práctica inválidos.");const d=doc.solicitudes.map(x=>validarRegistro(ctx,x));if(new Set(d.map(x=>x.id)).size!==d.length)throw Error("Identificadores duplicados.");return d;};
 const guardar=d=>{const serial=JSON.stringify({version:1,id,plan,solicitudes:d});if(serial.length>500000)throw Error("Límite de almacenamiento de práctica alcanzado.");storage.setItem(key,serial);};
 return {ctx,key,leer:()=>copia(leer()),crear(datos){const s=validarSolicitud(ctx,datos),d=leer();if(d.length>=50)throw Error("Máximo 50 solicitudes de práctica.");const n=Math.max(0,...d.map(x=>x.id.startsWith("SOL-")?Number(x.id.slice(4)):0))+1;const f=fecha(new Date(reloj()).toISOString());const nuevo={...s,id:"SOL-"+n,estado:"abierto",prioridad:null,creado:f,actualizado:f,mensajes:[]};guardar([...d,nuevo]);return copia(nuevo);},mantenimiento(){return [{fecha:new Date(reloj()-14*86400000).toISOString(),titulo:"Revisión preventiva de ejemplo",detalle:"Comprobación ficticia de disponibilidad y presentación. No acredita un mantenimiento real."}];}};
}
export function filtrarSoporte(d,{estado="",categoria=""}={}){return d.filter(x=>(!estado||x.estado===estado)&&(!categoria||x.categoria===categoria)).sort((a,b)=>b.actualizado.localeCompare(a.actualizado));}
export function resumenSoporte(d){return {pendientes:d.filter(x=>["abierto","en_proceso","espera_cliente"].includes(x.estado)).length,resueltas:d.filter(x=>x.estado==="resuelto").length,canceladas:d.filter(x=>x.estado==="cancelado").length};}
