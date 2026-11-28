import {crearVerificadorIdentidad} from "./identidad-oidc.mjs";
import {leerJsonLimitado} from "./seguridad.mjs";
const enc=new TextEncoder(),COOKIE="__Host-lapaz-oidc",TTL=300000;
const b64=b=>btoa(String.fromCharCode(...b)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const digest=async v=>new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(v)));
const hash=async v=>Array.from(await digest(v),x=>x.toString(16).padStart(2,"0")).join("");
const valido=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{43}$/.test(x);
function endpoint(v){const u=new URL(v);if(u.protocol!=="https:"||u.username||u.password||u.hash||u.search)throw Error("Configuración inválida.");return u;}
function cookie(v,edad){return COOKIE+"="+v+"; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age="+edad;}
function navegador(r){const x=(r.headers.get("Cookie")||"").split(";").map(v=>v.trim()).filter(v=>v.startsWith(COOKIE+"="));return x.length===1&&valido(x[0].slice(COOKIE.length+1))?x[0].slice(COOKIE.length+1):null;}
// Internal only: caller must enforce rate limiting and return cookie/redirect without logging.
export async function crearFlujoOidc(env,{habilitado=false,config,reloj=Date.now,transporte=fetch,proposito="acceso",limitarInicio=null}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof transporte!=="function")throw Error("Flujo no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const {emisor,audiencia,claves,acrCentral,autorizacion,intercambio,retorno,secreto}=config??{};
 const auth=endpoint(autorizacion),token=endpoint(intercambio),callback=endpoint(retorno);
 if(typeof secreto!=="string"||!secreto||secreto.length>4096)throw Error("Cliente confidencial no configurado.");
 const verificar=crearVerificadorIdentidad({emisor,audiencia,claves,acrCentral,reloj});
 if(!["acceso","recuperacion","prospecto","alta"].includes(proposito)||limitarInicio!==null&&typeof limitarInicio!=="function")throw Error("Configuración inválida.");
 const marca=await hash(JSON.stringify([emisor,audiencia,auth.href,token.href,callback.href,acrCentral,proposito]));
 const q=(sql,...a)=>db.prepare(sql).bind(...a);
 const exigir=()=>{if(habilitado!==true)throw Error("Flujo deshabilitado.");};
 const ahora=()=>{const n=reloj();if(!Number.isSafeInteger(n)||n<0||n>Number.MAX_SAFE_INTEGER-TTL)throw Error("Reloj inválido.");return n;};
 return Object.freeze({
 async iniciar(r,{central=false,invitacionHash=null}={}){
  exigir();const u=new URL(r.url);if(r.method!=="POST"||u.protocol!=="https:"||u.origin!==callback.origin||r.headers.get("Origin")!==callback.origin||typeof central!=="boolean")throw Error("Solicitud no permitida.");
  if((proposito==="prospecto"||proposito==="alta")&&central)throw Error("Solicitud no permitida.");
  if(proposito==="alta"?typeof invitacionHash!=="string"||!/^[a-f0-9]{64}$/.test(invitacionHash):invitacionHash!==null)throw Error("Solicitud no permitida.");
  if(limitarInicio&&!await limitarInicio(r))throw Error("Intenta nuevamente más tarde.");
  const estado=random(),browser=random(),nonce=random(),verificador=random(),n=ahora();
  // bounded cleanup, no access to other tables; abandoned transactions expire logically.
  await q("DELETE FROM comercio_oidc_solicitudes WHERE estado_hash IN (SELECT estado_hash FROM comercio_oidc_solicitudes WHERE expira<=? ORDER BY expira LIMIT 100)",n).run();
  const eh=await hash(estado),bh=await hash(browser);
  if(proposito==="alta"){
   const tx=await q("INSERT INTO comercio_oidc_solicitudes(estado_hash,navegador_hash,nonce,verificador,contexto,configuracion,expira,invitacion_hash) SELECT ?,?,?,?,?,?,MIN(?,j.expira,p.expira),j.hash FROM comercio_invitaciones_propietario j JOIN comercio_altas_pendientes p ON p.id=j.alta JOIN central_operadores o ON o.id=p.operador WHERE j.hash=? AND j.consumido IS NULL AND j.cancelado IS NULL AND j.expira>? AND p.estado='pendiente' AND p.expira>? AND o.activo=1 AND j.operador=p.operador AND NOT EXISTS(SELECT 1 FROM usuarios u WHERE u.emisor=p.emisor AND u.sujeto=p.sujeto AND u.activo=0) RETURNING estado_hash",eh,bh,nonce,verificador,"comercial",marca,n+TTL,invitacionHash,n,n).first();
   if(!tx)throw Error("Invitación no disponible.");
  }else await q("INSERT INTO comercio_oidc_solicitudes(estado_hash,navegador_hash,nonce,verificador,contexto,configuracion,expira) VALUES(?,?,?,?,?,?,?)",eh,bh,nonce,verificador,central?"central":"comercial",marca,n+TTL).run();
  const url=new URL(auth);url.search=new URLSearchParams({response_type:"code",response_mode:"query",client_id:audiencia,redirect_uri:callback.href,scope:"openid email",state:estado,nonce,code_challenge:b64(await digest(verificador)),code_challenge_method:"S256",max_age:proposito!=="acceso"?"0":"300",...(proposito!=="acceso"?{prompt:"login"}:{}),...(central?{acr_values:acrCentral}:{})}).toString();
  return {url:url.href,cookie:cookie(browser,TTL/1000)};
 },
 async completar(r){
  exigir();
  try{
   const u=new URL(r.url),browser=navegador(r);if(r.method!=="GET"||u.origin!==callback.origin||u.pathname!==callback.pathname||u.protocol!=="https:"||!browser||u.search.length>8192)throw Error();
   const state=u.searchParams.getAll("state"),code=u.searchParams.getAll("code"),iss=u.searchParams.getAll("iss");
   if(state.length!==1||!valido(state[0])||code.length!==1||!code[0]||code[0].length>4096||u.searchParams.has("error")||iss.length>1||iss.length===1&&iss[0]!==emisor)throw Error();
   // Atomic consume before any network I/O; failure requires a new login.
   const tx=await q("DELETE FROM comercio_oidc_solicitudes WHERE estado_hash=? AND navegador_hash=? AND configuracion=? AND expira>? RETURNING nonce,verificador,contexto,invitacion_hash",await hash(state[0]),await hash(browser),marca,ahora()).first();
   if(!tx)throw Error();
   const body=new URLSearchParams({grant_type:"authorization_code",code:code[0],redirect_uri:callback.href,client_id:audiencia,client_secret:secreto,code_verifier:tx.verificador});
   const respuesta=await transporte(token.href,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body,redirect:"error",signal:AbortSignal.timeout(10000)});
   if(!respuesta.ok)throw Error();
   const datos=await leerJsonLimitado(respuesta,65536);
   const identidad=await verificar(datos?.id_token,{nonce:tx.nonce,central:tx.contexto==="central"});
   return {identidad,contexto:tx.contexto,cookie:cookie("",0),...(proposito==="alta"?{invitacionHash:tx.invitacion_hash}:{})};
  }catch{throw Error("Autenticación no completada.");}
 }
 });
}
