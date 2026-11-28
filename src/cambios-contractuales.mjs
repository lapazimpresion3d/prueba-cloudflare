import {validarSeleccion} from "./activacion-comercial.mjs";
import {idsPlanes,idsModulos} from "./catalogo-contractual.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const entero=x=>Number.isSafeInteger(x)&&x>=0;
const lista=x=>Array.isArray(x)&&x.length<=idsModulos.length&&new Set(x).size===x.length&&x.every(m=>idsModulos.includes(m));
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
// Internal only. No payments, deletion of operational data, or lifecycle reactivation.
export async function crearCambiosContractuales(env,{habilitado=false,autenticarCentral,reloj=Date.now,operativos=[]}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function"||!lista(operativos))throw Error("Cambio no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a),disponibles=Object.freeze([...operativos]);
 const guard="SELECT o.id FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND s.hash=? AND o.activo=1 AND o.rol='administrador' AND s.revocado IS NULL AND s.expira>? AND s.ultima>? AND s.creado>?";
 return Object.freeze({async cambiar(r,d){
  if(habilitado!==true||r.method!=="POST"||new URL(r.url).protocol!=="https:"||r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Cambio no autorizado.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!entero(n))throw Error("Cambio no autorizado.");
  if(!id(d?.empresa)||!idsPlanes.includes(d.plan)||!entero(d.version)||d.version<1||!entero(d.revision)||d.revision<1||!entero(d.revisionActivacion)||d.revisionActivacion<1||!entero(d.vence)||d.vence<=n||!lista(d.modulos)||typeof d.referencia!=="string"||!d.referencia.trim()||d.referencia.trim().length>120||Object.keys(d).some(k=>!["empresa","plan","version","revision","revisionActivacion","vence","modulos","referencia"].includes(k)))throw Error("Cambio inválido.");
  const args=[a.emisor,a.sujeto,await hash(t),n,n-600000,n-300000];
  const contexto=" FROM comercial_suscripciones s JOIN comercial_activaciones x ON x.empresa=s.empresa JOIN comercial_contratos_iniciales k ON k.empresa=s.empresa JOIN comercio_altas_pendientes z ON z.id=k.alta AND z.empresa=k.empresa JOIN empresas e ON e.id=s.empresa JOIN comercial_planes p ON p.id=? AND p.version=? WHERE s.empresa=? AND s.revision=? AND x.revision=? AND e.activa=1 AND z.estado='aceptada' AND s.estado IN ('activa','prueba') AND s.inicio<=? AND (p.version=1 OR EXISTS(SELECT 1 FROM comercial_plan_publicaciones b WHERE b.plan=p.id AND b.version=p.version)) AND EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=e.id AND m.rol='propietario' AND m.alcance='empresa' AND m.activa=1 AND u.activo=1) AND (SELECT count(*) FROM membresias WHERE empresa=e.id AND activa=1)<=p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=e.id AND activa=1)<=p.sucursales";
  const f=[d.plan,d.version,d.empresa,d.revision,d.revisionActivacion,n];
  const x=await q("SELECT s.plan,s.version,s.inicio,s.vence,s.estado,x.modulos AS anteriores,p.modulos,z.giro"+contexto+" AND ("+guard+") IS NOT NULL",...f,...args).first();
  if(!x||d.vence<x.vence)throw Error("Contrato no disponible o vigencia reducida.");
  const seleccion=JSON.stringify(validarSeleccion({giro:x.giro,contratados:JSON.parse(x.modulos),operativos:disponibles,seleccion:d.modulos}));
  const rev=d.revision+1,ra=d.revisionActivacion+1;
  const res=await db.batch([
   q("INSERT INTO comercial_cambios_contractuales(empresa,revision,revision_activacion,plan,version,inicio,vence,modulos,operador,fecha,referencia) SELECT s.empresa,?,?,p.id,p.version,s.inicio,?,?,("+guard+"),?,?"+contexto+" AND z.giro=? AND s.vence<=? AND ("+guard+") IS NOT NULL ON CONFLICT(empresa,revision) DO NOTHING RETURNING revision",rev,ra,d.vence,seleccion,...args,n,d.referencia.trim(),...f,x.giro,d.vence,...args),
   q("UPDATE comercial_activaciones SET revision=revision+1,modulos=?,operador=(SELECT operador FROM comercial_cambios_contractuales WHERE empresa=? AND revision=?),fecha=? WHERE empresa=? AND revision=? AND changes()=1 RETURNING revision",seleccion,d.empresa,rev,n,d.empresa,d.revisionActivacion),
   q("UPDATE comercial_suscripciones SET plan=?,version=?,vence=?,revision=revision+1 WHERE empresa=? AND revision=? AND changes()=1 RETURNING revision",d.plan,d.version,d.vence,d.empresa,d.revision),
   q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,anterior,posterior) SELECT operador,empresa,'contrato.cambio',empresa,fecha,json_object('plan',?,'version',?,'vence',?,'modulos',json(?)),json_object('plan',plan,'version',version,'vence',vence,'modulos',json(modulos),'revision',revision) FROM comercial_cambios_contractuales WHERE empresa=? AND revision=? AND changes()=1",x.plan,x.version,x.vence,x.anteriores,d.empresa,rev)
  ]);
  if(!res[0].results?.length||!res[1].results?.length||!res[2].results?.length)throw Error("Conflicto de cambio contractual.");
  return {empresa:d.empresa,plan:d.plan,version:d.version,revision:rev,revisionActivacion:ra,modulos:JSON.parse(seleccion),vence:d.vence};
 }});
}
