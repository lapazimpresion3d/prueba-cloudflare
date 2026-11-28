import {hashSesionComercial} from "./sesiones-comerciales.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const rev=x=>Number.isSafeInteger(x)&&x>=0&&x<Number.MAX_SAFE_INTEGER;
const lista=(x,max)=>Array.isArray(x)&&x.length<=max&&new Set(x).size===x.length&&x.every(id);
const claves=(d,k)=>Object.keys(d).every(x=>k.includes(x));
export async function crearAsignacionesPersonal(env,{habilitado=false,autorizarComercial,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarComercial!=="function")throw Error("Asignaciones no configuradas.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM empresas e JOIN membresias m ON m.empresa=e.id JOIN usuarios u ON u.id=m.usuario JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercio_altas_pendientes z ON z.empresa=e.id JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercio_invitaciones_propietario j ON j.alta=z.id JOIN central_implementaciones c ON c.empresa=e.id WHERE e.id=? AND m.usuario=? AND cs.hash=? AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND e.activa=1 AND m.activa=1 AND u.activo=1 AND m.rol='propietario' AND m.alcance='empresa' AND z.estado='aceptada' AND j.consumido IS NOT NULL AND c.estado IN ('pendiente','configuracion','revision') AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=e.id AND p.rol=m.rol AND p.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=e.id AND d.usuario=m.usuario AND d.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=e.id AND s.estado IN ('suspendida','cancelada')))";
 async function contexto(r,e,metodo){
  if(habilitado!==true||!id(e)||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Asignación no disponible.");
  const a=await autorizarComercial(r,{empresa:e,permiso:"usuarios.administrar"}),h=await hashSesionComercial(r),n=reloj();
  if(a?.empresa!==e||!id(a.actor)||!h||!Number.isSafeInteger(n)||n<0)throw Error("Asignación no disponible.");
  return {actor:a.actor,n,args:[e,a.actor,h,n,n-1800000]};
 }
 const log=(e,a,accion,k)=>q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,?,?,? WHERE changes()=1",e,a.actor,accion,k,a.n);
 async function ejecutar(stm){const res=await db.batch(stm);if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");return res[0].results[0];}
 return Object.freeze({
 async guardarServicio(r,d){
  const a=await contexto(r,d?.empresa,"POST"),nuevo=d.id===undefined;
  if(!rev(d.revision)||nuevo&&d.revision!==0||!nuevo&&(!id(d.id)||d.revision===0)||typeof d.codigo!=="string"||!/^[A-Za-z0-9_-]{1,40}$/.test(d.codigo)||typeof d.nombre!=="string"||!d.nombre.trim()||d.nombre.trim().length>120||/[\u0000-\u001f\u007f]/u.test(d.nombre)||![0,1].includes(d.activo)||!claves(d,["empresa","id","revision","codigo","nombre","activo"]))throw Error("Servicio inválido.");
  const k=nuevo?crypto.randomUUID():d.id;
  const stmt=nuevo?q("INSERT INTO comercio_servicios_personal(empresa,id,codigo,nombre,activo,revision) SELECT ?,?,?,?,?,1 WHERE "+guard+" RETURNING id,revision",d.empresa,k,d.codigo.toUpperCase(),d.nombre.trim(),d.activo,...a.args):q("UPDATE comercio_servicios_personal SET codigo=?,nombre=?,activo=?,revision=revision+1 WHERE empresa=? AND id=? AND revision=? AND "+guard+" RETURNING id,revision",d.codigo.toUpperCase(),d.nombre.trim(),d.activo,d.empresa,k,d.revision,...a.args);
  return ejecutar([stmt,log(d.empresa,a,"personal.servicio_guardado",k)]);
 },
 async asignarLabor(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!id(d.empleado)||!rev(d.revision)||!lista(d.sucursales,20)||!lista(d.servicios,100)||!(d.sucursales.length?d.sucursales.includes(d.principal):d.principal===null&&d.servicios.length===0)||!claves(d,["empresa","empleado","revision","principal","sucursales","servicios"]))throw Error("Asignación inválida.");
  return ejecutar([q("INSERT INTO comercio_asignaciones_personal(empresa,empleado,revision,principal,sucursales,servicios,actor,fecha) SELECT ?,?,?,?,?,?,?,? WHERE "+guard+" AND (SELECT COALESCE(MAX(revision),0) FROM comercio_asignaciones_personal WHERE empresa=? AND empleado=?)=? RETURNING revision",d.empresa,d.empleado,d.revision+1,d.principal,JSON.stringify([...d.sucursales].sort()),JSON.stringify([...d.servicios].sort()),a.actor,a.n,...a.args,d.empresa,d.empleado,d.revision),log(d.empresa,a,"personal.labor_asignada",d.empleado)]);
 },
 async asignarAcceso(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!id(d.empleado)||!id(d.usuario)||!id(d.rol)||!rev(d.revision)||!lista(d.sucursales,20)||!d.sucursales.length||!claves(d,["empresa","empleado","usuario","rol","revision","sucursales"]))throw Error("Acceso inválido.");
  // Insert authorization/history first. Subsequent statements are gated by its unique revision and actor; no membership activation.
  const marca=crypto.randomUUID(),obj=d.usuario+":"+marca;
  const filtro="EXISTS(SELECT 1 FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE s.empresa=? AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>? AND (SELECT count(*) FROM membresias WHERE empresa=s.empresa AND activa=1)<=p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=s.empresa AND activa=1)<=p.sucursales)";
  const cond="EXISTS(SELECT 1 FROM comercio_auditoria WHERE empresa=? AND actor=? AND accion='personal.acceso_asignado' AND objetivo=?)",c=[d.empresa,a.actor,obj];
  return ejecutar([
   q("INSERT INTO comercio_asignaciones_acceso(empresa,usuario,revision,empleado,rol,sucursales,actor,fecha) SELECT ?,?,?,?,?,?,?,? WHERE "+guard+" AND "+filtro+" AND (SELECT COALESCE(MAX(revision),0) FROM comercio_asignaciones_acceso WHERE empresa=? AND usuario=?)=? RETURNING revision",d.empresa,d.usuario,d.revision+1,d.empleado,d.rol,JSON.stringify([...d.sucursales].sort()),a.actor,a.n,...a.args,d.empresa,a.n,a.n,d.empresa,d.usuario,d.revision),
   log(d.empresa,a,"personal.acceso_asignado",obj),
   q("UPDATE membresias SET rol=?,alcance='sucursales' WHERE empresa=? AND usuario=? AND activa=1 AND rol<>'propietario' AND "+cond,d.rol,d.empresa,d.usuario,...c),
   q("DELETE FROM membresia_sucursales WHERE empresa=? AND usuario=? AND "+cond,d.empresa,d.usuario,...c),
   q("INSERT INTO membresia_sucursales(empresa,usuario,sucursal) SELECT ?,?,value FROM json_each(?) WHERE "+cond,d.empresa,d.usuario,JSON.stringify(d.sucursales),...c)
  ]);
 },
 async consultar(r,{empresa,empleado}={}){
  const a=await contexto(r,empresa,"GET");if(!id(empleado))throw Error("Empleado inválido.");
  const e=await q("SELECT id,activo,usuario FROM comercio_empleados WHERE empresa=? AND id=? AND "+guard,empresa,empleado,...a.args).first();
  if(!e)throw Error("Empleado no disponible.");
  const x=await q("SELECT revision,principal,sucursales,servicios FROM comercio_asignaciones_personal WHERE empresa=? AND empleado=? AND "+guard+" ORDER BY revision DESC LIMIT 1",empresa,empleado,...a.args).first();
  const sucursales=x?JSON.parse(x.sucursales):[],servicios=x?JSON.parse(x.servicios):[];
  const activas=(await q("SELECT id FROM sucursales WHERE empresa=? AND activa=1 AND "+guard,empresa,...a.args).all()).results.map(v=>v.id);
  const habilitados=(await q("SELECT id FROM comercio_servicios_personal WHERE empresa=? AND activo=1 AND "+guard,empresa,...a.args).all()).results.map(v=>v.id);
  const m=e.usuario?await q("SELECT m.rol,m.activa,m.alcance,(SELECT COALESCE(MAX(revision),0) FROM comercio_asignaciones_acceso WHERE empresa=m.empresa AND usuario=m.usuario) AS revision FROM membresias m WHERE m.empresa=? AND m.usuario=? AND "+guard,empresa,e.usuario,...a.args).first():null;
  const acceso=m?{...m,sucursales:(await q("SELECT sucursal FROM membresia_sucursales WHERE empresa=? AND usuario=? AND "+guard+" ORDER BY sucursal",empresa,e.usuario,...a.args).all()).results.map(v=>v.sucursal)}:null;
  return {revision:x?.revision??0,principal:x?.principal??null,sucursales,servicios,sucursales_efectivas:e.activo?sucursales.filter(k=>activas.includes(k)):[],servicios_efectivos:e.activo&&sucursales.some(k=>activas.includes(k))?servicios.filter(k=>habilitados.includes(k)):[],acceso};
 },
 async listarServicios(r,{empresa,despues=""}={}){
  const a=await contexto(r,empresa,"GET");if(typeof despues!=="string"||despues.length>128||!await q("SELECT 1 AS ok WHERE "+guard,...a.args).first())throw Error("Consulta no disponible.");
  const x=(await q("SELECT id,codigo,nombre,activo,revision FROM comercio_servicios_personal WHERE empresa=? AND id>? AND "+guard+" ORDER BY id LIMIT 51",empresa,despues,...a.args).all()).results;
  return {servicios:x.slice(0,50),siguiente:x.length>50?x[49].id:null};
 }
 });
}
