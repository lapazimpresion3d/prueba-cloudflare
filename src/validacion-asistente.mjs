// Server-derived checklist. Historical records never grant permission.
export function evaluarPreparacion(v){
 const fuentes={perfil:v.perfil.pasos.perfil,presentacion:v.perfil.pasos.presentacion,sucursales:v.organizacion.pasos.sucursales,personal:v.organizacion.pasos.personal,modulos:v.modulos.paso};
 const items=v.ruta.pasos.filter(p=>p.id!=="revision").map(p=>{
  const f=p.id==="inicio"?{estado_validacion:v.progreso.revision>0?"valido":"pendiente",faltantes:v.progreso.revision>0?[]:["iniciar_asistente"]}:fuentes[p.id];
  return {id:p.id,obligatorio:p.obligatorio,estado:f?.estado_validacion??"pendiente",faltantes:f?.faltantes??["sin_evidencia"]};
 });
 const bloqueos=items.filter(i=>i.obligatorio&&i.estado!=="valido").map(i=>"paso:"+i.id);
 const advertencias=items.filter(i=>!i.obligatorio&&i.estado!=="valido").map(i=>"opcional:"+i.id);
 if(!v.ruta.contrato)bloqueos.push("contrato_pendiente");
 else if(!v.ruta.contrato.vigente)bloqueos.push("contrato_no_vigente");
 if(v.progreso.estado==="pausado")bloqueos.push("asistente_pausado");
 for(const m of v.modulos.modulos){
  if(m.estado_validacion!=="valido")bloqueos.push("modulo:"+m.id);
  if(!m.disponibleTecnico)bloqueos.push("tecnico:"+m.id);
  // Selection and activation remain independent administrative decisions.
  if(!m.seleccionado)advertencias.push("seleccion_central:"+m.id);
 }
 if(v.organizacion.personal?.usuarios_activos>v.organizacion.personal?.limite_usuarios)bloqueos.push("limite_usuarios");
 const preparado=bloqueos.length===0;
 return {version:1,items,bloqueos:[...new Set(bloqueos)],advertencias:[...new Set(advertencias)],preparado,estado:preparado?"preparado":"pendiente",aprobado:false,entregado:false};
}
export async function huellaPreparacion(v){
 // No raw private records stored in review history; digest changes with observed evidence.
 const datos=JSON.stringify({version:1,ruta:v.ruta,perfil:v.perfil.referencia,organizacion:v.organizacion,modulos:v.modulos.referencia,progreso:v.progreso,implementacion:v.implementacion,revision_implementacion:v.revision_implementacion,checklist:v.checklist});
 return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(datos))),x=>x.toString(16).padStart(2,"0")).join("");
}
