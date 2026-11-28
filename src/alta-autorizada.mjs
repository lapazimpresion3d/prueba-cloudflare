import {hashPruebaProspecto,pruebaProspectoValida} from "./prospectos-oidc.mjs";
import {rolesIniciales} from "./nucleo-comercial.mjs";
const giros=["restaurante","cafeteria","tienda","barberia","taller","otro"];
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const nombre=x=>typeof x==="string"&&x.trim().length>0&&x.trim().length<=120;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
// Server-only onboarding. Identity verifier must consume a dedicated OIDC transaction.
export async function crearAltaAutorizada(env,{habilitado=false,autenticarCentral,verificarPropietario,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function"||typeof verificarPropietario!=="function")throw Error("Alta no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 function exigir(r){if(habilitado!==true||r.method!=="POST"||new URL(r.url).protocol!=="https:"||r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Alta no autorizada.");}
 async function central(r){exigir(r);const a=await autenticarCentral(r);const c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central="));const t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"";if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t))throw Error("Alta no autorizada.");return [a.emisor,a.sujeto,await hash(t)];}
 const guard="SELECT o.id FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND s.hash=? AND o.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>? AND s.creado>?";
 return Object.freeze({
 // New onboarding path: only a verified, server-stored proof supplies identity.
 async prepararProspecto(r,d,prueba){
  const a=await central(r),n=reloj();
  if(!pruebaProspectoValida(prueba)||!nombre(d?.nombre)||!nombre(d.sucursal)||!giros.includes(d.giro)||!["p1","p2","p3","p4"].includes(d.plan)||!Number.isSafeInteger(d.version)||d.version<1||Object.hasOwn(d,"emisor")||Object.hasOwn(d,"sujeto"))throw Error("Datos de alta inválidos.");
  const k=crypto.randomUUID(),h=await hashPruebaProspecto(prueba);
  const res=await db.batch([
   q("INSERT INTO comercio_altas_pendientes(id,nombre,sucursal,giro,plan,version,emisor,sujeto,operador,creado,expira) SELECT ?,?,?,?,?,?,p.emisor,p.sujeto,("+guard+"),?,? FROM comercio_prospectos_oidc p WHERE p.hash=? AND p.expira>? AND EXISTS(SELECT 1 FROM comercial_planes WHERE id=? AND version=? AND usuarios>=1 AND sucursales>=1) AND NOT EXISTS(SELECT 1 FROM usuarios u WHERE u.emisor=p.emisor AND u.sujeto=p.sujeto AND u.activo=0) RETURNING id",k,d.nombre.trim(),d.sucursal.trim(),d.giro,d.plan,d.version,...a,n,n-600000,n-300000,n,n+86400000,h,n,d.plan,d.version),
   q("INSERT INTO comercio_altas_prospecto(alta) SELECT id FROM comercio_altas_pendientes WHERE id=?",k),
   q("DELETE FROM comercio_prospectos_oidc WHERE hash=? AND EXISTS(SELECT 1 FROM comercio_altas_pendientes WHERE id=?)",h,k),
   q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha) SELECT operador,NULL,'alta.prospecto_verificado',id,? FROM comercio_altas_pendientes WHERE id=?",n,k)
  ]);
  if(!res[0].results?.length)throw Error("Alta no autorizada.");
  return {id:k,expira:n+86400000};
 },
 // First issuance only. Renewal/cancellation will use a separate guarded operation.
 async emitirInvitacion(r,k){
  const a=await central(r),n=reloj();
  if(!id(k)||!Number.isSafeInteger(n)||n<0||n>Number.MAX_SAFE_INTEGER-86400000)throw Error("Invitación no disponible.");
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join(""),h=await hash(token),i=crypto.randomUUID();
  const res=await db.batch([
   q("INSERT INTO comercio_invitaciones_propietario(id,alta,hash,operador,creado,expira) SELECT ?,p.id,?,p.operador,?,MIN(p.expira,?) FROM comercio_altas_pendientes p JOIN comercio_altas_prospecto v ON v.alta=p.id WHERE p.id=? AND p.estado='pendiente' AND p.expira>? AND p.operador=("+guard+") AND NOT EXISTS(SELECT 1 FROM usuarios u WHERE u.emisor=p.emisor AND u.sujeto=p.sujeto AND u.activo=0) AND NOT EXISTS(SELECT 1 FROM comercio_invitaciones_propietario j WHERE j.alta=p.id) RETURNING id,expira",i,h,n,n+86400000,k,n,...a,n,n-600000,n-300000),
   q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha) SELECT operador,NULL,'alta.invitacion_emitida',id,? FROM comercio_invitaciones_propietario WHERE id=?",n,i)
  ]);
  const fila=res[0].results?.[0];if(!fila)throw Error("Invitación no disponible.");
  return {id:i,alta:k,token,expira:fila.expira};
 },
 // Historical internal API; do not expose to browser.
 async preparar(r,d){
  const a=await central(r),n=reloj();if(!nombre(d?.nombre)||!nombre(d.sucursal)||!giros.includes(d.giro)||!["p1","p2","p3","p4"].includes(d.plan)||!Number.isSafeInteger(d.version)||d.version<1||!id(d.emisor)||!id(d.sujeto))throw Error("Datos de alta inválidos.");
  const k=crypto.randomUUID();
  const res=await db.batch([
   q("INSERT INTO comercio_altas_pendientes(id,nombre,sucursal,giro,plan,version,emisor,sujeto,operador,creado,expira) SELECT ?,?,?,?,?,?,?,?,o.id,?,? FROM central_operadores o WHERE o.id=("+guard+") AND EXISTS(SELECT 1 FROM comercial_planes WHERE id=? AND version=? AND usuarios>=1 AND sucursales>=1) RETURNING id",k,d.nombre.trim(),d.sucursal.trim(),d.giro,d.plan,d.version,d.emisor,d.sujeto,n,n+86400000,...a,n,n-600000,n-300000,d.plan,d.version),
   q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha) SELECT operador,NULL,'alta.preparada',id,? FROM comercio_altas_pendientes WHERE id=?",n,k)
  ]);if(!res[0].results?.length)throw Error("Alta no autorizada.");return {id:k,expira:n+86400000};
 },
 async aceptar(r,k){
  exigir(r);if(!id(k))throw Error("Alta no disponible.");const i=await verificarPropietario(r);if(i?.emailVerified!==true||!id(i.emisor)||!id(i.sujeto))throw Error("Alta no disponible.");
  const n=reloj(),e=crypto.randomUUID(),s=crypto.randomUUID(),u=crypto.randomUUID();
  const pendiente="id=? AND NOT EXISTS(SELECT 1 FROM comercio_altas_prospecto v WHERE v.alta=comercio_altas_pendientes.id) AND estado='pendiente' AND expira>? AND emisor=? AND sujeto=? AND EXISTS(SELECT 1 FROM central_operadores WHERE id=comercio_altas_pendientes.operador AND activo=1)";
  const p=[k,n,i.emisor,i.sujeto], stm=[
   q("INSERT INTO empresas(id,nombre) SELECT ?,nombre FROM comercio_altas_pendientes WHERE "+pendiente,e,...p),
   q("UPDATE comercio_altas_pendientes SET estado='aceptada',empresa=? WHERE "+pendiente+" AND EXISTS(SELECT 1 FROM empresas WHERE id=?) RETURNING id",e,...p,e),
   q("INSERT INTO usuarios(id,emisor,sujeto) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM comercio_altas_pendientes WHERE id=? AND empresa=?) ON CONFLICT(emisor,sujeto) DO NOTHING",u,i.emisor,i.sujeto,k,e),
   q("INSERT INTO sucursales(empresa,id,nombre) SELECT empresa,?,sucursal FROM comercio_altas_pendientes WHERE id=? AND empresa=?",s,k,e)
  ];
  for(const [rol,ps] of Object.entries(rolesIniciales)){stm.push(q("INSERT INTO roles SELECT empresa,?,? FROM comercio_altas_pendientes WHERE id=? AND empresa=?",rol,rol,k,e));for(const perm of ps)stm.push(q("INSERT INTO rol_permisos SELECT empresa,?,? FROM comercio_altas_pendientes WHERE id=? AND empresa=?",rol,perm,k,e));}
  stm.push(q("INSERT INTO membresias(empresa,usuario,rol,alcance) SELECT empresa,(SELECT id FROM usuarios WHERE emisor=? AND sujeto=? AND activo=1),'propietario','empresa' FROM comercio_altas_pendientes WHERE id=? AND empresa=?",i.emisor,i.sujeto,k,e),
   q("INSERT INTO comercio_perfiles_privados(empresa,giro,nombre_publico) SELECT empresa,giro,nombre FROM comercio_altas_pendientes WHERE id=? AND empresa=?",k,e),
   q("INSERT INTO central_implementaciones SELECT empresa,'configuracion',1 FROM comercio_altas_pendientes WHERE id=? AND empresa=?",k,e),
   q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha) SELECT operador,empresa,'alta.aceptada',id,? FROM comercio_altas_pendientes WHERE id=? AND empresa=?",n,k,e),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT empresa,(SELECT id FROM usuarios WHERE emisor=? AND sujeto=?),'empresa.alta',empresa,? FROM comercio_altas_pendientes WHERE id=? AND empresa=?",i.emisor,i.sujeto,n,k,e));
  const res=await db.batch(stm);if(!res[1].results?.length)throw Error("Alta no disponible.");return {empresa:e,sucursal:s,estado:"configuracion"};
 }
 });
}
