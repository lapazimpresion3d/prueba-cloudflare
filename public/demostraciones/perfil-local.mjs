// Personalización de práctica. No altera la identidad publicada ni permite URLs externas.
import {obtenerEstablecimiento} from "./establecimientos.mjs";
const prefijo="lapaz:demo:perfil:v1:";
const copiar=x=>JSON.parse(JSON.stringify(x));
function texto(v,max,obligatorio=true){
  if(typeof v!=="string")throw Error("Escribe un texto válido.");
  const s=v.trim();
  if((obligatorio&&!s)||s.length>max)throw Error("Revisa la longitud de los campos.");
  return s;
}
function color(v){if(typeof v!=="string"||!/^#[0-9a-f]{6}$/i.test(v))throw Error("Color inválido.");return v.toLowerCase();}
export function validarPerfil(id,datos){
  const e=obtenerEstablecimiento(id);
  if(!e||!datos||typeof datos!=="object")throw Error("Perfil inválido.");
  const iconos=["☕","✂️","🐾","🌮","🔧","🏪","⭐","🌿","💼"];
  if(!iconos.includes(datos.icono))throw Error("Elige un icono de la lista.");
  return {nombre:texto(datos.nombre,80),marca:{icono:datos.icono,color:color(datos.color),fondo:color(datos.fondo),lema:texto(datos.lema,100),descripcion:texto(datos.descripcion,280)},horario:texto(datos.horario,120),ubicacion:texto(datos.ubicacion,140),contacto:texto(datos.contacto??"",140,false)};
}
function inicial(id){
  const e=obtenerEstablecimiento(id);
  if(!e)throw Error("Establecimiento desconocido.");
  return {nombre:e.nombre,marca:copiar(e.marca),horario:e.horario,ubicacion:e.ubicacion,contacto:"Contacto ficticio · sin atención real"};
}
export function perfilPlano(p){return {nombre:p.nombre,icono:p.marca.icono,color:p.marca.color,fondo:p.marca.fondo,lema:p.marca.lema,descripcion:p.marca.descripcion,horario:p.horario,ubicacion:p.ubicacion,contacto:p.contacto??""};}
export function crearPerfilesLocales(almacen){
  const memoria=new Map();
  function leer(id){
    const base=inicial(id);
    if(memoria.has(id))return copiar(memoria.get(id));
    let perfil=base;
    try{
      const raw=almacen?.getItem(prefijo+id);
      if(raw&&raw.length<=5000){
        const v=JSON.parse(raw);
        if(v.version===1&&v.establecimiento===id)perfil=validarPerfil(id,perfilPlano(v.perfil));
      }
    }catch{}
    memoria.set(id,perfil);return copiar(perfil);
  }
  function guardar(id,datos){
    const perfil=validarPerfil(id,datos);
    memoria.set(id,perfil);
    try{if(!almacen)return false;almacen.setItem(prefijo+id,JSON.stringify({version:1,establecimiento:id,perfil}));return true;}catch{return false;}
  }
  function restaurar(id){return guardar(id,perfilPlano(inicial(id)));}
  return {leer,guardar,restaurar};
}
