import {leerJsonLimitado} from "./seguridad.mjs";
// Candidate only: not mounted in worker-comercial.
import {interfazCentral} from "./interfaz-central.mjs";
import {navegacionCentral} from "./navegacion-central.mjs";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY"};
const json=(v,status=200,extra={})=>Response.json(v,{status,headers:{...headers,"Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'",...extra}});
const error=s=>json({error:"Solicitud no disponible."},s);
export function crearRutasCentral({habilitado=false,acceso,origen,dashboard,directorio,prospectos,planes}={}){
 if(habilitado!==true)return async()=>error(404);
 if(!acceso||typeof acceso.autenticarCentral!=="function"||typeof acceso.cerrar!=="function"||typeof origen!=="string"||new URL(origen).protocol!=="https:"||new URL(origen).origin!==origen)throw Error("Administrador central no configurado.");
 return async r=>{
  const u=new URL(r.url),pagina=u.pathname==="/interno/central",datos=u.pathname==="/interno/central/navegacion",salir=u.pathname==="/interno/central/salir",resumen=u.pathname==="/interno/central/dashboard",comercios=u.pathname==="/interno/central/comercios",lista=u.pathname==="/interno/central/directorio",expediente=u.pathname==="/interno/central/expediente",altas=u.pathname==="/interno/central/prospectos",altasDatos=u.pathname==="/interno/central/altas",altaAccion=u.pathname==="/interno/central/alta-accion",catalogo=u.pathname==="/interno/central/planes",catalogoDatos=u.pathname==="/interno/central/planes-datos",historialPlanes=u.pathname==="/interno/central/planes-historial",publicarPlan=u.pathname==="/interno/central/planes-publicar";
  if(!pagina&&!datos&&!salir&&!resumen&&!comercios&&!lista&&!expediente&&!altas&&!altasDatos&&!altaAccion&&!catalogo&&!catalogoDatos&&!historialPlanes&&!publicarPlan)return error(404);
  if(u.origin!==origen||(!lista&&!expediente&&!altasDatos&&!altaAccion&&!historialPlanes&&u.search)||r.method==="POST"&&r.headers.get("Origin")!==origen)return error(403);
  if(r.method!==(salir||altaAccion||publicarPlan?"POST":"GET"))return error(405);
  try{
   if(!await acceso.autenticarCentral(r))return error(403);
   if(salir){const v=await acceso.cerrar(r);return json({cerrada:true},200,{"Set-Cookie":v.cookie});}
   if(datos)return json({secciones:navegacionCentral});
   if(catalogoDatos||historialPlanes||publicarPlan){
    if(!planes)return error(503);
    if(catalogoDatos)return json(await planes.listar(r));
    if(publicarPlan)return json(await planes.publicar(r,await leerJsonLimitado(r,8192)));
    if([...u.searchParams.keys()].some(k=>!["plan","offset"].includes(k)||u.searchParams.getAll(k).length!==1))return error(400);
    const offset=u.searchParams.get("offset")??"0";if(!/^\d+$/.test(offset))return error(400);
    return json(await planes.historial(r,{plan:u.searchParams.get("plan"),offset:Number(offset)}));
   }
   if(altasDatos||altaAccion){
    if(!prospectos)return error(503);
    const clave=altasDatos?"offset":"accion";
    if([...u.searchParams.keys()].some(k=>k!==clave||u.searchParams.getAll(k).length!==1))return error(400);
    if(altasDatos){const o=u.searchParams.get("offset")??"0";if(!/^\d+$/.test(o))return error(400);return json(await prospectos.listar(r,{offset:Number(o)}));}
    const d=await leerJsonLimitado(r,8192);return json(await prospectos.ejecutar(r,u.searchParams.get("accion"),d));
   }
   if(lista||expediente){
    if(!directorio)return error(503);
    const permitidos=lista?["buscar","giro","plan","estado","limite","offset"]:["empresa"];
    if([...u.searchParams.keys()].some(k=>!permitidos.includes(k)||u.searchParams.getAll(k).length!==1))return error(400);
    const d=Object.fromEntries(u.searchParams);
    if(lista){for(const k of ["limite","offset"])if(Object.hasOwn(d,k)){if(!/^\d+$/.test(d[k]))return error(400);d[k]=Number(d[k]);}return json(await directorio.listar(r,d));}
    return json(await directorio.expediente(r,d));
   }
   if(resumen){if(typeof dashboard?.consultar!=="function")return error(503);return json(await dashboard.consultar(r));}
   const nonce=crypto.randomUUID().replaceAll("-","");
   return new Response(interfazCentral(nonce,comercios?"comercios":altas?"prospectos":catalogo?"planes":"inicio"),{headers:{...headers,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
  }catch{return error(403);}
 };
}
