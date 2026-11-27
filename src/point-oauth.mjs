// Contrato de servidor, sin rutas públicas ni transporte por defecto.
import {prepararOAuth,cifrarCredenciales,descifrarCredenciales} from "./point-credenciales.mjs";
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,"0")).join("");
const tokenValido=x=>typeof x==="string"&&x.length>0&&x.length<=4096&&!/[\r\n]/.test(x);
export function crearOAuthPoint({clientId,clientSecret,redirectUri,transporte,almacen,secret,habilitado=false,reloj=Date.now}){
 if(!/^\d+$/.test(clientId)||!tokenValido(clientSecret)||typeof transporte!=="function"||!almacen)throw Error("Configuración OAuth inválida.");
 const exigir=()=>{if(habilitado!==true)throw Error("OAuth deshabilitado.");};
 const ctx=(comercio,entorno)=>({secret,comercio,entorno});
 const validar=(comercio,entorno,actor)=>{if(!tokenValido(comercio)||!tokenValido(actor)||!["prueba","produccion"].includes(entorno))throw Error("Contexto OAuth inválido.");};
 async function intercambio(body,entorno,vendedor){
  const ctrl=new AbortController();let timer;
  try{
   const r=await Promise.race([new Promise((_,reject)=>{timer=setTimeout(()=>{ctrl.abort();reject(Error("OAuth incierto"));},10000);}), (async()=>{
    const res=await transporte("https://api.mercadopago.com/oauth/token",{method:"POST",redirect:"error",signal:ctrl.signal,headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({client_id:clientId,client_secret:clientSecret,...body})});
    if(!res.ok)throw Error("OAuth rechazado");return await res.json();
   })()]);
   if(!tokenValido(r?.access_token)||!tokenValido(r.refresh_token)||!Number.isSafeInteger(r.expires_in)||r.expires_in<=0||r.expires_in>31536000||!/^\d+$/.test(String(r.user_id))||String(r.user_id)==="0"||r.live_mode!==(entorno==="produccion")||(vendedor&&String(r.user_id)!==vendedor)||!String(r.scope||"").split(/\s+/).includes("offline_access"))throw Error("Respuesta OAuth inválida");
   return {access_token:r.access_token,refresh_token:r.refresh_token,vendedor:String(r.user_id),expira:reloj()+r.expires_in*1000,scope:r.scope};
  }catch{throw Error("Intercambio OAuth no confirmado; requiere revisión o nueva autorización.");}finally{clearTimeout(timer);}
 }
 return {
 async iniciar({comercio,entorno,actor}){
  exigir();validar(comercio,entorno,actor);
  const p=await prepararOAuth({clientId,redirectUri});
  await almacen.crearEstado({hash:await hash(p.state),comercio,entorno,actor,expira:reloj()+600000,cifrado:await cifrarCredenciales({verifier:p.verifier},ctx(comercio,entorno))});
  return {url:p.url};
 },
 async completar({comercio,entorno,actor,state,code}){
  exigir();validar(comercio,entorno,actor);
  if(!/^[A-Za-z0-9_-]{43}$/.test(state)||!tokenValido(code))throw Error("Callback OAuth inválido.");
  // consumirEstado debe ser CAS atómico, comprobar contexto y expiración.
  const e=await almacen.consumirEstado({hash:await hash(state),comercio,entorno,actor,ahora:reloj()});
  if(!e)throw Error("Estado OAuth inválido o consumido.");
  // El almacén debe excluir simultáneamente vinculación, renovación y revocación.
  const lease=await almacen.reservar(comercio,entorno);
  if(!lease)throw Error("Credenciales ocupadas.");
  try{
   const {verifier}=await descifrarCredenciales(e.cifrado,ctx(comercio,entorno));
   const d=await intercambio({grant_type:"authorization_code",code,redirect_uri:redirectUri,code_verifier:verifier},entorno,lease.vendedor);
   await almacen.confirmar(lease,{vendedor:d.vendedor,expira:d.expira,cifrado:await cifrarCredenciales(d,ctx(comercio,entorno))});
   return {vendedor:d.vendedor,expira:d.expira};
  }catch{await almacen.marcarIncierto(lease);throw Error("Vinculación no confirmada; requiere revisión.");}
 },
 async renovar({comercio,entorno,actor}){
  exigir();validar(comercio,entorno,actor);
  const lease=await almacen.reservar(comercio,entorno);
  if(!lease)throw Error("Credenciales ocupadas.");
  try{
   if(!lease.cifrado||!lease.vendedor)throw Error("Sin credenciales.");
   const anterior=await descifrarCredenciales(lease.cifrado,ctx(comercio,entorno));
   const d=await intercambio({grant_type:"refresh_token",refresh_token:anterior.refresh_token},entorno,lease.vendedor);
   await almacen.confirmar(lease,{vendedor:d.vendedor,expira:d.expira,cifrado:await cifrarCredenciales(d,ctx(comercio,entorno))});
   return {vendedor:d.vendedor,expira:d.expira};
  }catch{await almacen.marcarIncierto(lease);throw Error("Renovación no confirmada; requiere revisión.");}
 }
 };
}
