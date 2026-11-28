// Candidate only: not mounted in worker-comercial.
import {interfazCentral} from "./interfaz-central.mjs";
import {navegacionCentral} from "./navegacion-central.mjs";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY"};
const json=(v,status=200,extra={})=>Response.json(v,{status,headers:{...headers,"Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'",...extra}});
const error=s=>json({error:"Solicitud no disponible."},s);
export function crearRutasCentral({habilitado=false,acceso,origen,dashboard}={}){
 if(habilitado!==true)return async()=>error(404);
 if(!acceso||typeof acceso.autenticarCentral!=="function"||typeof acceso.cerrar!=="function"||typeof origen!=="string"||new URL(origen).protocol!=="https:"||new URL(origen).origin!==origen)throw Error("Administrador central no configurado.");
 return async r=>{
  const u=new URL(r.url),pagina=u.pathname==="/interno/central",datos=u.pathname==="/interno/central/navegacion",salir=u.pathname==="/interno/central/salir",resumen=u.pathname==="/interno/central/dashboard";
  if(!pagina&&!datos&&!salir&&!resumen)return error(404);
  if(u.origin!==origen||u.search||r.method==="POST"&&r.headers.get("Origin")!==origen)return error(403);
  if(r.method!==(salir?"POST":"GET"))return error(405);
  try{
   if(!await acceso.autenticarCentral(r))return error(403);
   if(salir){const v=await acceso.cerrar(r);return json({cerrada:true},200,{"Set-Cookie":v.cookie});}
   if(datos)return json({secciones:navegacionCentral});
   if(resumen){if(typeof dashboard?.consultar!=="function")return error(503);return json(await dashboard.consultar(r));}
   const nonce=crypto.randomUUID().replaceAll("-","");
   return new Response(interfazCentral(nonce),{headers:{...headers,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
  }catch{return error(403);}
 };
}
