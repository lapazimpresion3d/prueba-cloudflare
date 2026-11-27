// API exclusivamente de demostraciones. Nunca utiliza env.DB ni credenciales de El Comal.
import { establecimientos, obtenerEstablecimiento } from "../public/demostraciones/establecimientos.mjs";
import { planes, capacidades } from "../public/demostraciones/config.mjs";
import { validarOferta } from "../public/demostraciones/catalogo-local.mjs";
import { leerJsonLimitado } from "./seguridad.mjs";

const COOKIE="__Host-lapaz-demo";
const DURACION=7200;
const encoder=new TextEncoder();
const segundos=()=>Math.floor(Date.now()/1000);
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
const hash=async s=>hex(await crypto.subtle.digest("SHA-256",encoder.encode(s)));
const error=(json,m,status)=>json({error:m},status);

export function contextoDemo(id,planId){
  const establecimiento=obtenerEstablecimiento(id),plan=planes.find(p=>p.id===planId);
  if(!establecimiento||!plan)return null;
  return {establecimiento,plan,capacidades:capacidades(establecimiento,plan.id),modo:"demo-ficticia"};
}
export function validarCatalogoDemo(id,catalogo){
  const e=obtenerEstablecimiento(id);
  if(!e||!Array.isArray(catalogo)||catalogo.length>100)throw Error("Catálogo inválido.");
  const vistos=new Set();
  return catalogo.map(p=>{
    if(!p||vistos.has(p.id)||!(e.catalogo.some(x=>x.id===p.id)||/^local-[1-9][0-9]{0,3}$/.test(p.id)))throw Error("Identificador de oferta inválido o duplicado.");
    if(typeof p.disponible!=="boolean")throw Error("Disponibilidad inválida.");
    vistos.add(p.id);
    return validarOferta(p,p.id,e.catalogo.find(x=>x.id===p.id));
  });
}
function tokenCookie(request){
  const coincidencias=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+"="));
  if(coincidencias.length!==1)return null;
  const t=coincidencias[0].slice(COOKIE.length+1);
  return /^[a-f0-9]{64}$/.test(t)?t:null;
}
async function sesion(request,db,ahora){
  const t=tokenCookie(request);
  if(!t)return null;
  const clave=await hash(t);
  const fila=await db.prepare("SELECT id, expira FROM demo_sesiones WHERE id = ? AND expira > ?").bind(clave,ahora).first();
  return fila||null;
}
async function iniciar(request,env,json){
  const db=env.DEMO_DB,ahora=segundos();
  const existente=await sesion(request,db,ahora);
  if(existente)return json({activa:true,expira:existente.expira});
  // HMAC evita guardar la IP en claro. Requiere secreto independiente.
  const ip=request.headers.get("CF-Connecting-IP")||"desconocida";
  const k=await crypto.subtle.importKey("raw",encoder.encode(env.DEMO_RATE_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const origen=hex(await crypto.subtle.sign("HMAC",k,encoder.encode(ip)));
  const limite=await db.prepare("INSERT INTO demo_limites (origen, usos, vence) VALUES (?, 1, ?) ON CONFLICT(origen) DO UPDATE SET usos=CASE WHEN vence<=? THEN 1 ELSE usos+1 END, vence=CASE WHEN vence<=? THEN excluded.vence ELSE vence END WHERE vence<=? OR usos<5 RETURNING usos").bind(origen,ahora+600,ahora,ahora,ahora).first();
  if(!limite)return error(json,"Demasiadas sesiones de práctica. Intenta en unos minutos.",429);
  await db.batch([
    db.prepare("DELETE FROM demo_sesiones WHERE expira <= ?").bind(ahora),
    db.prepare("DELETE FROM demo_limites WHERE vence <= ?").bind(ahora)
  ]);
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  const expira=ahora+DURACION;
  await db.prepare("INSERT INTO demo_sesiones (id, expira) VALUES (?, ?)").bind(await hash(token),expira).run();
  return json({activa:true,expira},201,{"Set-Cookie":COOKIE+"="+token+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age="+DURACION});
}
export async function atenderDemo(request,env,url,json){
  const ruta=url.pathname,metodo=request.method;
  if(ruta==="/api/demo/registro"){
    if(metodo!=="GET")return error(json,"Método no permitido.",405);
    return json({modo:"demo-ficticia",establecimientos:establecimientos.map(({catalogo,...e})=>e),planes});
  }
  if(ruta==="/api/demo/contexto"){
    if(metodo!=="GET")return error(json,"Método no permitido.",405);
    const ctx=contextoDemo(url.searchParams.get("negocio"),url.searchParams.get("plan"));
    return ctx?json({...ctx,persistenciaConfigurada:Boolean(env.DEMO_DB&&env.DEMO_DB!==env.DB&&typeof env.DEMO_RATE_SECRET==="string"&&env.DEMO_RATE_SECRET.length>=32)}):error(json,"Establecimiento o plan desconocido.",404);
  }
  if(!["/api/demo/sesion","/api/demo/catalogo"].includes(ruta))return error(json,"Ruta de demo no disponible.",404);
  if(ruta==="/api/demo/sesion"&&metodo!=="POST"||ruta==="/api/demo/catalogo"&&!["GET","PUT"].includes(metodo))return error(json,"Método no permitido.",405);
  if(metodo!=="GET"&&request.headers.get("Origin")!==url.origin)return error(json,"Origen no permitido.",403);
  if(!env.DEMO_DB||env.DEMO_DB===env.DB||typeof env.DEMO_RATE_SECRET!=="string"||env.DEMO_RATE_SECRET.length<32)return error(json,"Persistencia de demostración no configurada.",503);
  if(ruta==="/api/demo/sesion")return iniciar(request,env,json);
  const ctx=contextoDemo(url.searchParams.get("negocio"),url.searchParams.get("plan"));
  if(!ctx)return error(json,"Establecimiento o plan desconocido.",404);
  if(!ctx.capacidades.some(m=>m.id==="catalogo"&&m.estadoEfectivo==="disponible"))return error(json,"Módulo no disponible.",403);
  const db=env.DEMO_DB,ahora=segundos(),s=await sesion(request,db,ahora);
  if(!s)return error(json,"Inicia una sesión de práctica en servidor.",401);
  const id=ctx.establecimiento.id;
  if(metodo==="GET"){
    const fila=await db.prepare("SELECT revision, datos_json FROM demo_catalogos WHERE sesion_id=? AND establecimiento_id=?").bind(s.id,id).first();
    return json({establecimiento:id,revision:fila?.revision??0,catalogo:fila?JSON.parse(fila.datos_json):ctx.establecimiento.catalogo,expira:s.expira});
  }
  const datos=await leerJsonLimitado(request,65536);
  if(!Number.isSafeInteger(datos?.revision)||datos.revision<0||datos.revision>=1000000)return error(json,"Revisión inválida.",400);
  let catalogo;
  try{catalogo=validarCatalogoDemo(id,datos.catalogo);}catch(e){return error(json,e.message,400);}
  const serial=JSON.stringify(catalogo);
  if(encoder.encode(serial).length>60000)return error(json,"Catálogo demasiado grande.",413);
  const fila=datos.revision===0
    ? await db.prepare("INSERT INTO demo_catalogos (sesion_id, establecimiento_id, revision, datos_json) SELECT ?, ?, 1, ? WHERE EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) ON CONFLICT(sesion_id, establecimiento_id) DO NOTHING RETURNING revision").bind(s.id,id,serial,s.id,ahora).first()
    : await db.prepare("UPDATE demo_catalogos SET revision=revision+1, datos_json=? WHERE sesion_id=? AND establecimiento_id=? AND revision=? AND EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) RETURNING revision").bind(serial,s.id,id,datos.revision,s.id,ahora).first();
  if(!fila)return error(json,"La copia cambió o expiró. Recarga antes de guardar.",409);
  return json({establecimiento:id,revision:fila.revision,catalogo,expira:s.expira});
}
