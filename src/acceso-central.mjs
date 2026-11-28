import {crearFlujoOidc} from "./flujo-oidc.mjs";
const COOKIE="__Host-lapaz-central",DURACION=3600000,INACTIVIDAD=600000,RECIENTE=300000;
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
const hash=async t=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))));
const cookie=(t,n)=>COOKIE+"="+t+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age="+n;
function extraer(r){const a=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+"="));const t=a.length===1?a[0].slice(COOKIE.length+1):"";return /^[a-f0-9]{64}$/.test(t)?t:null;}
export async function crearAccesoCentral(env,{habilitado=false,config,reloj=Date.now,transporte=fetch}={}){
 const flujo=await crearFlujoOidc(env,{habilitado,config,reloj,transporte}),db=env.COMMERCE_DB,origen=new URL(config.retorno).origin;
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const exigir=(r,m)=>{if(habilitado!==true||r.method!==m||new URL(r.url).origin!==origen||m==="POST"&&r.headers.get("Origin")!==origen)throw Error("Acceso central no permitido.");};
 const vigente="revocado IS NULL AND expira>? AND ultima>?";
 async function autenticarCentral(r){
  if(habilitado!==true||new URL(r.url).origin!==origen||!["GET","POST"].includes(r.method)||r.method==="POST"&&r.headers.get("Origin")!==origen)return null;
  const t=extraer(r);if(!t)return null;const h=await hash(t),n=reloj(),critica=r.method==="POST";
  const a=await q("UPDATE central_sesiones SET ultima=MAX(ultima,?) WHERE hash=? AND "+vigente+" AND (?=0 OR creado>?) AND EXISTS(SELECT 1 FROM central_operadores o WHERE o.id=central_sesiones.operador AND o.activo=1) RETURNING operador",n,h,n,n-INACTIVIDAD,critica?1:0,n-RECIENTE).first();
  if(!a)return null;
  return await q("SELECT o.emisor,o.sujeto FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.activo=1 AND s.hash=? AND s.revocado IS NULL AND s.expira>? AND s.ultima>? AND (?=0 OR s.creado>?)",h,n,n-INACTIVIDAD,critica?1:0,n-RECIENTE).first()??null;
 }
 return Object.freeze({
 async iniciar(r){exigir(r,"POST");return flujo.iniciar(r,{central:true});},
 async completar(r){
  exigir(r,"GET");const x=await flujo.completar(r);if(x.contexto!=="central"||x.identidad.mfaCentral!==true)throw Error("Acceso central no permitido.");
  const t=hex(crypto.getRandomValues(new Uint8Array(32))),h=await hash(t),n=reloj();
  // Single active session per operator. Atomic batch rotates only that verified operator.
  const guard="EXISTS(SELECT 1 FROM central_operadores o WHERE o.id=central_sesiones.operador AND o.emisor=? AND o.sujeto=? AND o.activo=1)";
  const res=await db.batch([
   q("UPDATE central_sesiones SET revocado=? WHERE revocado IS NULL AND "+guard,n,x.identidad.emisor,x.identidad.sujeto),
   q("INSERT INTO central_sesiones(hash,operador,creado,expira,ultima) SELECT ?,id,?,?,? FROM central_operadores WHERE emisor=? AND sujeto=? AND activo=1 RETURNING operador",h,n,n+DURACION,n,x.identidad.emisor,x.identidad.sujeto)
  ]);
  if(!res[1].results?.length)throw Error("Acceso central no permitido.");
  return {cookies:[x.cookie,cookie(t,DURACION/1000)],expira:n+DURACION};
 },
 autenticarCentral,
 async cerrar(r){exigir(r,"POST");const t=extraer(r);if(t)await q("UPDATE central_sesiones SET revocado=? WHERE hash=? AND revocado IS NULL",reloj(),await hash(t)).run();return {cookie:cookie("",0)};}
 });
}
