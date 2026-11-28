import {validarPresentacion,proyectarPresentacion} from "./presentacion-comercial.mjs";
import {validarContacto,proyectarContacto} from "./contacto-comercial.mjs";
import {validarHorario,estadoHorario} from "./horarios-comerciales.mjs";
import {inspeccionarJpeg} from "./seguridad-imagen-comercial.mjs";
import {hashSesionComercial} from "./sesiones-comerciales.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const texto=(x,min,max)=>typeof x==="string"&&x.trim().length>=min&&x.trim().length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(x);
const campos="empresa,giro,nombre_publico,descripcion,lema,color,revision,actualizado";
const contacto="empresa,contacto,revision,actualizado";
const decodificarContacto=x=>{const c=validarContacto(JSON.parse(x.contacto));return {...x,contacto:c,vista_previa:proyectarContacto(c)};};
const horario="empresa,zona_horaria,horario_semanal,excepciones_horario,revision,actualizado";
const decodificarHorario=x=>({...x,horario_semanal:JSON.parse(x.horario_semanal),excepciones_horario:JSON.parse(x.excepciones_horario)});
const visual="empresa,color,color_secundario,color_acento,color_fondo,color_texto,logotipo,portada,revision,actualizado";
const colores=["color","color_secundario","color_acento","color_fondo","color_texto"];
const hex=x=>typeof x==="string"&&/^#[0-9a-fA-F]{6}$/.test(x);
// Owner-only private draft, no contract or operational module granted by editing.
export async function crearPerfilComercial(env,{habilitado=false,autorizarComercial,reloj=Date.now,operativos=[]}={}){
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
 // Publication is an internal approved snapshot, not deployment. Web entitlement is checked atomically.
 const web="EXISTS(SELECT 1 FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version JOIN comercial_activaciones a ON a.empresa=s.empresa WHERE s.empresa=comercio_perfiles_privados.empresa AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>? AND EXISTS(SELECT 1 FROM json_each(p.modulos) WHERE value='web') AND EXISTS(SELECT 1 FROM json_each(a.modulos) WHERE value='web') AND (SELECT count(*) FROM membresias WHERE empresa=s.empresa AND activa=1)<=p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=s.empresa AND activa=1)<=p.sucursales)";
 const webDisponible=Array.isArray(operativos)&&operativos.includes("web");
 const versionValida=x=>Number.isSafeInteger(x)&&x>=0&&x<Number.MAX_SAFE_INTEGER;
 async function publicarVersion(r,d,restaurar){
  const a=await contexto(r,d?.empresa,"POST");
  if(!webDisponible||!versionValida(d.revision)||d.revision<1||!versionValida(d.versionActual)||Object.keys(d).some(k=>!["empresa","revision","versionActual",...(restaurar?["versionOrigen"]:[])].includes(k))||restaurar&&(!versionValida(d.versionOrigen)||d.versionOrigen<1||d.versionOrigen>=d.versionActual))throw Error("Publicación inválida.");
  const x=await q("SELECT * FROM comercio_perfiles_privados WHERE empresa=? AND revision=? AND "+guard,d.empresa,d.revision,...a.args).first();
  if(!x)throw Error("Perfil no disponible.");
  let contenido,revision=d.revision;
  if(restaurar){
   const previa=await q("SELECT contenido,revision_perfil FROM comercio_publicaciones_perfil WHERE empresa=? AND version=?",d.empresa,d.versionOrigen).first();
   if(!previa)throw Error("Publicación no disponible.");
   // Never restore historical contact visibility: historical content may contain withdrawn personal details.
   const historica=JSON.parse(previa.contenido),actual=proyectarPresentacion(x);
   delete historica.contacto;
   if(historica.secciones.includes("contacto")&&actual.contacto)historica.contacto=actual.contacto;
   contenido=JSON.stringify(historica);revision=previa.revision_perfil;
  }else contenido=JSON.stringify(proyectarPresentacion(x));
  if(contenido.length>600000)throw Error("Publicación inválida.");
  const v=d.versionActual+1;
  const res=await db.batch([
   q("INSERT INTO comercio_publicaciones_perfil(empresa,version,revision_perfil,restaurada_de,actor,fecha,contenido) SELECT empresa,?,?,?,?,?,? FROM comercio_perfiles_privados WHERE empresa=? AND revision=? AND "+guard+" AND "+web+" AND (SELECT COALESCE(MAX(version),0) FROM comercio_publicaciones_perfil WHERE empresa=?)=? RETURNING version,revision_perfil,restaurada_de",v,revision,restaurar?d.versionOrigen:null,a.actor,a.n,contenido,d.empresa,d.revision,...a.args,a.n,a.n,d.empresa,d.versionActual),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,?,?,? WHERE changes()=1",d.empresa,a.actor,restaurar?"perfil.publicacion_restaurada":"perfil.publicado",String(v),a.n)
  ]);
  if(!res[0].results?.length)throw Error("Conflicto de publicación o autorización.");
  return {...res[0].results[0],contenido:JSON.parse(contenido)};
 }
 return Object.freeze({
 async vistaPrevia(r,{empresa}={}){
  const a=await contexto(r,empresa,"GET");
  const x=await q("SELECT *, (SELECT COALESCE(MAX(version),0) FROM comercio_publicaciones_perfil WHERE empresa=comercio_perfiles_privados.empresa) AS version_publicada FROM comercio_perfiles_privados WHERE empresa=? AND "+guard,empresa,...a.args).first();
  if(!x)throw Error("Perfil no disponible.");
  return {revision:x.revision,version_publicada:x.version_publicada,configuracion:validarPresentacion(JSON.parse(x.presentacion)),contenido:proyectarPresentacion(x)};
 },
 async guardarPresentacion(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!versionValida(d.revision)||d.revision<1||!Object.hasOwn(d,"presentacion")||Object.keys(d).some(k=>!["empresa","revision","presentacion"].includes(k)))throw Error("Presentación inválida.");
  const p=validarPresentacion(d.presentacion);
  const res=await db.batch([
   q("UPDATE comercio_perfiles_privados SET presentacion=?,actualizado=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+guard+" RETURNING revision",JSON.stringify(p),a.n,d.empresa,d.revision,...a.args),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,'perfil.presentacion_guardada',?,? WHERE changes()=1",d.empresa,a.actor,d.empresa,a.n)
  ]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");
  return {revision:res[0].results[0].revision,presentacion:p};
 },
 async publicar(r,d){return publicarVersion(r,d,false);},
 async restaurarPublicacion(r,d){return publicarVersion(r,d,true);},
 async consultarPublicacion(r,{empresa,version=null}={}){
  const a=await contexto(r,empresa,"GET");
  if(version!==null&&(!versionValida(version)||version<1))throw Error("Publicación inválida.");
  const x=await q("SELECT p.version,p.revision_perfil,p.restaurada_de,p.fecha,p.contenido FROM comercio_perfiles_privados JOIN comercio_publicaciones_perfil p ON p.empresa=comercio_perfiles_privados.empresa WHERE comercio_perfiles_privados.empresa=? AND "+guard+" AND (? IS NULL OR p.version=?) ORDER BY p.version DESC LIMIT 1",empresa,...a.args,version,version).first();
  return x?{...x,contenido:JSON.parse(x.contenido)}:null;
 },
 async historialPublicaciones(r,{empresa,antes=null}={}){
  const a=await contexto(r,empresa,"GET");
  if(antes!==null&&(!versionValida(antes)||antes<1))throw Error("Publicación inválida.");
  const autorizado=await q("SELECT empresa FROM comercio_perfiles_privados WHERE empresa=? AND "+guard,empresa,...a.args).first();
  if(!autorizado)throw Error("Perfil no disponible.");
  return (await q("SELECT p.version,p.revision_perfil,p.restaurada_de,p.fecha FROM comercio_perfiles_privados JOIN comercio_publicaciones_perfil p ON p.empresa=comercio_perfiles_privados.empresa WHERE comercio_perfiles_privados.empresa=? AND "+guard+" AND (? IS NULL OR p.version<?) ORDER BY p.version DESC LIMIT 50",empresa,...a.args,antes,antes).all()).results;
 },
 async consultar(r,{empresa}={}){
  const a=await contexto(r,empresa,"GET");
  const x=await q("SELECT "+campos+" FROM comercio_perfiles_privados WHERE empresa=? AND "+guard,empresa,...a.args).first();
  if(!x)throw Error("Perfil no disponible.");return x;
 },
 async consultarContacto(r,{empresa}={}){
  const a=await contexto(r,empresa,"GET");
  const x=await q("SELECT "+contacto+" FROM comercio_perfiles_privados WHERE empresa=? AND "+guard,empresa,...a.args).first();
  if(!x)throw Error("Perfil no disponible.");return decodificarContacto(x);
 },
 async guardarContacto(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!Number.isSafeInteger(d.revision)||d.revision<1||d.revision>=Number.MAX_SAFE_INTEGER||!Object.hasOwn(d,"contacto")||Object.keys(d).some(k=>!["empresa","revision","contacto"].includes(k)))throw Error("Contacto inválido.");
  const c=validarContacto(d.contacto),json=JSON.stringify(c);
  if(json.length>16000)throw Error("Contacto inválido.");
  const res=await db.batch([
   q("UPDATE comercio_perfiles_privados SET contacto=?,actualizado=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+guard+" RETURNING "+contacto,json,a.n,d.empresa,d.revision,...a.args),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,'perfil.contacto_guardado',?,? WHERE changes()=1",d.empresa,a.actor,d.empresa,a.n)
  ]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");return decodificarContacto(res[0].results[0]);
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
