import {hashSesionComercial} from "./sesiones-comerciales.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const texto=(x,min,max)=>typeof x==="string"&&x.trim().length>=min&&x.trim().length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(x);
const campos="empresa,giro,nombre_publico,descripcion,lema,color,revision,actualizado";
// Owner-only private draft, no contract or operational module granted by editing.
export async function crearPerfilComercial(env,{habilitado=false,autorizarComercial,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarComercial!=="function")throw Error("Perfil no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM empresas e JOIN membresias m ON m.empresa=e.id JOIN usuarios u ON u.id=m.usuario JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercio_altas_pendientes z ON z.empresa=e.id JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercio_invitaciones_propietario j ON j.alta=z.id JOIN central_implementaciones c ON c.empresa=e.id WHERE e.id=comercio_perfiles_privados.empresa AND e.activa=1 AND u.activo=1 AND m.usuario=? AND m.activa=1 AND m.rol='propietario' AND m.alcance='empresa' AND cs.hash=? AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND z.estado='aceptada' AND j.consumido IS NOT NULL AND c.estado IN ('pendiente','configuracion','revision') AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=m.empresa AND p.rol=m.rol AND p.permiso='empresa.ver') AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=m.empresa AND p.rol=m.rol AND p.permiso='empresa.administrar') AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=m.empresa AND d.usuario=m.usuario AND d.permiso IN ('empresa.ver','empresa.administrar')) AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=e.id AND s.estado IN ('suspendida','cancelada')))";
 async function contexto(r,e,metodo){
  if(habilitado!==true||!id(e)||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Perfil no disponible.");
  const a=await autorizarComercial(r,{empresa:e,permiso:"empresa.administrar"}),h=await hashSesionComercial(r),n=reloj();
  if(a?.empresa!==e||!id(a.actor)||!h||!Number.isSafeInteger(n)||n<0)throw Error("Perfil no disponible.");
  return {actor:a.actor,n,args:[a.actor,h,n,n-1800000]};
 }
 return Object.freeze({
 async consultar(r,{empresa}={}){
  const a=await contexto(r,empresa,"GET");
  const x=await q("SELECT "+campos+" FROM comercio_perfiles_privados WHERE empresa=? AND "+guard,empresa,...a.args).first();
  if(!x)throw Error("Perfil no disponible.");return x;
 },
 async guardar(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!Number.isSafeInteger(d.revision)||d.revision<1||d.revision>=Number.MAX_SAFE_INTEGER||!texto(d.nombre_publico,1,120)||!texto(d.descripcion,0,2000)||!texto(d.lema,0,160)||Object.keys(d).some(k=>!["empresa","revision","nombre_publico","descripcion","lema"].includes(k)))throw Error("Perfil inválido.");
  const res=await db.batch([
   q("UPDATE comercio_perfiles_privados SET nombre_publico=?,descripcion=?,lema=?,actualizado=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+guard+" RETURNING "+campos,d.nombre_publico.trim(),d.descripcion.trim(),d.lema.trim(),a.n,d.empresa,d.revision,...a.args),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,'perfil.basico_guardado',?,? WHERE changes()=1",d.empresa,a.actor,d.empresa,a.n)
  ]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");
  return res[0].results[0];
 }
 });
}
