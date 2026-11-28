import {resolverCompatibilidad} from "./compatibilidad-modulos.mjs";
import {idsModulos} from "./catalogo-contractual.mjs";
// Configuration candidates only; no permissions, completion or activation granted.
export function resolverRutaAsistente({giro,contrato=null,operativos=[],ahora=0}={}){
 const base=resolverCompatibilidad({giro,contratados:contrato?.modulos??[],operativos});
 const seleccion=new Set(contrato?.seleccion??[]),mapa=new Map(base.modulos.map(m=>[m.id,m]));
 const vigente=!!contrato&&["activa","prueba"].includes(contrato.estado)&&contrato.inicio<=ahora&&contrato.vence>ahora&&contrato.limites===true;
 const efectivo=k=>vigente&&seleccion.has(k)&&mapa.get(k)?.disponibleTecnico===true&&mapa.get(k).dependencias.every(efectivo);
 const modulos=base.modulos.filter(m=>m.aplicable).map(m=>({...m,seleccionado:seleccion.has(m.id),habilitado:efectivo(m.id),estado:efectivo(m.id)?"habilitado":m.estado}));
 const personal=!!contrato&&(contrato.usuarios>1||modulos.some(m=>["citas","agendas","ordenes_servicio"].includes(m.id)));
 const pasos=[
  {id:"inicio",obligatorio:true,depende:[]},
  {id:"perfil",obligatorio:true,depende:["inicio"]},
  {id:"presentacion",obligatorio:modulos.some(m=>m.id==="web"),depende:["perfil"]},
  {id:"sucursales",obligatorio:true,depende:["perfil"]},
  ...(personal?[{id:"personal",obligatorio:false,depende:["sucursales"]}]:[]),
  ...(contrato?[{id:"modulos",obligatorio:true,depende:["perfil","sucursales"]}]:[]),
  {id:"revision",obligatorio:true,depende:["perfil","sucursales",...(modulos.some(m=>m.id==="web")?["presentacion"]:[]),...(contrato?["modulos"]:[])]}
 ];
 return {versionRuta:1,giro,contrato:contrato?{plan:contrato.plan,version:contrato.version,usuarios:contrato.usuarios,sucursales:contrato.sucursales,vigente,revision:contrato.revision,revisionActivacion:contrato.revisionActivacion}:null,pasos,modulos,excluidos:base.modulos.filter(m=>!m.aplicable&&m.contratado).map(m=>({id:m.id,motivo:m.estado})),bloqueos:contrato?[]:["contrato_pendiente"]};
}
export function reconciliarProgreso(progreso,ruta){
 const ids=new Set(ruta.pasos.map(p=>p.id)),visitados=progreso.visitados.filter(p=>ids.has(p));
 const paso=ids.has(progreso.paso)?progreso.paso:ruta.pasos.find(p=>!visitados.includes(p.id))?.id??"revision";
 return {...progreso,paso,visitados,ajustado:paso!==progreso.paso,paso_guardado:progreso.paso};
}
export function validarOperativosAsistente(x){return Array.isArray(x)&&new Set(x).size===x.length&&x.every(m=>idsModulos.includes(m));}
