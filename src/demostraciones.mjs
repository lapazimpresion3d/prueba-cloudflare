import {atenderCuentasDemo,cuentasListas} from "./cuentas-demo.mjs";
import {atenderReservasDemo,reservasListas} from "./reservaciones-demo.mjs";
// API exclusivamente de demostraciones. Nunca utiliza env.DB ni credenciales de El Comal.
import { establecimientos, obtenerEstablecimiento } from "../public/demostraciones/establecimientos.mjs";
import { planes, capacidades } from "../public/demostraciones/config.mjs";
import { validarOferta, LIMITE_CATALOGO_BYTES, validarTamanoCatalogo } from "../public/demostraciones/catalogo-local.mjs";
import { validarPerfil, perfilPlano, crearPerfilesLocales } from "../public/demostraciones/perfil-local.mjs";
import { leerJsonLimitado } from "./seguridad.mjs";
import {atenderPedidosDemo,pedidosListos} from "./pedidos-demo.mjs";
import {atenderCitasDemo,citasListas} from "./citas-demo.mjs";

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
  return validarTamanoCatalogo(catalogo.map(p=>{
    if(!p||vistos.has(p.id)||!(e.catalogo.some(x=>x.id===p.id)||/^local-[1-9][0-9]{0,3}$/.test(p.id)))throw Error("Identificador de oferta inválido o duplicado.");
    if(typeof p.disponible!=="boolean")throw Error("Disponibilidad inválida.");
    vistos.add(p.id);
    return validarOferta(p,p.id,e.catalogo.find(x=>x.id===p.id));
  }));
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
function configurado(env){
  return Boolean(env.DEMO_DB&&env.DEMO_DB!==env.DB&&typeof env.DEMO_RATE_SECRET==="string"&&env.DEMO_RATE_SECRET.length>=32);
}
async function esquemaListo(env){
  if(!configurado(env))return false;
  try{
    const fila=await env.DEMO_DB.prepare("SELECT version FROM demo_identidad WHERE clave = 'lapaz-demo-practica'").first();
    return fila?.version===1;
  }catch{return false;}
}
async function perfilListo(env){
  if(!await esquemaListo(env))return false;
  try{const fila=await env.DEMO_DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='demo_perfiles'").first();return fila?.name==="demo_perfiles";}catch{return false;}
}
async function atenderPerfil(request,env,ctx,json){
  if(!await perfilListo(env))return error(json,"Guardado de identidad pendiente de configuración.",503);
  const db=env.DEMO_DB,ahora=segundos(),s=await sesion(request,db,ahora),id=ctx.establecimiento.id;
  if(!s)return error(json,"Inicia una sesión de práctica.",401);
  if(request.method==="GET"){
    const fila=await db.prepare("SELECT revision, datos_json FROM demo_perfiles WHERE sesion_id=? AND establecimiento_id=?").bind(s.id,id).first();
    return json({establecimiento:id,revision:fila?.revision??0,perfil:fila?JSON.parse(fila.datos_json):crearPerfilesLocales().leer(id),expira:s.expira});
  }
  const datos=await leerJsonLimitado(request,220000);
  if(!Number.isSafeInteger(datos?.revision)||datos.revision<0||datos.revision>=1000000)return error(json,"Revisión inválida.",400);
  let perfil;
  try{perfil=validarPerfil(id,perfilPlano(datos.perfil));}catch{return error(json,"Revisa la identidad y los datos de ejemplo.",400);}
  const serial=JSON.stringify(perfil);
  const fila=datos.revision===0
    ? await db.prepare("INSERT INTO demo_perfiles (sesion_id, establecimiento_id, revision, datos_json) SELECT ?, ?, 1, ? WHERE EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) ON CONFLICT(sesion_id, establecimiento_id) DO NOTHING RETURNING revision").bind(s.id,id,serial,s.id,segundos()).first()
    : await db.prepare("UPDATE demo_perfiles SET revision=revision+1, datos_json=? WHERE sesion_id=? AND establecimiento_id=? AND revision=? AND EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) RETURNING revision").bind(serial,s.id,id,datos.revision,s.id,segundos()).first();
  if(!fila)return error(json,"La copia cambió o expiró. Carga la versión guardada antes de continuar.",409);
  return json({establecimiento:id,revision:fila.revision,perfil,expira:s.expira});
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
    return ctx?json({...ctx,persistenciaConfigurada:await esquemaListo(env),perfilConfigurado:await perfilListo(env),pedidosConfigurados:await esquemaListo(env)&&await pedidosListos(env.DEMO_DB),citasConfiguradas:await esquemaListo(env)&&await citasListas(env.DEMO_DB),reservacionesConfiguradas:await esquemaListo(env)&&await reservasListas(env.DEMO_DB),cuentasConfiguradas:await esquemaListo(env)&&await pedidosListos(env.DEMO_DB)&&await cuentasListas(env.DEMO_DB)}):error(json,"Establecimiento o plan desconocido.",404);
  }
  if(!["/api/demo/sesion","/api/demo/catalogo","/api/demo/perfil","/api/demo/pedidos","/api/demo/citas","/api/demo/reservaciones","/api/demo/cuentas"].includes(ruta))return error(json,"Ruta de demo no disponible.",404);
  if(ruta==="/api/demo/sesion"&&metodo!=="POST"||["/api/demo/catalogo","/api/demo/perfil"].includes(ruta)&&!["GET","PUT"].includes(metodo)||["/api/demo/pedidos","/api/demo/citas","/api/demo/reservaciones","/api/demo/cuentas"].includes(ruta)&&!["GET","POST","PATCH"].includes(metodo))return error(json,"Método no permitido.",405);
  if(metodo!=="GET"&&request.headers.get("Origin")!==url.origin)return error(json,"Origen no permitido.",403);
  if(!await esquemaListo(env))return error(json,"Persistencia de demostración no configurada o esquema no preparado.",503);
  if(ruta==="/api/demo/sesion")return iniciar(request,env,json);
  const ctx=contextoDemo(url.searchParams.get("negocio"),url.searchParams.get("plan"));
  if(!ctx)return error(json,"Establecimiento o plan desconocido.",404);
  if(ruta==="/api/demo/cuentas"){
    const s=await sesion(request,env.DEMO_DB,segundos());if(!s)return error(json,"Inicia una sesión de práctica.",401);
    return atenderCuentasDemo(request,env.DEMO_DB,s,ctx,json);
  }
  if(ruta==="/api/demo/reservaciones"){
    const s=await sesion(request,env.DEMO_DB,segundos());
    if(!s)return error(json,"Inicia una sesión de práctica.",401);
    return atenderReservasDemo(request,env.DEMO_DB,s,ctx,json);
  }
  if(ruta==="/api/demo/citas"){
    if(!ctx.capacidades.some(m=>m.id==="citas"&&m.estadoEfectivo==="disponible"))return error(json,"Citas no incluidas en esta demostración.",403);
    const s=await sesion(request,env.DEMO_DB,segundos());
    if(!s)return error(json,"Inicia una sesión de práctica.",401);
    return atenderCitasDemo(request,env.DEMO_DB,s,ctx,json);
  }
  if(ruta==="/api/demo/pedidos"){
    if(!ctx.capacidades.some(m=>m.id==="pedidos"&&m.estadoEfectivo==="disponible"))return error(json,"Pedidos no incluidos en esta demostración.",403);
    const s=await sesion(request,env.DEMO_DB,segundos());
    if(!s)return error(json,"Inicia una sesión de práctica.",401);
    return atenderPedidosDemo(request,env.DEMO_DB,s,ctx,json);
  }
  if(ruta==="/api/demo/perfil"){
    if(!ctx.capacidades.some(m=>m.id==="web"&&m.estadoEfectivo==="disponible"))return error(json,"Módulo no disponible.",403);
    return atenderPerfil(request,env,ctx,json);
  }
  if(!ctx.capacidades.some(m=>m.id==="catalogo"&&m.estadoEfectivo==="disponible"))return error(json,"Módulo no disponible.",403);
  const db=env.DEMO_DB,ahora=segundos(),s=await sesion(request,db,ahora);
  if(!s)return error(json,"Inicia una sesión de práctica en servidor.",401);
  const id=ctx.establecimiento.id;
  if(metodo==="GET"){
    const fila=await db.prepare("SELECT revision, datos_json FROM demo_catalogos WHERE sesion_id=? AND establecimiento_id=?").bind(s.id,id).first();
    return json({establecimiento:id,revision:fila?.revision??0,catalogo:fila?JSON.parse(fila.datos_json):ctx.establecimiento.catalogo,expira:s.expira});
  }
  const datos=await leerJsonLimitado(request,LIMITE_CATALOGO_BYTES+4096);
  if(!Number.isSafeInteger(datos?.revision)||datos.revision<0||datos.revision>=1000000)return error(json,"Revisión inválida.",400);
  let catalogo;
  try{catalogo=validarCatalogoDemo(id,datos.catalogo);}catch(e){return error(json,e.message,400);}
  const serial=JSON.stringify(catalogo);
  if(encoder.encode(serial).length>LIMITE_CATALOGO_BYTES)return error(json,"Catálogo demasiado grande.",413);
  const fila=datos.revision===0
    ? await db.prepare("INSERT INTO demo_catalogos (sesion_id, establecimiento_id, revision, datos_json) SELECT ?, ?, 1, ? WHERE EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) ON CONFLICT(sesion_id, establecimiento_id) DO NOTHING RETURNING revision").bind(s.id,id,serial,s.id,ahora).first()
    : await db.prepare("UPDATE demo_catalogos SET revision=revision+1, datos_json=? WHERE sesion_id=? AND establecimiento_id=? AND revision=? AND EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) RETURNING revision").bind(serial,s.id,id,datos.revision,s.id,ahora).first();
  if(!fila)return error(json,"La copia cambió o expiró. Recarga antes de guardar.",409);
  return json({establecimiento:id,revision:fila.revision,catalogo,expira:s.expira});
}
