import {validarHorario} from "./horarios-comerciales.mjs";
import {validarContacto} from "./contacto-comercial.mjs";
import {validarPresentacion,proyectarPresentacion} from "./presentacion-comercial.mjs";
// Current configuration assessment, never approval. Reference is only a comparison baseline.
export function evaluarPerfilAsistente(x,ruta,anterior=null){
 const contacto=validarContacto(JSON.parse(x.contacto));
 const horario=validarHorario({zona_horaria:x.zona_horaria,horario_semanal:JSON.parse(x.horario_semanal),excepciones_horario:JSON.parse(x.excepciones_horario)});
 const presentacion=validarPresentacion(JSON.parse(x.presentacion));
 // Validate even hidden sections using the canonical projection; actual preview honors visibility.
 const completo=proyectarPresentacion({...x,presentacion:JSON.stringify({...presentacion,secciones:["descripcion","horario","contacto"]})});
 const vista_previa=proyectarPresentacion(x);
 const referencia={empresa:x.empresa,revision_perfil:x.revision_perfil,contrato:ruta.contrato};
 const cambios=anterior===null?null:{perfil:anterior.empresa!==x.empresa||anterior.revision_perfil!==x.revision_perfil,contrato:anterior.empresa!==x.empresa||JSON.stringify(anterior.contrato)!==JSON.stringify(ruta.contrato)};
 const requiereWeb=ruta.pasos.some(p=>p.id==="presentacion"&&p.obligatorio);
 const tieneHorario=horario.horario_semanal.some(d=>d.length>0)||Object.values(horario.excepciones_horario).some(d=>d.length>0);
 const canales=Object.keys(completo.contacto.enlaces).filter(k=>k!=="mapa");
 const pendientes=[];
 if(requiereWeb){
  if(!x.descripcion.trim()||!presentacion.secciones.includes("descripcion"))pendientes.push("descripcion_publica");
  if(!presentacion.secciones.includes("contacto")||!canales.length)pendientes.push("contacto_publico");
  if(["restaurante","cafeteria","barberia","taller"].includes(x.giro)&&(!tieneHorario||!presentacion.secciones.includes("horario")))pendientes.push("horario_publico");
 }
 const paso=(faltantes)=>({estado_configuracion:faltantes.length?"incompleto":"configurado",estado_validacion:faltantes.length?"pendiente":"valido",faltantes});
 return {referencia,cambios,identidad:{nombre_publico:x.nombre_publico,descripcion:x.descripcion,lema:x.lema,...completo.identidad},contacto,horario,presentacion,vista_previa,pasos:{perfil:paso([]),presentacion:requiereWeb?paso(pendientes):{estado_configuracion:"opcional",estado_validacion:"pendiente",faltantes:[]}}};
}
