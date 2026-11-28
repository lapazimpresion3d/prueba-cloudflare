import {resolverRutaAsistente,reconciliarProgreso,validarOperativosAsistente} from "./rutas-asistente.mjs";
import {hashSesionComercial} from "./sesiones-comerciales.mjs";
export const pasosAsistenteV1=Object.freeze(["inicio","perfil","presentacion","sucursales","personal","modulos","revision"]);
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const rev=x=>Number.isSafeInteger(x)&&x>=0&&x<Number.MAX_SAFE_INTEGER;
const inicial=()=>({revision:0,esquema:1,paso:"inicio",visitados:["inicio"],estado:"sin_iniciar",fecha:null});
const dec=x=>x?{revision:x.revision,esquema:x.esquema,paso:x.paso,visitados:JSON.parse(x.visitados),estado:x.estado,fecha:x.fecha}:inicial();
// Navigation is never proof of completion. No caller-provided completion or readiness.
export function avanzarAsistente(actual,{paso,accion}={}){
 if(!["navegar","pausar","reanudar"].includes(accion)||!pasosAsistenteV1.includes(paso))throw Error("Progreso inválido.");
 if(actual.estado==="sin_iniciar"&&(accion!=="navegar"||paso!=="inicio"))throw Error("Iniciar primero.");
 if(actual.estado==="pausado"&&(accion!=="reanudar"||paso!==actual.paso))throw Error("Reanudar primero.");
 if(accion==="reanudar"&&actual.estado!=="pausado"||accion==="pausar"&&(actual.estado!=="en_curso"||paso!==actual.paso))throw Error("Transición inválida.");
 const visitados=pasosAsistenteV1.filter(k=>actual.visitados.includes(k)||k===paso);
 return {esquema:1,paso,visitados,estado:accion==="pausar"?"pausado":"en_curso"};
}
export async function crearAsistenteImplementacion(env,{habilitado=false,autorizarComercial,reloj=Date.now,operativos=[]}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarComercial!=="function"||!validarOperativosAsistente(operativos))throw Error("Asistente no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const disponibilidad=Object.freeze([...operativos]);
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM empresas e JOIN membresias m ON m.empresa=e.id JOIN usuarios u ON u.id=m.usuario JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercio_altas_pendientes z ON z.empresa=e.id JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercio_invitaciones_propietario j ON j.alta=z.id JOIN central_implementaciones c ON c.empresa=e.id WHERE e.id=? AND m.usuario=? AND cs.hash=? AND NOT EXISTS(SELECT 1 FROM comercio_acceso_corte ac WHERE ac.empresa=m.empresa AND ac.usuario=m.usuario AND cs.creado<=ac.desde) AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND e.activa=1 AND m.activa=1 AND u.activo=1 AND m.rol='propietario' AND m.alcance='empresa' AND z.estado='aceptada' AND j.consumido IS NOT NULL AND c.estado IN ('pendiente','configuracion','revision') AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=e.id AND p.rol=m.rol AND p.permiso='empresa.administrar') AND EXISTS(SELECT 1 FROM rol_permisos rp WHERE rp.empresa=m.empresa AND rp.rol=m.rol AND rp.permiso='empresa.ver') AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=e.id AND d.usuario=m.usuario AND d.permiso IN ('empresa.ver','empresa.administrar')) AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=e.id AND s.estado IN ('suspendida','cancelada')))";
 async function contexto(r,e,metodo){
  if(habilitado!==true||!id(e)||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Asistente no disponible.");
  const a=await autorizarComercial(r,{empresa:e,permiso:"empresa.administrar"}),h=await hashSesionComercial(r),n=reloj();
  if(a?.empresa!==e||!id(a.actor)||!h||!Number.isSafeInteger(n)||n<0)throw Error("Asistente no disponible.");
  return {actor:a.actor,n,args:[e,a.actor,h,n,n-1800000]};
 }
 const leer=(e,a)=>q("SELECT p.giro,c.estado AS implementacion,c.revision AS revision_implementacion,p.revision AS revision_perfil,x.revision,x.esquema,x.paso,x.visitados,x.estado,x.fecha,k.empresa AS contrato,pl.id AS plan,pl.version AS version_plan,pl.usuarios,pl.sucursales,pl.modulos AS contratados,s.estado AS suscripcion,s.inicio,s.vence,COALESCE(s.revision,0) AS revision_contrato,COALESCE(ac.revision,0) AS revision_activacion,ac.modulos AS seleccion,(SELECT count(*) FROM membresias WHERE empresa=p.empresa AND activa=1)<=pl.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=p.empresa AND activa=1)<=pl.sucursales AS limites FROM comercio_perfiles_privados p JOIN central_implementaciones c ON c.empresa=p.empresa LEFT JOIN comercio_asistente_progreso x ON x.empresa=p.empresa AND x.revision=(SELECT MAX(revision) FROM comercio_asistente_progreso WHERE empresa=p.empresa) LEFT JOIN comercial_contratos_iniciales k ON k.empresa=p.empresa LEFT JOIN comercial_suscripciones s ON s.empresa=k.empresa LEFT JOIN comercial_planes pl ON pl.id=COALESCE(s.plan,k.plan) AND pl.version=COALESCE(s.version,k.version) LEFT JOIN comercial_activaciones ac ON ac.empresa=k.empresa WHERE p.empresa=? AND "+guard,e,...a.args).first();
 const ruta=(x,n)=>resolverRutaAsistente({giro:x.giro,operativos:disponibilidad,ahora:n,contrato:x.contrato?{plan:x.plan,version:x.version_plan,usuarios:x.usuarios,sucursales:x.sucursales,modulos:JSON.parse(x.contratados),seleccion:x.seleccion?JSON.parse(x.seleccion):[],estado:x.suscripcion,inicio:x.inicio,vence:x.vence,limites:x.limites===1,revision:x.revision_contrato,revisionActivacion:x.revision_activacion}:null});
 const vista=(x,n)=>{const recorrido=ruta(x,n),progreso=reconciliarProgreso(dec(x.revision===null?null:x),recorrido);return {progreso,giro:x.giro,implementacion:x.implementacion,revision_implementacion:x.revision_implementacion,revision_perfil:x.revision_perfil,preparado:false,validacion:"pendiente",ruta:recorrido,pasos:recorrido.pasos.map(p=>({...p,visitado:progreso.revision>0&&progreso.visitados.includes(p.id),estado_validacion:"pendiente"}))};};
 return Object.freeze({
 async consultar(r,{empresa}={}){
  const a=await contexto(r,empresa,"GET"),x=await leer(empresa,a);
  if(!x)throw Error("Asistente no disponible.");return vista(x,a.n);
 },
 async guardar(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!rev(d.revision)||Object.keys(d).some(k=>!["empresa","revision","paso","accion"].includes(k)))throw Error("Progreso inválido.");
  const x=await leer(d.empresa,a);
  if(!x||(x.revision??0)!==d.revision)throw Error("Conflicto de revisión o autorización.");
  const recorrido=ruta(x,a.n),anterior=dec(x.revision===null?null:x),actual=reconciliarProgreso(anterior,recorrido);
  if(!recorrido.pasos.some(p=>p.id===d.paso))throw Error("Paso no aplicable.");
  const p=avanzarAsistente(actual,d);
  // Preserve historical visits even while steps are hidden after a contract change.
  p.visitados=pasosAsistenteV1.filter(k=>anterior.visitados.includes(k)||p.visitados.includes(k));
  const res=await db.batch([
   q("INSERT INTO comercio_asistente_progreso(empresa,revision,esquema,paso,visitados,estado,actor,fecha) SELECT ?,?,1,?,?,?,?,? WHERE "+guard+" AND (SELECT COALESCE(MAX(revision),0) FROM comercio_asistente_progreso WHERE empresa=?)=? AND (SELECT COALESCE(MAX(revision),0) FROM comercial_suscripciones WHERE empresa=?)=? AND (SELECT COALESCE(MAX(revision),0) FROM comercial_activaciones WHERE empresa=?)=? AND (SELECT count(*) FROM comercial_contratos_iniciales WHERE empresa=?)=? RETURNING revision,esquema,paso,visitados,estado,fecha",d.empresa,d.revision+1,p.paso,JSON.stringify(p.visitados),p.estado,a.actor,a.n,...a.args,d.empresa,d.revision,d.empresa,x.revision_contrato,d.empresa,x.revision_activacion,d.empresa,x.contrato?1:0),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,'asistente.progreso_guardado',?,? WHERE changes()=1",d.empresa,a.actor,p.paso,a.n)
  ]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");
  return {progreso:dec(res[0].results[0]),preparado:false,validacion:"pendiente"};
 },
 async historial(r,{empresa,antes=null}={}){
  const a=await contexto(r,empresa,"GET");
  if(antes!==null&&(!rev(antes)||antes===0)||!await leer(empresa,a))throw Error("Asistente no disponible.");
  return (await q("SELECT revision,esquema,paso,visitados,estado,fecha FROM comercio_asistente_progreso WHERE empresa=? AND "+guard+" AND (? IS NULL OR revision<?) ORDER BY revision DESC LIMIT 50",empresa,...a.args,antes,antes).all()).results.map(dec);
 }
 });
}
