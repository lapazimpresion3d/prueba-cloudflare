import {validarModulosContractuales} from "./compatibilidad-modulos.mjs";
import {idsPlanes,idsModulos} from "./catalogo-contractual.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const entero=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
// Internal only. No routes. Published versions are immutable; no subscription is changed.
export async function crearVersionesContractuales(env,{habilitado=false,autenticarCentral,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function")throw Error("Catálogo no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="SELECT o.id FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND s.hash=? AND o.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>? AND s.creado>?";
 async function central(r){
  if(habilitado!==true||r.method!=="POST"||new URL(r.url).protocol!=="https:"||r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Catálogo no autorizado.");
  const a=await autenticarCentral(r),cookies=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=cookies.length===1?cookies[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!entero(n,0,Number.MAX_SAFE_INTEGER))throw Error("Catálogo no autorizado.");
  return {n,args:[a.emisor,a.sujeto,await hash(t),n,n-600000,n-300000]};
 }
 return Object.freeze({
 async publicar(r,d){
  const {n,args}=await central(r);
  if(!d||!idsPlanes.includes(d.plan)||!entero(d.versionAnterior,1,2147483646)||typeof d.nombre!=="string"||!d.nombre.trim()||d.nombre.trim().length>120||d.moneda!=="MXN"||!entero(d.implementacion,0,100000000)||!entero(d.mensualidad,0,100000000)||!entero(d.usuarios,1,10000)||!entero(d.sucursales,1,10000)||!Array.isArray(d.modulos)||!d.modulos.length||d.modulos.length>idsModulos.length||new Set(d.modulos).size!==d.modulos.length||d.modulos.some(m=>!idsModulos.includes(m))||!validarModulosContractuales(d.modulos))throw Error("Versión contractual inválida.");
  const v=d.versionAnterior+1,modulos=JSON.stringify(idsModulos.filter(m=>d.modulos.includes(m)));
  const res=await db.batch([
   q("INSERT INTO comercial_planes(id,version,nombre,implementacion,mensualidad,moneda,usuarios,sucursales,modulos) SELECT ?,?,?,?,?,?,?,?,? WHERE ("+guard+") IS NOT NULL AND (SELECT MAX(version) FROM comercial_planes WHERE id=?)=? RETURNING version",d.plan,v,d.nombre.trim(),d.implementacion,d.mensualidad,d.moneda,d.usuarios,d.sucursales,modulos,...args,d.plan,d.versionAnterior),
   q("INSERT INTO comercial_plan_publicaciones(plan,version,operador,fecha) SELECT ?,?,("+guard+"),? WHERE changes()=1",d.plan,v,...args,n),
   q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,posterior) SELECT p.operador,NULL,'plan.version_publicada',p.plan||':'||p.version,p.fecha,json_object('version',c.version,'nombre',c.nombre,'implementacion',c.implementacion,'mensualidad',c.mensualidad,'moneda',c.moneda,'usuarios',c.usuarios,'sucursales',c.sucursales,'modulos',json(c.modulos)) FROM comercial_plan_publicaciones p JOIN comercial_planes c ON c.id=p.plan AND c.version=p.version WHERE p.plan=? AND p.version=? AND changes()=1",d.plan,v)
  ]);
  if(!res[0].results?.length)throw Error("Conflicto de versión o autorización.");
  return {plan:d.plan,version:v};
 },
 async consultarVersion(r,{plan,version}={}){
  const {args}=await central(r);
  if(!idsPlanes.includes(plan)||!entero(version,1,2147483647))throw Error("Versión inválida.");
  const x=await q("SELECT c.*,p.fecha AS publicada FROM comercial_planes c LEFT JOIN comercial_plan_publicaciones p ON p.plan=c.id AND p.version=c.version WHERE c.id=? AND c.version=? AND ("+guard+") IS NOT NULL",plan,version,...args).first();
  if(!x)throw Error("Versión no disponible.");
  return {...x,modulos:JSON.parse(x.modulos)};
 },
 async consultarActual(r,{plan}={}){
  const {args}=await central(r);
  if(!idsPlanes.includes(plan))throw Error("Plan inválido.");
  const x=await q("SELECT c.*,p.fecha AS publicada FROM comercial_planes c LEFT JOIN comercial_plan_publicaciones p ON p.plan=c.id AND p.version=c.version WHERE c.id=? AND c.version=(SELECT MAX(version) FROM comercial_planes WHERE id=c.id) AND ("+guard+") IS NOT NULL",plan,...args).first();
  if(!x)throw Error("Plan no disponible.");
  return {...x,modulos:JSON.parse(x.modulos)};
 }
 });
}
