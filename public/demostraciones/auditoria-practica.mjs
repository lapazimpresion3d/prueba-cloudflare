// Historial local de práctica. No es autenticación ni auditoría de servidor.
import {csv} from "./administrador-central/gestion.mjs";
export const MAX_AUDITORIA=500;
const fechaValida=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(x);
export function evento({modulo,objetivo,anterior=null,posterior=null,actor="Propietario (simulado)",sucursal=null,fecha=new Date().toISOString(),id=crypto.randomUUID()}){return {id,fecha,modulo,objetivo,actor,sucursal,anterior,posterior};}
export function agregarEventos(lista,nuevos){return [...(Array.isArray(lista)?lista:[]),...nuevos].slice(-MAX_AUDITORIA);}
export function cambiosEmpresa(antes,despues){
 const resultado=[];
 const registrar=(modulo,objetivo,a,b,sucursal=null)=>{if(JSON.stringify(a)!==JSON.stringify(b))resultado.push(evento({modulo,objetivo,anterior:a,posterior:b,sucursal}));};
 // Los empleados actuales usan posiciones, no IDs estables. Registrar conjunto completo sin atribuir cambios a una identidad falsa.
 const personal=d=>d.personal.map((rol,i)=>({posicion:i+1,rol,sucursal:d.asignaciones[i],rolPersonalizado:d.rolesAsignados?.[i]??null}));
 registrar("Personal","Conjunto de empleados (posiciones de práctica)",personal(antes),personal(despues));
 const roles=d=>(d.rolesPersonalizados??[]).map(r=>({id:r.id,base:r.base,permisos:r.permisos??null}));
 registrar("Roles","Roles personalizados",roles(antes),roles(despues));
 const restricciones=d=>d.personal.flatMap((rol,i)=>d.denegadosIndividuales?.[i]?.length?[{posicion:i+1,rol,sucursal:d.asignaciones[i],denegados:d.denegadosIndividuales[i]}]:[]);
 registrar("Permisos individuales","Restricciones por posición de empleado",restricciones(antes),restricciones(despues));
 registrar("Sucursales","Sucursales activas",antes.activas,despues.activas);
 return resultado;
}
export function leerAuditoria(storage,clave){try{const v=JSON.parse(storage.getItem(clave));return Array.isArray(v?.auditoria)?v.auditoria.filter(x=>x&&fechaValida(x.fecha)&&typeof x.modulo==="string").slice(-MAX_AUDITORIA):[];}catch{return [];}}
export function historialCentral(datos){
 return agregarEventos([], (datos.historial??[]).filter(h=>h&&fechaValida(h.fecha)).map((h,i)=>evento({id:h.eventoId??"legado-"+i,fecha:h.fecha,modulo:h.modulo??(Object.hasOwn(h.anterior??{},"plan")?"Suscripciones":"Paquetes"),objetivo:String(h.id??""),actor:h.actor??"No registrado (histórico)",anterior:h.anterior??null,posterior:h.nuevo??null})));
}
export function filtrarAuditoria(rows,{texto="",modulo="",actor="",sucursal="",desde="",hasta=""}={}){
 const normal=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 return rows.filter(r=>(!modulo||r.modulo===modulo)&&(!actor||r.actor===actor)&&(!sucursal||String(r.sucursal??"global")===sucursal)&&(!desde||r.fecha.slice(0,10)>=desde)&&(!hasta||r.fecha.slice(0,10)<=hasta)&&normal(JSON.stringify(r)).includes(normal(texto.trim()))).slice().reverse();
}
export function csvAuditoria(rows){return csv([["Modo","Fecha","Actor","Módulo","Sucursal","Objetivo","Anterior","Posterior"],...rows.map(r=>["Práctica local",r.fecha,r.actor,r.modulo,r.sucursal??"Global",r.objetivo,JSON.stringify(r.anterior),JSON.stringify(r.posterior)])]);}
