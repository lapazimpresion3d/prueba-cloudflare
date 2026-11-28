import {resolverCompatibilidad} from "./compatibilidad-modulos.mjs";
import {validarOperativosAsistente} from "./rutas-asistente.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
export async function crearEntregaComercial(env,{habilitado=false,autenticarCentral,reloj=Date.now,operativos=[]}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function"||!validarOperativosAsistente(operativos))throw Error("Entrega no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const disponibles=Object.freeze([...operativos]),q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="SELECT o.id FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND s.hash=? AND o.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>? AND (?=0 OR s.creado>?)";
 async function contexto(r,metodo){
  if(habilitado!==true||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Entrega no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].split("=")[1]:"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0)throw Error("Entrega no autorizada.");
  const args=[a.emisor,a.sujeto,await hash(t),n,n-600000,metodo==="POST"?1:0,n-300000];
  if(!await q(guard,...args).first())throw Error("Entrega no autorizada.");return {args,n};
 }
 const leer=(empresa,a)=>q("SELECT r.revision,r.estado,r.validacion,r.motivo,r.fecha,v.resultado,v.evidencia=e.evidencia AS evidencia_vigente,v.revision=(SELECT MAX(revision) FROM comercio_asistente_validaciones WHERE empresa=r.empresa) AS ultima_validacion,e.evidencia AS actual,p.giro,i.revision AS revision_implementacion,i.estado AS implementacion,s.estado AS suscripcion,s.inicio,s.vence,pl.modulos AS contratados,ac.modulos AS seleccion,(SELECT count(*) FROM membresias WHERE empresa=r.empresa AND activa=1)<=pl.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=r.empresa AND activa=1)<=pl.sucursales AS limites FROM central_entrega_revisiones r JOIN comercio_asistente_validaciones v ON v.empresa=r.empresa AND v.revision=r.validacion JOIN comercio_evidencia_entrega e ON e.empresa=r.empresa JOIN comercio_perfiles_privados p ON p.empresa=r.empresa JOIN central_implementaciones i ON i.empresa=r.empresa LEFT JOIN comercial_suscripciones s ON s.empresa=r.empresa LEFT JOIN comercial_planes pl ON pl.id=s.plan AND pl.version=s.version LEFT JOIN comercial_activaciones ac ON ac.empresa=r.empresa WHERE r.empresa=? AND ("+guard+") IS NOT NULL ORDER BY r.revision DESC LIMIT 1",empresa,...a.args).first();
 function revisar(x,n){
  const checklist=JSON.parse(x.resultado),bloqueos=[...checklist.bloqueos];
  if(!x.evidencia_vigente||!x.ultima_validacion)bloqueos.push("revision_obsoleta");
  if(checklist.preparado!==true)bloqueos.push("preparacion_pendiente");
  if(!["activa","prueba"].includes(x.suscripcion)||!(x.inicio<=n&&x.vence>n)||x.limites!==1)bloqueos.push("contrato_o_cupos");
  if(!["pendiente","configuracion","revision"].includes(x.implementacion))bloqueos.push("implementacion_cerrada");
  if(x.contratados){const seleccion=new Set(JSON.parse(x.seleccion??"[]"));for(const m of resolverCompatibilidad({giro:x.giro,contratados:JSON.parse(x.contratados),operativos:disponibles}).modulos.filter(m=>m.aplicable)){if(!m.disponibleTecnico||!seleccion.has(m.id))bloqueos.push("activacion:"+m.id);}}
  else bloqueos.push("contrato_pendiente");
  return {checklist,bloqueos:[...new Set(bloqueos)],aprobable:bloqueos.length===0};
 }
 return Object.freeze({
 async consultar(r,{empresa}={}){const a=await contexto(r,"GET");if(!id(empresa))throw Error("Empresa inválida.");const x=await leer(empresa,a);if(!x)return null;return {revision:x.revision,estado:x.estado,validacion:x.validacion,motivo:x.motivo,fecha:x.fecha,...revisar(x,a.n)};},
 async historial(r,{empresa}={}){const a=await contexto(r,"GET");if(!id(empresa))throw Error("Empresa inválida.");return (await q("SELECT revision,validacion,estado,motivo,propietario,operador,fecha FROM central_entrega_revisiones WHERE empresa=? AND ("+guard+") IS NOT NULL ORDER BY revision DESC LIMIT 50",empresa,...a.args).all()).results;},
 async decidir(r,d){
  const a=await contexto(r,"POST");
  if(!id(d?.empresa)||!Number.isSafeInteger(d.revision)||d.revision<1||!["correccion","rechazada","aprobada","entregada"].includes(d.estado)||typeof d.motivo!=="string"||d.motivo.trim().length<1||d.motivo.length>1000||Object.keys(d).some(k=>!["empresa","revision","estado","motivo"].includes(k)))throw Error("Decisión inválida.");
  const x=await leer(d.empresa,a);
  if(!x||x.revision!==d.revision||!(d.estado==="correccion"?["solicitada","aprobada"].includes(x.estado):x.estado===(d.estado==="entregada"?"aprobada":"solicitada")))throw Error("Conflicto de revisión.");
  const critico=["aprobada","entregada"].includes(d.estado);
  if(critico&&!revisar(x,a.n).aprobable)throw Error("Entrega bloqueada.");
  const stm=[q("INSERT INTO central_entrega_revisiones(empresa,revision,validacion,estado,motivo,operador,fecha) SELECT ?,?,?,?,?,("+guard+"),? WHERE ("+guard+") IS NOT NULL AND (SELECT MAX(revision) FROM central_entrega_revisiones WHERE empresa=?)=?"+(critico?" AND (SELECT evidencia FROM comercio_evidencia_entrega WHERE empresa=?)=?": "")+" RETURNING revision,estado",d.empresa,d.revision+1,x.validacion,d.estado,d.motivo.trim(),...a.args,a.n,...a.args,d.empresa,d.revision,...(critico?[d.empresa,x.actual]:[]))];
  stm.push(q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,posterior) SELECT operador,empresa,'entrega.'||estado,CAST(revision AS TEXT),fecha,json_object('validacion',validacion,'estado',estado) FROM central_entrega_revisiones WHERE empresa=? AND revision=? AND changes()=1",d.empresa,d.revision+1));
  if(d.estado==="entregada")stm.push(q("UPDATE central_implementaciones SET estado='entregada',revision=revision+1 WHERE empresa=? AND revision=? AND changes()=1 RETURNING revision",d.empresa,x.revision_implementacion));
  const res=await db.batch(stm);if(!res[0].results?.length)throw Error("Conflicto de autorización.");if(d.estado==="entregada"&&!res[2].results?.length)throw Error("Entrega no confirmada.");return res[0].results[0];
 }
 });
}
