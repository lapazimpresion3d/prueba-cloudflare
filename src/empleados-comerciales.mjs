import {hashSesionComercial} from "./sesiones-comerciales.mjs";
import {validarContacto} from "./contacto-comercial.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const rev=x=>Number.isSafeInteger(x)&&x>=1&&x<Number.MAX_SAFE_INTEGER;
const texto=(x,min,max)=>typeof x==="string"&&x.trim().length>=min&&x.trim().length<=max&&!/[\u0000-\u001f\u007f]/u.test(x);
const fecha=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&x>="1900-01-01"&&x<="9998-12-31"&&Number.isFinite(Date.parse(x+"T00:00:00Z"))&&new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
const campos="id,codigo,nombre,puesto,especialidad,telefono,correo,incorporacion,activo,usuario,revision,creado,actualizado";
export async function crearEmpleadosComerciales(env,{habilitado=false,autorizarComercial,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarComercial!=="function")throw Error("Empleados no configurados.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM empresas e JOIN membresias m ON m.empresa=e.id JOIN usuarios u ON u.id=m.usuario JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercio_altas_pendientes z ON z.empresa=e.id JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercio_invitaciones_propietario j ON j.alta=z.id JOIN central_implementaciones c ON c.empresa=e.id WHERE e.id=? AND m.usuario=? AND cs.hash=? AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND e.activa=1 AND m.activa=1 AND u.activo=1 AND m.rol='propietario' AND m.alcance='empresa' AND z.estado='aceptada' AND j.consumido IS NOT NULL AND c.estado IN ('pendiente','configuracion','revision') AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=e.id AND p.rol=m.rol AND p.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=e.id AND d.usuario=m.usuario AND d.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=e.id AND s.estado IN ('suspendida','cancelada')))";
 async function contexto(r,e,metodo){
  if(habilitado!==true||!id(e)||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Empleado no disponible.");
  const a=await autorizarComercial(r,{empresa:e,permiso:"usuarios.administrar"}),h=await hashSesionComercial(r),n=reloj();
  if(a?.empresa!==e||!id(a.actor)||!h||!Number.isSafeInteger(n)||n<0)throw Error("Empleado no disponible.");
  return {actor:a.actor,n,args:[e,a.actor,h,n,n-1800000]};
 }
 const log=(e,a,accion,k)=>q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,?,?,? WHERE changes()=1",e,a.actor,accion,k,a.n);
 return Object.freeze({
 async listar(r,{empresa,despues=""}={}){
  const a=await contexto(r,empresa,"GET");if(typeof despues!=="string"||despues.length>128)throw Error("Cursor inválido.");
  if(!await q("SELECT 1 AS ok WHERE "+guard,...a.args).first())throw Error("Empleado no disponible.");
  const x=(await q("SELECT "+campos+" FROM comercio_empleados WHERE empresa=? AND id>? AND "+guard+" ORDER BY id LIMIT 51",empresa,despues,...a.args).all()).results;
  return {empleados:x.slice(0,50),siguiente:x.length>50?x[49].id:null};
 },
 async guardar(r,d){
  const a=await contexto(r,d?.empresa,"POST"),crear=d.id===undefined;
  if(crear&&d.revision!==0||!crear&&(!id(d.id)||!rev(d.revision))||!texto(d.codigo,1,40)||!/^[A-Za-z0-9_-]+$/.test(d.codigo.trim())||!texto(d.nombre,1,120)||!texto(d.puesto,0,120)||!texto(d.especialidad,0,200)||!fecha(d.incorporacion)||![0,1].includes(d.activo)||Object.keys(d).some(k=>!["empresa","id","revision","codigo","nombre","puesto","especialidad","telefono","correo","incorporacion","activo"].includes(k)))throw Error("Empleado inválido.");
  const c=validarContacto({telefono:d.telefono??"",correo:d.correo??""}),k=crear?crypto.randomUUID():d.id;
  const v=[d.codigo.trim().toUpperCase(),d.nombre.trim(),d.puesto.trim(),d.especialidad.trim(),c.telefono,c.correo,d.incorporacion,d.activo];
  // A linked account must be explicitly revoked/unlinked before employee deactivation; this service never grants or revokes membership.
  const stmt=crear?q("INSERT INTO comercio_empleados(empresa,id,codigo,nombre,puesto,especialidad,telefono,correo,incorporacion,activo,creado,actualizado) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE "+guard+" RETURNING "+campos,d.empresa,k,...v,a.n,a.n,...a.args):q("UPDATE comercio_empleados SET codigo=?,nombre=?,puesto=?,especialidad=?,telefono=?,correo=?,incorporacion=?,activo=?,actualizado=MAX(actualizado,?),revision=revision+1 WHERE empresa=? AND id=? AND revision=? AND "+guard+" AND (?=1 OR usuario IS NULL OR NOT EXISTS(SELECT 1 FROM membresias m WHERE m.empresa=comercio_empleados.empresa AND m.usuario=comercio_empleados.usuario AND m.activa=1)) RETURNING "+campos,...v,a.n,d.empresa,k,d.revision,...a.args,d.activo);
  const res=await db.batch([stmt,log(d.empresa,a,"empleado.guardado",k)]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");return res[0].results[0];
 },
 async vincular(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!id(d.id)||!rev(d.revision)||!(d.usuario===null||id(d.usuario))||Object.keys(d).some(k=>!["empresa","id","revision","usuario"].includes(k)))throw Error("Vinculación inválida.");
  // Prior membership must already exist. No permission, invitation or credential is created here.
  const x=await q("SELECT usuario FROM comercio_empleados WHERE empresa=? AND id=? AND revision=? AND "+guard,d.empresa,d.id,d.revision,...a.args).first();
  if(!x||x.usuario===d.usuario)throw Error("Vinculación no disponible.");
  const res=await db.batch([
   q("UPDATE comercio_empleados SET usuario=?,revision=revision+1,actualizado=MAX(actualizado,?) WHERE empresa=? AND id=? AND revision=? AND usuario IS ? AND "+guard+" AND (? IS NULL OR (activo=1 AND EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=comercio_empleados.empresa AND m.usuario=? AND m.rol<>'propietario' AND m.activa=1 AND u.activo=1))) RETURNING "+campos,d.usuario,a.n,d.empresa,d.id,d.revision,x.usuario,...a.args,d.usuario,d.usuario),
   q("INSERT INTO comercio_empleados_vinculos(empresa,empleado,revision,anterior,posterior,actor,fecha) SELECT ?,?,?,?,?,?,? WHERE changes()=1",d.empresa,d.id,d.revision+1,x.usuario,d.usuario,a.actor,a.n),
   log(d.empresa,a,"empleado.vinculo",d.id)
  ]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");return res[0].results[0];
 }
 });
}
