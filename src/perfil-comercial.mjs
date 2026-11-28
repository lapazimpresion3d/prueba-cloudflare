import {validarHorario,estadoHorario} from "./horarios-comerciales.mjs";
import {inspeccionarJpeg} from "./seguridad-imagen-comercial.mjs";
import {hashSesionComercial} from "./sesiones-comerciales.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const texto=(x,min,max)=>typeof x==="string"&&x.trim().length>=min&&x.trim().length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(x);
const campos="empresa,giro,nombre_publico,descripcion,lema,color,revision,actualizado";
const horario="empresa,zona_horaria,horario_semanal,excepciones_horario,revision,actualizado";
const decodificarHorario=x=>({...x,horario_semanal:JSON.parse(x.horario_semanal),excepciones_horario:JSON.parse(x.excepciones_horario)});
const visual="empresa,color,color_secundario,color_acento,color_fondo,color_texto,logotipo,portada,revision,actualizado";
const colores=["color","color_secundario","color_acento","color_fondo","color_texto"];
const hex=x=>typeof x==="string"&&/^#[0-9a-fA-F]{6}$/.test(x);
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
 async consultarHorario(r,{empresa}={}){
  const a=await contexto(r,empresa,"GET");
  const x=await q("SELECT "+horario+" FROM comercio_perfiles_privados WHERE empresa=? AND "+guard,empresa,...a.args).first();
  if(!x)throw Error("Perfil no disponible.");
  const h=decodificarHorario(x);return {...h,estado:estadoHorario(h,a.n)};
 },
 async guardarHorario(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!Number.isSafeInteger(d.revision)||d.revision<1||d.revision>=Number.MAX_SAFE_INTEGER||Object.keys(d).some(k=>!["empresa","revision","zona_horaria","horario_semanal","excepciones_horario"].includes(k)))throw Error("Horario inválido.");
  const h=validarHorario(d);
  const res=await db.batch([
   q("UPDATE comercio_perfiles_privados SET zona_horaria=?,horario_semanal=?,excepciones_horario=?,actualizado=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+guard+" RETURNING "+horario,h.zona_horaria,JSON.stringify(h.horario_semanal),JSON.stringify(h.excepciones_horario),a.n,d.empresa,d.revision,...a.args),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,'perfil.horario_guardado',?,? WHERE changes()=1",d.empresa,a.actor,d.empresa,a.n)
  ]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");
  return decodificarHorario(res[0].results[0]);
 },
 async consultarVisual(r,{empresa}={}){
  const a=await contexto(r,empresa,"GET");
  const x=await q("SELECT "+visual+" FROM comercio_perfiles_privados WHERE empresa=? AND "+guard,empresa,...a.args).first();
  if(!x)throw Error("Perfil no disponible.");return x;
 },
 async guardarVisual(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!Number.isSafeInteger(d.revision)||d.revision<1||d.revision>=Number.MAX_SAFE_INTEGER||!colores.every(k=>hex(d[k]))||Object.keys(d).some(k=>!["empresa","revision",...colores,"logotipo","portada"].includes(k)))throw Error("Identidad visual inválida.");
  // Undefined means preserve; null explicitly removes the image.
  for(const [k,maximo,lado] of [["logotipo",120000,512],["portada",360000,1600]]){
   if(Object.hasOwn(d,k)&&d[k]!==null)inspeccionarJpeg(d[k],{maximo,lado});
  }
  const res=await db.batch([
   q("UPDATE comercio_perfiles_privados SET color=?,color_secundario=?,color_acento=?,color_fondo=?,color_texto=?,logotipo=CASE WHEN ?=1 THEN ? ELSE logotipo END,portada=CASE WHEN ?=1 THEN ? ELSE portada END,actualizado=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+guard+" RETURNING "+visual,...colores.map(k=>d[k].toLowerCase()),Object.hasOwn(d,"logotipo")?1:0,d.logotipo??null,Object.hasOwn(d,"portada")?1:0,d.portada??null,a.n,d.empresa,d.revision,...a.args),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,'perfil.visual_guardado',?,? WHERE changes()=1",d.empresa,a.actor,d.empresa,a.n)
  ]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");
  return res[0].results[0];
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
