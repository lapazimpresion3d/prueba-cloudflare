import {estadoComercial,resolverTransicionComercial} from "./estados-comerciales.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
// Stage 52.3.7.1 exposes read-only lifecycle inspection. Mutations remain closed until access safeguards are integrated.
export async function crearCicloComercial(env,{habilitado=false,autenticarCentral,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function")throw Error("Ciclo no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND s.hash=? AND o.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>?)";
 async function contexto(r,empresa,metodo="GET"){
  if(habilitado!==true||r.method!==metodo||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin||new URL(r.url).protocol!=="https:"||!id(empresa))throw Error("Consulta no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0)throw Error("Consulta no autorizada.");
  const args=[a.emisor,a.sujeto,await hash(t),n,n-600000];
  if(!await q("SELECT 1 AS autorizado WHERE "+guard,...args).first())throw Error("Consulta no autorizada.");
  return {n,args};
 }
 return Object.freeze({
 async consultar(r,{empresa}={}){const a=await contexto(r,empresa);const s=await q("SELECT e.id AS empresa,e.activa,s.plan,s.version,s.estado,s.inicio,s.vence,s.revision,c.anterior AS estado_previo FROM empresas e JOIN comercial_contratos_iniciales k ON k.empresa=e.id LEFT JOIN comercial_suscripciones s ON s.empresa=e.id LEFT JOIN comercial_ciclo_vida c ON c.empresa=e.id AND c.revision=s.revision WHERE e.id=? AND "+guard,empresa,...a.args).first();if(!s)throw Error("Comercio no disponible.");return {...s,estado_efectivo:estadoComercial(s.estado===null?null:s,a.n),operaciones_habilitadas:s.activa===1&&["activa","prueba"].includes(s.estado),acciones_disponibles:s.activa===1&&["activa","prueba"].includes(s.estado)?["suspender"]:[]};},
 async suspender(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!Number.isSafeInteger(d.revision)||d.revision<1||d.revision>=Number.MAX_SAFE_INTEGER||typeof d.motivo!=="string"||!d.motivo.trim()||d.motivo.length>1000||Object.keys(d).some(k=>!["empresa","revision","motivo"].includes(k)))throw Error("Suspensión inválida.");
  const actual=await q("SELECT estado,inicio,vence FROM comercial_suscripciones WHERE empresa=? AND revision=? AND "+guard,d.empresa,d.revision,...a.args).first();
  if(!actual||resolverTransicionComercial(actual,"suspender",a.n)!=="suspendida")throw Error("Suspensión no disponible.");
  const operador="SELECT o.id FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND s.hash=? AND o.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>? AND s.creado>?";
  const args=[...a.args,a.n-300000];
  const fila=await q("INSERT INTO comercial_ciclo_vida(empresa,revision,anterior,posterior,accion,motivo,operador,fecha) SELECT s.empresa,s.revision+1,s.estado,'suspendida','suspender',?,("+operador+"),? FROM comercial_suscripciones s JOIN comercial_contratos_iniciales k ON k.empresa=s.empresa JOIN empresas e ON e.id=s.empresa WHERE s.empresa=? AND s.revision=? AND s.estado IN ('prueba','activa') AND e.activa=1 AND ("+operador+") IS NOT NULL RETURNING revision,posterior AS estado",d.motivo.trim(),...args,a.n,d.empresa,d.revision,...args).first();
  if(!fila)throw Error("Conflicto de revisión o autorización.");return fila;
 },
 async historial(r,{empresa,antes=null}={}){const a=await contexto(r,empresa);if(antes!==null&&(!Number.isSafeInteger(antes)||antes<2))throw Error("Revisión inválida.");return (await q("SELECT revision,anterior,posterior,accion,motivo,operador,fecha FROM comercial_ciclo_vida WHERE empresa=? AND "+guard+" AND (? IS NULL OR revision<?) ORDER BY revision DESC LIMIT 50",empresa,...a.args,antes,antes).all()).results;}
 });
}
