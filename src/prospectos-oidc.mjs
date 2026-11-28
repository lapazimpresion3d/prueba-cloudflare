import {crearFlujoOidc} from "./flujo-oidc.mjs";
const TTL=600000;
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
export const hashPruebaProspecto=async t=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))));
export const pruebaProspectoValida=t=>typeof t==="string"&&/^[a-f0-9]{64}$/.test(t);
// Internal only. No account, membership, session or subscription is created here.
export async function crearIdentificacionProspecto(env,{habilitado=false,config,reloj=Date.now,transporte=fetch,limitarInicio}={}){
 if(typeof limitarInicio!=="function")throw Error("Límite requerido.");
 const flujo=await crearFlujoOidc(env,{habilitado,config,reloj,transporte,proposito:"prospecto",limitarInicio}),db=env.COMMERCE_DB;
 const q=(s,...a)=>db.prepare(s).bind(...a);
 return Object.freeze({
  async iniciar(r){return flujo.iniciar(r,{central:false});},
  async completar(r){
   const x=await flujo.completar(r),i=x.identidad,n=reloj();
   if(x.contexto!=="comercial"||i.emailVerified!==true||!Number.isSafeInteger(n)||n<0||n>Number.MAX_SAFE_INTEGER-TTL)throw Error("Identificación no disponible.");
   const prueba=hex(crypto.getRandomValues(new Uint8Array(32)));
   await q("DELETE FROM comercio_prospectos_oidc WHERE hash IN (SELECT hash FROM comercio_prospectos_oidc WHERE expira<=? ORDER BY expira LIMIT 100)",n).run();
   await q("INSERT INTO comercio_prospectos_oidc(hash,emisor,sujeto,creado,expira) VALUES(?,?,?,?,?)",await hashPruebaProspecto(prueba),i.emisor,i.sujeto,n,n+TTL).run();
   return {prueba,expira:n+TTL,cookie:x.cookie};
  }
 });
}
