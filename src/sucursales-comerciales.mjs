import {hashSesionComercial} from "./sesiones-comerciales.mjs";
import {validarContacto} from "./contacto-comercial.mjs";
import {validarHorario} from "./horarios-comerciales.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const rev=x=>Number.isSafeInteger(x)&&x>=1&&x<Number.MAX_SAFE_INTEGER;
const nombre=x=>typeof x==="string"&&x.trim().length>0&&x.trim().length<=120&&!/[\u0000-\u001f\u007f]/u.test(x);
export async function crearSucursalesComerciales(env,{habilitado=false,autorizarComercial,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarComercial!=="function")throw Error("Sucursales no configuradas.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM empresas e JOIN membresias m ON m.empresa=e.id JOIN usuarios u ON u.id=m.usuario JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercio_altas_pendientes z ON z.empresa=e.id JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercio_invitaciones_propietario j ON j.alta=z.id JOIN central_implementaciones c ON c.empresa=e.id WHERE e.id=? AND m.usuario=? AND cs.hash=? AND NOT EXISTS(SELECT 1 FROM comercio_acceso_corte ac WHERE ac.empresa=m.empresa AND ac.usuario=m.usuario AND cs.creado<=ac.desde) AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND e.activa=1 AND m.activa=1 AND u.activo=1 AND m.rol='propietario' AND m.alcance='empresa' AND z.estado='aceptada' AND j.consumido IS NOT NULL AND c.estado IN ('pendiente','configuracion','revision') AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=e.id AND p.rol=m.rol AND p.permiso='sucursales.administrar') AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=e.id AND d.usuario=m.usuario AND d.permiso='sucursales.administrar') AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=e.id AND s.estado IN ('suspendida','cancelada')))";
 const limite="(SELECT count(*) FROM sucursales WHERE empresa=? AND activa=1)<COALESCE((SELECT p.sucursales FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE s.empresa=? AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>?),1)";
 async function contexto(r,e,metodo){
  if(habilitado!==true||!id(e)||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Sucursal no disponible.");
  const a=await autorizarComercial(r,{empresa:e,permiso:"sucursales.administrar"}),h=await hashSesionComercial(r),n=reloj();
  if(a?.empresa!==e||!id(a.actor)||!h||!Number.isSafeInteger(n)||n<0)throw Error("Sucursal no disponible.");
  return {actor:a.actor,n,args:[e,a.actor,h,n,n-1800000],lim:[e,e,n,n]};
 }
 const log=(e,a,accion,obj)=>q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,?,?,? WHERE changes()=1",e,a.actor,accion,obj,a.n);
 const dec=x=>({...x,contacto:x.contacto===null?null:JSON.parse(x.contacto),horario:x.horario===null?null:JSON.parse(x.horario)});
 return Object.freeze({
 async listar(r,{empresa,despues=""}={}){
  const a=await contexto(r,empresa,"GET");if(typeof despues!=="string"||despues.length>128)throw Error("Cursor inválido.");
  if(!await q("SELECT 1 AS ok WHERE "+guard,...a.args).first())throw Error("Sucursal no disponible.");
  const res=await q("SELECT s.id,s.nombre,s.activa,s.revision,s.contacto,s.horario,CASE WHEN p.sucursal=s.id THEN 1 ELSE 0 END AS principal,p.revision AS revision_principal FROM sucursales s LEFT JOIN comercio_sucursal_principal p ON p.empresa=s.empresa WHERE s.empresa=? AND s.id>? AND "+guard+" ORDER BY s.id LIMIT 51",empresa,despues,...a.args).all();
  const filas=res.results;return {sucursales:filas.slice(0,50).map(dec),siguiente:filas.length>50?filas[49].id:null};
 },
 async guardar(r,d){
  const a=await contexto(r,d?.empresa,"POST"),crear=d.id===undefined;
  if(!nombre(d.nombre)||![0,1].includes(d.activa)||crear&&d.revision!==0||!crear&&(!id(d.id)||!rev(d.revision))||Object.keys(d).some(k=>!["empresa","id","revision","nombre","activa","contacto","horario"].includes(k))||!Object.hasOwn(d,"contacto")||!Object.hasOwn(d,"horario"))throw Error("Sucursal inválida.");
  const c=d.contacto===null?null:JSON.stringify(validarContacto(d.contacto)),h=d.horario===null?null:JSON.stringify(validarHorario(d.horario)),k=crear?crypto.randomUUID():d.id;
  const stmt=crear?q("INSERT INTO sucursales(empresa,id,nombre,activa,contacto,horario) SELECT ?,?,?,?,?,? WHERE "+guard+" AND (?=0 OR "+limite+") RETURNING id,revision",d.empresa,k,d.nombre.trim(),d.activa,c,h,...a.args,d.activa,...a.lim):q("UPDATE sucursales SET nombre=?,activa=?,contacto=?,horario=?,revision=revision+1 WHERE empresa=? AND id=? AND revision=? AND "+guard+" AND (?=0 OR activa=1 OR "+limite+") RETURNING id,revision",d.nombre.trim(),d.activa,c,h,d.empresa,k,d.revision,...a.args,d.activa,...a.lim);
  const res=await db.batch([stmt,log(d.empresa,a,"sucursal.configurada",k)]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión, límite o autorización.");
  return res[0].results[0];
 },
 async principal(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!id(d.id)||!rev(d.revision)||Object.keys(d).some(k=>!["empresa","id","revision"].includes(k)))throw Error("Sucursal inválida.");
  const res=await db.batch([q("UPDATE comercio_sucursal_principal SET sucursal=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+guard+" AND EXISTS(SELECT 1 FROM sucursales WHERE empresa=? AND id=? AND activa=1) RETURNING sucursal,revision",d.id,d.empresa,d.revision,...a.args,d.empresa,d.id),log(d.empresa,a,"sucursal.principal",d.id)]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");return res[0].results[0];
 }
 });
}
