// Central implementation tracking; decisions delegated to delivery service.
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
export function decisionesEntrega(v){
 if(!v)return [];
 if(v.estado==="solicitada")return ["correccion","rechazada",...(v.aprobable===true?["aprobada"]:[])];
 if(v.estado==="aprobada")return ["correccion",...(v.aprobable===true?["entregada"]:[])];
 return [];
}
export async function crearImplementacionesCentral(env,{habilitado=false,autenticarCentral,entrega,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function"||!["consultar","historial","decidir"].every(k=>typeof entrega?.[k]==="function"))throw Error("Implementaciones no configuradas.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM central_operadores o JOIN central_sesiones cs ON cs.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND cs.hash=? AND o.activo=1 AND o.rol IN ('administrador','implementacion','consulta') AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND (?=0 OR (cs.creado>? AND o.rol IN ('administrador','implementacion'))))";
 async function contexto(r,m){
  if(habilitado!==true||r.method!==m||new URL(r.url).protocol!=="https:"||m==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Operación no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0)throw Error("Operación no autorizada.");
  return {n,args:[a.emisor,a.sujeto,await hash(t),n,n-600000,m==="POST"?1:0,n-300000]};
 }
 async function lote(a,stm){const rs=await db.batch([q("SELECT 1 AS autorizado WHERE "+guard,...a.args),...stm]);if(rs[0].results?.[0]?.autorizado!==1)throw Error("Operación no autorizada.");return rs.slice(1).map(x=>x.results);}
 const base=" FROM central_implementaciones i JOIN empresas e ON e.id=i.empresa LEFT JOIN comercio_perfiles_privados p ON p.empresa=e.id LEFT JOIN comercial_suscripciones s ON s.empresa=e.id LEFT JOIN comercio_asistente_progreso g ON g.empresa=e.id AND g.revision=(SELECT MAX(revision) FROM comercio_asistente_progreso WHERE empresa=e.id) LEFT JOIN central_entrega_revisiones r ON r.empresa=e.id AND r.revision=(SELECT MAX(revision) FROM central_entrega_revisiones WHERE empresa=e.id)";
 const cols="e.id AS empresa,e.nombre,e.activa,p.giro,i.estado AS implementacion,i.revision AS revision_implementacion,s.plan,s.version,s.estado AS suscripcion,g.paso,g.estado AS progreso,r.estado AS entrega,r.revision AS revision_entrega";
 return Object.freeze({
 async listar(r,{offset=0,estado=""}={}){
  const a=await contexto(r,"GET");
  if(!Number.isSafeInteger(offset)||offset<0||offset>1000000||!["","pendiente","configuracion","revision","entregada"].includes(estado))throw Error("Consulta inválida.");
  const filtro=" WHERE "+guard+" AND (?='' OR i.estado=?)";
  const [total,items]=await lote(a,[q("SELECT count(*) AS total"+base+filtro,...a.args,estado,estado),q("SELECT "+cols+base+filtro+" ORDER BY e.nombre COLLATE NOCASE,e.id LIMIT 25 OFFSET ?",...a.args,estado,estado,offset)]);
  return {fecha:a.n,offset,total:total[0].total,items};
 },
 async detalle(r,{empresa}={}){
  const a=await contexto(r,"GET");if(!id(empresa))throw Error("Empresa inválida.");
  const [ficha,progreso,validacion,contrato,activacion]=await lote(a,[
   q("SELECT "+cols+base+" WHERE e.id=? AND "+guard,empresa,...a.args),
   q("SELECT revision,paso,visitados,estado,fecha FROM comercio_asistente_progreso WHERE empresa=? AND "+guard+" ORDER BY revision DESC LIMIT 1",empresa,...a.args),
   q("SELECT v.revision,v.resultado,v.fecha,v.evidencia=e.evidencia AS evidencia_vigente FROM comercio_asistente_validaciones v LEFT JOIN comercio_evidencia_entrega e ON e.empresa=v.empresa WHERE v.empresa=? AND "+guard+" ORDER BY v.revision DESC LIMIT 1",empresa,...a.args),
   q("SELECT s.plan,s.version,s.estado,s.inicio,s.vence,p.modulos FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE s.empresa=? AND "+guard,empresa,...a.args),
   q("SELECT revision,modulos FROM comercial_activaciones WHERE empresa=? AND "+guard,empresa,...a.args)
  ]);
  if(ficha.length!==1)throw Error("Implementación no disponible.");
  const v=await entrega.consultar(r,{empresa}),hist=await entrega.historial(r,{empresa});
  const actual=validacion[0];return {fecha:a.n,ficha:ficha[0],progreso:progreso[0]?{...progreso[0],visitados:JSON.parse(progreso[0].visitados)}:null,validacion:actual?{...actual,resultado:JSON.parse(actual.resultado)}:null,contrato:contrato[0]?{...contrato[0],modulos:JSON.parse(contrato[0].modulos)}:null,activacion:activacion[0]?{...activacion[0],modulos:JSON.parse(activacion[0].modulos)}:null,entrega:v,acciones:decisionesEntrega(v),historial:hist.map(({revision,validacion,estado,motivo,fecha})=>({revision,validacion,estado,motivo,fecha}))};
 },
 async decidir(r,d){
  const a=await contexto(r,"POST");
  if(!d||typeof d!=="object"||Array.isArray(d)||Object.keys(d).length!==5||!id(d.empresa)||!Number.isSafeInteger(d.revision)||d.revision<1||!["correccion","rechazada","aprobada","entregada"].includes(d.estado)||typeof d.motivo!=="string"||!d.motivo.trim()||d.motivo.length>1000||d.confirmacion!==d.estado+":"+d.empresa+":"+d.revision)throw Error("Decisión inválida.");
  await lote(a,[]);
  const {confirmacion,...datos}=d;return entrega.decidir(r,datos);
 }
 });
}
