import {crearFlujoOidc} from "./flujo-oidc.mjs";
import {hashSesionComercial} from "./sesiones-comerciales.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
const tokenValido=t=>typeof t==="string"&&/^[a-f0-9]{64}$/.test(t);
export async function crearInvitacionesEmpleados(env,{habilitado=false,autorizarComercial,reloj=Date.now,config,transporte=fetch,limitarInicio}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarComercial!=="function"||typeof limitarInicio!=="function")throw Error("Invitaciones no configuradas.");
 const flujo=await crearFlujoOidc(env,{habilitado,config,reloj,transporte,proposito:"empleado",limitarInicio});
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM empresas e JOIN membresias m ON m.empresa=e.id JOIN usuarios u ON u.id=m.usuario JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercio_altas_pendientes z ON z.empresa=e.id JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercio_invitaciones_propietario j ON j.alta=z.id JOIN central_implementaciones c ON c.empresa=e.id WHERE e.id=? AND m.usuario=? AND cs.hash=? AND NOT EXISTS(SELECT 1 FROM comercio_acceso_corte ac WHERE ac.empresa=m.empresa AND ac.usuario=m.usuario AND cs.creado<=ac.desde) AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND e.activa=1 AND m.activa=1 AND u.activo=1 AND m.rol='propietario' AND m.alcance='empresa' AND z.estado='aceptada' AND j.consumido IS NOT NULL AND c.estado IN ('pendiente','configuracion','revision') AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=e.id AND p.rol=m.rol AND p.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=e.id AND d.usuario=m.usuario AND d.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=e.id AND s.estado IN ('suspendida','cancelada')))";
 const origen=new URL(config.retorno).origin;
 const capacidad="EXISTS(SELECT 1 FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE s.empresa=? AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>? AND (SELECT count(*) FROM membresias WHERE empresa=s.empresa AND activa=1)<p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=s.empresa AND activa=1)<=p.sucursales)";
 async function contexto(r,e){
  if(habilitado!==true||!id(e)||r.method!=="POST"||new URL(r.url).origin!==origen||r.headers.get("Origin")!==origen)throw Error("Operación no permitida.");
  const a=await autorizarComercial(r,{empresa:e,permiso:"usuarios.administrar"}),h=await hashSesionComercial(r),n=reloj();
  if(a?.empresa!==e||!id(a.actor)||!h||!Number.isSafeInteger(n)||n<0||n>Number.MAX_SAFE_INTEGER-86400000)throw Error("Operación no permitida.");
  return {actor:a.actor,n,args:[e,a.actor,h,n,n-1800000]};
 }
 const log=(e,a,accion,k)=>q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,?,?,? WHERE changes()=1",e,a.actor,accion,k,a.n);
 async function ejecutar(stm){const res=await db.batch(stm);if(!res[0].results?.length)throw Error("Operación no disponible.");return res[0].results[0];}
 return Object.freeze({
 async emitir(r,d){
  const a=await contexto(r,d?.empresa);
  if(!id(d.empleado)||!id(d.rol)||!Array.isArray(d.sucursales)||!d.sucursales.length||d.sucursales.length>20||new Set(d.sucursales).size!==d.sucursales.length||!d.sucursales.every(id)||Object.keys(d).some(k=>!["empresa","empleado","rol","sucursales"].includes(k)))throw Error("Invitación inválida.");
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join(""),h=await hash(token),k=crypto.randomUUID(),s=JSON.stringify(d.sucursales);
  await ejecutar([q("INSERT INTO comercio_invitaciones_empleado(id,empresa,empleado,hash,correo,rol,sucursales,actor,creado,expira) SELECT ?,empresa,id,?,lower(correo),?,?,?,?,? FROM comercio_empleados WHERE empresa=? AND id=? AND activo=1 AND usuario IS NULL AND correo<>'' AND "+guard+" AND "+capacidad+" AND EXISTS(SELECT 1 FROM comercio_roles_operativos WHERE empresa=? AND rol=?) AND NOT EXISTS(SELECT 1 FROM json_each(?) j WHERE NOT EXISTS(SELECT 1 FROM sucursales b WHERE b.empresa=? AND b.id=j.value AND b.activa=1)) AND NOT EXISTS(SELECT 1 FROM comercio_invitaciones_empleado i WHERE i.empresa=? AND i.empleado=? AND i.consumido IS NULL AND i.cancelado IS NULL AND i.expira>?) RETURNING id",k,h,d.rol,s,a.actor,a.n,a.n+86400000,d.empresa,d.empleado,...a.args,d.empresa,a.n,a.n,d.empresa,d.rol,s,d.empresa,d.empresa,d.empleado,a.n),log(d.empresa,a,"empleado.invitacion_emitida",k)]);
  return {id:k,token,expira:a.n+86400000};
 },
 async cancelar(r,{empresa,id:k}={}){
  const a=await contexto(r,empresa);if(!id(k))throw Error("Invitación inválida.");
  await ejecutar([q("UPDATE comercio_invitaciones_empleado SET cancelado=? WHERE empresa=? AND id=? AND consumido IS NULL AND cancelado IS NULL AND "+guard+" RETURNING id",a.n,empresa,k,...a.args),log(empresa,a,"empleado.invitacion_cancelada",k)]);return {cancelada:true};
 },
 async iniciarAceptacion(r,token){if(!tokenValido(token))throw Error("Invitación no disponible.");return flujo.iniciar(r,{invitacionHash:await hash(token)});},
 async completarAceptacion(r){
  const x=await flujo.completar(r),i=x.identidad,n=reloj(),marca=crypto.randomUUID(),u=crypto.randomUUID();
  if(x.contexto!=="comercial"||!tokenValido(x.invitacionHash)||i?.emailVerified!==true||!id(i.emisor)||!id(i.sujeto)||typeof i.email!=="string")throw Error("Invitación no disponible.");
  const h=x.invitacionHash;
  const filtro=" AND EXISTS(SELECT 1 FROM comercio_empleados e WHERE e.empresa=comercio_invitaciones_empleado.empresa AND e.id=comercio_invitaciones_empleado.empleado AND e.activo=1 AND e.usuario IS NULL AND lower(e.correo)=comercio_invitaciones_empleado.correo) AND EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario JOIN empresas e ON e.id=m.empresa WHERE m.empresa=comercio_invitaciones_empleado.empresa AND m.usuario=comercio_invitaciones_empleado.actor AND m.rol='propietario' AND m.activa=1 AND u.activo=1 AND e.activa=1 AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=m.empresa AND p.rol=m.rol AND p.permiso='usuarios.administrar')) AND EXISTS(SELECT 1 FROM central_implementaciones c JOIN comercio_altas_pendientes z ON z.empresa=c.empresa JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercio_invitaciones_propietario j ON j.alta=z.id WHERE c.empresa=comercio_invitaciones_empleado.empresa AND c.estado IN ('pendiente','configuracion','revision') AND z.estado='aceptada' AND j.consumido IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM usuarios u WHERE u.emisor=? AND u.sujeto=? AND (u.activo=0 OR EXISTS(SELECT 1 FROM membresias m WHERE m.empresa=comercio_invitaciones_empleado.empresa AND m.usuario=u.id))) AND NOT EXISTS(SELECT 1 FROM json_each(comercio_invitaciones_empleado.sucursales) j WHERE NOT EXISTS(SELECT 1 FROM sucursales b WHERE b.empresa=comercio_invitaciones_empleado.empresa AND b.id=j.value AND b.activa=1)) AND "+capacidad.replace("s.empresa=?","s.empresa=comercio_invitaciones_empleado.empresa");
  const select=" FROM comercio_invitaciones_empleado j WHERE j.hash=? AND j.consumido=?",uid="(SELECT id FROM usuarios WHERE emisor=? AND sujeto=? AND activo=1)";
  const res=await ejecutar([
   q("UPDATE comercio_invitaciones_empleado SET consumido=? WHERE hash=? AND correo=? AND expira>? AND consumido IS NULL AND cancelado IS NULL"+filtro+" RETURNING empresa,empleado",marca,h,i.email.trim().toLowerCase(),n,i.emisor,i.sujeto,n,n),
   q("INSERT INTO usuarios(id,emisor,sujeto) SELECT ?,?,?"+select+" ON CONFLICT(emisor,sujeto) DO NOTHING",u,i.emisor,i.sujeto,h,marca),
   q("INSERT INTO membresias(empresa,usuario,rol,alcance) SELECT j.empresa,"+uid+",j.rol,'sucursales'"+select,i.emisor,i.sujeto,h,marca),
   q("INSERT INTO membresia_sucursales(empresa,usuario,sucursal) SELECT j.empresa,"+uid+",v.value FROM comercio_invitaciones_empleado j JOIN json_each(j.sucursales) v WHERE j.hash=? AND j.consumido=?",i.emisor,i.sujeto,h,marca),
   q("UPDATE comercio_empleados SET usuario="+uid+",revision=revision+1,actualizado=MAX(actualizado,?) WHERE (empresa,id) IN (SELECT j.empresa,j.empleado"+select+")",i.emisor,i.sujeto,n,h,marca),
   q("INSERT INTO comercio_empleados_vinculos(empresa,empleado,revision,anterior,posterior,actor,fecha) SELECT e.empresa,e.id,e.revision,NULL,e.usuario,j.actor,? FROM comercio_invitaciones_empleado j JOIN comercio_empleados e ON e.empresa=j.empresa AND e.id=j.empleado WHERE j.hash=? AND j.consumido=?",n,h,marca),
   q("INSERT INTO comercio_asignaciones_acceso(empresa,usuario,revision,empleado,rol,sucursales,actor,fecha) SELECT j.empresa,"+uid+",1,j.empleado,j.rol,j.sucursales,j.actor,?"+select,i.emisor,i.sujeto,n,h,marca),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT j.empresa,j.actor,'empleado.invitacion_aceptada',j.id,?"+select,n,h,marca)
  ]);return {...res,cookie:x.cookie};
 },
 async estadoAcceso(r,d){
  const a=await contexto(r,d?.empresa);
  if(!id(d.usuario)||![0,1].includes(d.activa)||Object.keys(d).some(k=>!["empresa","usuario","activa"].includes(k)))throw Error("Acceso inválido.");
  const marca=crypto.randomUUID(),obj=d.usuario+":"+marca,cond="EXISTS(SELECT 1 FROM comercio_auditoria WHERE empresa=? AND actor=? AND accion='empleado.acceso_estado' AND objetivo=?)";
  await ejecutar([
   q("UPDATE membresias SET activa=? WHERE empresa=? AND usuario=? AND rol<>'propietario' AND activa<>? AND "+guard+" AND (?=0 OR ("+capacidad+" AND EXISTS(SELECT 1 FROM comercio_empleados e WHERE e.empresa=membresias.empresa AND e.usuario=membresias.usuario AND e.activo=1) AND EXISTS(SELECT 1 FROM usuarios WHERE id=membresias.usuario AND activo=1) AND EXISTS(SELECT 1 FROM membresia_sucursales ms JOIN sucursales b ON b.empresa=ms.empresa AND b.id=ms.sucursal WHERE ms.empresa=membresias.empresa AND ms.usuario=membresias.usuario AND b.activa=1))) RETURNING usuario",d.activa,d.empresa,d.usuario,d.activa,...a.args,d.activa,d.empresa,a.n,a.n),
   log(d.empresa,a,"empleado.acceso_estado",obj),
   q("INSERT INTO comercio_acceso_corte(empresa,usuario,desde) SELECT ?,?,? WHERE "+cond+" ON CONFLICT(empresa,usuario) DO UPDATE SET desde=MAX(desde,excluded.desde)",d.empresa,d.usuario,a.n,d.empresa,a.actor,obj),
   q("UPDATE comercio_sesiones SET revocado=? WHERE usuario=? AND revocado IS NULL AND "+cond+" AND NOT EXISTS(SELECT 1 FROM membresias m JOIN empresas e ON e.id=m.empresa WHERE m.usuario=? AND m.activa=1 AND e.activa=1)",a.n,d.usuario,d.empresa,a.actor,obj,d.usuario)
  ]);return {activa:d.activa};
 }
 });
}
