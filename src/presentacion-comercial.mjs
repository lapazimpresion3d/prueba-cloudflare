import {validarHorario} from "./horarios-comerciales.mjs";
import {proyectarContacto} from "./contacto-comercial.mjs";
import {inspeccionarJpeg} from "./seguridad-imagen-comercial.mjs";
const colores=["color","color_secundario","color_acento","color_fondo","color_texto"];
const secciones=["descripcion","horario","contacto"];
const error=()=>{throw Error("Presentación inválida.");};
export function validarPresentacion(x={}){
 if(!x||typeof x!=="object"||Array.isArray(x)||Object.keys(x).some(k=>!["estilo","secciones"].includes(k)))error();
 const estilo=x.estilo??"clasico",s=x.secciones??secciones;
 if(!["clasico","compacto"].includes(estilo)||!Array.isArray(s)||new Set(s).size!==s.length||s.some(k=>!secciones.includes(k)))error();
 return {estilo,secciones:[...s]};
}
// Explicit allowlist. Never spread database rows or private contact fields.
export function proyectarPresentacion(x){
 const p=validarPresentacion(JSON.parse(x.presentacion));
 if(typeof x.nombre_publico!=="string"||!x.nombre_publico.trim()||x.nombre_publico.length>120||!colores.every(k=>typeof x[k]==="string"&&/^#[0-9a-fA-F]{6}$/.test(x[k])))error();
 for(const [k,maximo,lado] of [["logotipo",120000,512],["portada",360000,1600]])if(x[k]!==null)inspeccionarJpeg(x[k],{maximo,lado});
 const r={nombre:x.nombre_publico,giro:x.giro,lema:x.lema,estilo:p.estilo,secciones:p.secciones,identidad:{...Object.fromEntries(colores.map(k=>[k,x[k]])),logotipo:x.logotipo,portada:x.portada}};
 if(p.secciones.includes("descripcion"))r.descripcion=x.descripcion;
 if(p.secciones.includes("horario"))r.horario=validarHorario({zona_horaria:x.zona_horaria,horario_semanal:JSON.parse(x.horario_semanal),excepciones_horario:JSON.parse(x.excepciones_horario)});
 if(p.secciones.includes("contacto"))r.contacto=proyectarContacto(JSON.parse(x.contacto));
 return r;
}
