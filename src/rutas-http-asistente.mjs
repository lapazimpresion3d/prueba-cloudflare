import {crearAsistenteImplementacion} from "./asistente-implementacion.mjs";
import {crearPerfilComercial} from "./perfil-comercial.mjs";
import {crearSucursalesComerciales} from "./sucursales-comerciales.mjs";
import {leerJsonLimitado} from "./seguridad.mjs";
import {interfazAsistente} from "./interfaz-asistente.mjs";
const cabeceras={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY"};
const json=(v,status=200)=>Response.json(v,{status,headers:{...cabeceras,"Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'"}});
const error=(status=403)=>json({error:"Solicitud no disponible."},status);
// Explicit opt-in candidate. Never mounted by worker-comercial.
export async function crearRutasAsistente(env,opciones={}){
 if(opciones.habilitado!==true)return async()=>error(404);
 const [asistente,perfil,suc]=await Promise.all([crearAsistenteImplementacion(env,opciones),crearPerfilComercial(env,opciones),crearSucursalesComerciales(env,opciones)]);
 const acciones=new Map([["progreso",asistente.guardar],["validar",asistente.validar],["perfil",perfil.guardar],["visual",perfil.guardarVisual],["presentacion",perfil.guardarPresentacion],["contacto",perfil.guardarContacto],["horario",perfil.guardarHorario],["sucursal",suc.guardar],["principal",suc.principal]]);
 return async r=>{
  const u=new URL(r.url),empresa=u.searchParams.get("empresa"),accion=u.searchParams.get("accion"),pagina=u.pathname==="/interno/asistente",datos=u.pathname==="/interno/asistente/datos";
  if(!pagina&&!datos)return error(404);
  if(u.protocol!=="https:"||!empresa||empresa.length>128||u.searchParams.getAll("empresa").length!==1||u.searchParams.getAll("accion").length>1)return error();
  if(!["GET","POST"].includes(r.method)||pagina&&r.method!=="GET")return error(405);
  try{
   if(r.method==="GET"){
    if(pagina&&accion!==null||datos&&accion!==null&&accion!=="historial")return error(400);
    const v=await asistente.consultar(r,{empresa});
    if(datos)return json(accion==="historial"?await asistente.historialValidaciones(r,{empresa}):v);
    const nonce=crypto.randomUUID().replaceAll("-","");
    return new Response(interfazAsistente(nonce),{headers:{...cabeceras,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
   }
   if(r.headers.get("Origin")!==u.origin||!acciones.has(accion))return error();
   const d=await leerJsonLimitado(r,131072);
   if(!d||typeof d!=="object"||Array.isArray(d)||Object.hasOwn(d,"empresa"))return error(400);
   // Strong assistant guard on every mutation, even when delegating to older services.
   const consulta=new Request(r.url,{method:"GET",headers:r.headers});
   const v=await asistente.consultar(consulta,{empresa});
   if(!["progreso","validar"].includes(accion)&&v.progreso.estado!=="en_curso")return error();
   const etapas={perfil:"perfil",visual:"perfil",presentacion:"presentacion",contacto:"presentacion",horario:"presentacion",sucursal:"sucursales",principal:"sucursales",validar:"revision"};
   if(etapas[accion]&&v.progreso.paso!==etapas[accion])return error();
   return json(await acciones.get(accion)(r,{...d,empresa}));
  }catch{return error();}
 };
}
