import {preciosConfirmados,precioConfirmado} from "./precios-confirmados.mjs";
import {propuestaPrestaciones} from "./prestaciones-mensuales.mjs";
import {validarModulosContractuales} from "./compatibilidad-modulos.mjs";
import {idsModulos} from "./catalogo-contractual.mjs";
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
export async function crearPlanesCentral(env,{habilitado=false,autenticarCentral,versiones,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function"||typeof versiones?.publicar!=="function")throw Error("Catálogo no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM central_operadores o JOIN central_sesiones cs ON cs.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND cs.hash=? AND o.activo=1 AND o.rol IN ('administrador','comercial','consulta') AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND (?=0 OR (cs.creado>? AND o.rol IN ('administrador'))))";
 async function contexto(r,m){
  if(habilitado!==true||r.method!==m||new URL(r.url).protocol!=="https:"||m==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Operación no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0)throw Error("Operación no autorizada.");
  return {n,args:[a.emisor,a.sujeto,await hash(t),n,n-600000,m==="POST"?1:0,n-300000]};
 }
 const cols="p.id,p.version,p.nombre,p.implementacion,p.mensualidad,p.moneda,p.usuarios,p.sucursales,p.modulos,b.fecha AS publicada";
 const base=" FROM comercial_planes p LEFT JOIN comercial_plan_publicaciones b ON b.plan=p.id AND b.version=p.version";
 const normalizar=p=>({...p,modulos:JSON.parse(p.modulos),publicada:p.version===1||p.publicada!==null,precio_confirmado:precioConfirmado(p)});
 return Object.freeze({
 async listar(r){
  const a=await contexto(r,"GET");
  const rs=await db.batch([q("SELECT 1 AS autorizado WHERE "+guard,...a.args),q("SELECT "+cols+base+" WHERE "+guard+" AND p.version=(SELECT MAX(v.version) FROM comercial_planes v WHERE v.id=p.id) ORDER BY p.id",...a.args),q("SELECT "+cols+base+" WHERE "+guard+" AND (p.version=1 OR b.version IS NOT NULL) AND p.version=(SELECT MAX(v.version) FROM comercial_planes v WHERE v.id=p.id AND (v.version=1 OR EXISTS(SELECT 1 FROM comercial_plan_publicaciones z WHERE z.plan=v.id AND z.version=v.version))) ORDER BY p.id",...a.args)]);
  if(rs[0].results?.[0]?.autorizado!==1)throw Error("Operación no autorizada.");
  return {fecha:a.n,actuales:rs[1].results.map(normalizar),ofertas:rs[2].results.map(normalizar).filter(p=>p.precio_confirmado),precios:preciosConfirmados,prestaciones:propuestaPrestaciones,modulos:idsModulos};
 },
 async historial(r,{plan,offset=0}={}){
  const a=await contexto(r,"GET");
  if(!Object.hasOwn(preciosConfirmados,plan)||!Number.isSafeInteger(offset)||offset<0||offset>1000000)throw Error("Consulta inválida.");
  const rs=await db.batch([q("SELECT 1 AS autorizado WHERE "+guard,...a.args),q("SELECT "+cols+base+" WHERE p.id=? AND "+guard+" ORDER BY p.version DESC LIMIT 26 OFFSET ?",plan,...a.args,offset)]);
  if(rs[0].results?.[0]?.autorizado!==1)throw Error("Operación no autorizada.");
  return {plan,offset,mas:rs[1].results.length>25,items:rs[1].results.slice(0,25).map(normalizar)};
 },
 async publicar(r,d){
  const a=await contexto(r,"POST");
  if(!d||typeof d!=="object"||Array.isArray(d)||Object.keys(d).length!==3||!Object.hasOwn(preciosConfirmados,d.plan)||!Number.isSafeInteger(d.versionAnterior)||d.versionAnterior<1||d.confirmacion!=="PUBLICAR:"+d.plan+":"+d.versionAnterior)throw Error("Confirmación inválida.");
  const p=await q("SELECT "+cols+base+" WHERE p.id=? AND p.version=? AND p.version=(SELECT MAX(v.version) FROM comercial_planes v WHERE v.id=p.id) AND (p.version=1 OR b.version IS NOT NULL) AND "+guard,d.plan,d.versionAnterior,...a.args).first();
  if(!p||precioConfirmado(p))throw Error("Regularización no disponible.");
  const modulos=JSON.parse(p.modulos);
  if(!validarModulosContractuales(modulos))throw Error("Módulos incompatibles.");
  return versiones.publicar(r,{plan:p.id,versionAnterior:p.version,nombre:p.nombre,moneda:"MXN",...preciosConfirmados[p.id],usuarios:p.usuarios,sucursales:p.sucursales,modulos});
 }
 });
}
