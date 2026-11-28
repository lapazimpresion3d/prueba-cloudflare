import {crearFlujoOidc} from "./flujo-oidc.mjs";
const enc=new TextEncoder(),VENTANA=600000;
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
// The caller must supply a trusted edge-derived origin, never an arbitrary client header.
export async function crearLimiteOidc(env,{habilitado=false,origenConfiable,secreto,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof origenConfiable!=="function"||typeof secreto!=="string"||secreto.length<32)throw Error("Límite no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const key=await crypto.subtle.importKey("raw",enc.encode(secreto),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return async r=>{
  if(habilitado!==true)return false;
  const origen=await origenConfiable(r),n=reloj();
  if(typeof origen!=="string"||!origen||origen.length>256||!Number.isSafeInteger(n)||n<0||n>Number.MAX_SAFE_INTEGER-VENTANA)return false;
  const h=hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(origen))));
  const x=await db.prepare("INSERT INTO comercio_limites_oidc VALUES(?,1,?) ON CONFLICT(origen) DO UPDATE SET usos=CASE WHEN vence<=? THEN 1 ELSE usos+1 END,vence=CASE WHEN vence<=? THEN excluded.vence ELSE vence END WHERE vence<=? OR usos<10 RETURNING usos").bind(h,n+VENTANA,n,n,n).first();
  return !!x;
 };
}
export async function crearRecuperacionCuenta(env,{habilitado=false,config,reloj=Date.now,transporte=fetch,limitarInicio}={}){
 if(typeof limitarInicio!=="function")throw Error("Límite requerido.");
 const flujo=await crearFlujoOidc(env,{habilitado,config,reloj,transporte,proposito:"recuperacion",limitarInicio}),db=env.COMMERCE_DB;
 return Object.freeze({
 async iniciar(r,{central=false}={}){return flujo.iniciar(r,{central});},
 async completar(r){
  const x=await flujo.completar(r),i=x.identidad,n=reloj(),central=x.contexto==="central";
  if(central&&i.mfaCentral!==true)throw Error("Recuperación no disponible.");
  const sql=central?"INSERT INTO comercio_recuperaciones(id,contexto,operador,fecha) SELECT ?,'central',id,? FROM central_operadores WHERE emisor=? AND sujeto=? AND activo=1 RETURNING id":"INSERT INTO comercio_recuperaciones(id,contexto,usuario,fecha) SELECT ?,'comercial',id,? FROM usuarios WHERE emisor=? AND sujeto=? AND activo=1 RETURNING id";
  const evento=await db.prepare(sql).bind(crypto.randomUUID(),n,i.emisor,i.sujeto).first();
  if(!evento)throw Error("Recuperación no disponible.");
  // Clear the temporary cookie and the affected session cookie; never issue a new session.
  return {recuperada:true,cookies:[x.cookie,"__Host-lapaz-"+(central?"central":"comercial")+"=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0"]};
 }
 });
}
export async function limpiarSeguridadTemporal(env,{habilitado=false,confirmar=false,reloj=Date.now,limite=100}={}){
 const db=env.COMMERCE_DB,n=reloj();
 if(habilitado!==true||confirmar!==true||!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||!Number.isSafeInteger(limite)||limite<1||limite>100||!Number.isSafeInteger(n)||n<604800000)throw Error("Limpieza no autorizada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const r=await db.batch([
 q("DELETE FROM comercio_oidc_solicitudes WHERE estado_hash IN (SELECT estado_hash FROM comercio_oidc_solicitudes WHERE expira<=? ORDER BY expira LIMIT ?)",n,limite),
 q("DELETE FROM comercio_limites_oidc WHERE origen IN (SELECT origen FROM comercio_limites_oidc WHERE vence<=? ORDER BY vence LIMIT ?)",n,limite),
 q("DELETE FROM central_sesiones WHERE hash IN (SELECT hash FROM central_sesiones WHERE expira<=? OR revocado<=? ORDER BY expira LIMIT ?)",n-604800000,n-604800000,limite)
 ]);return r.map(x=>x.meta.changes);
}
