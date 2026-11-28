// Administrative lifecycle adapter: no billing, renewal or automatic transition.
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
export function validarDecisionCiclo(d){
 if(!d||typeof d!=="object"||Array.isArray(d)||Object.keys(d).length!==5||!id(d.empresa)||!Number.isSafeInteger(d.revision)||d.revision<1||!["suspender","reactivar","cancelar"].includes(d.accion)||typeof d.motivo!=="string"||!d.motivo.trim()||d.motivo.length>1000||d.confirmacion!==d.accion.toUpperCase()+":"+d.empresa+":"+d.revision)throw Error("Decisión inválida.");
 const {accion,confirmacion,...datos}=d;return {accion,datos:accion==="cancelar"?{...datos,confirmacion}:datos};
}
export async function crearCicloCentral(env,{habilitado=false,autenticarCentral,ciclo,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function"||!["consultar","historial","suspender","reactivar","cancelar"].every(k=>typeof ciclo?.[k]==="function"))throw Error("Ciclo central no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM central_operadores o JOIN central_sesiones cs ON cs.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND cs.hash=? AND o.activo=1 AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND (?=0 OR cs.creado>?))";
 async function contexto(r,m){
  if(habilitado!==true||r.method!==m||new URL(r.url).protocol!=="https:"||m==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Operación no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0||n>Number.MAX_SAFE_INTEGER-2592000000)throw Error("Operación no autorizada.");
  return {n,args:[a.emisor,a.sujeto,await hash(t),n,n-600000,m==="POST"?1:0,n-300000]};
 }
 async function lote(a,stm){const rs=await db.batch([q("SELECT 1 AS autorizado WHERE "+guard,...a.args),...stm]);if(rs[0].results?.[0]?.autorizado!==1)throw Error("Operación no autorizada.");return rs.slice(1).map(x=>x.results);}
 const base=" FROM empresas e JOIN comercial_contratos_iniciales k ON k.empresa=e.id LEFT JOIN comercial_suscripciones s ON s.empresa=e.id LEFT JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version";
 const efectivo="CASE WHEN s.empresa IS NULL THEN 'sin_contratar' WHEN s.estado IN ('suspendida','cancelada') THEN s.estado WHEN s.inicio>? THEN 'programada' WHEN s.vence<=? THEN 'vencida' ELSE s.estado END";
 return Object.freeze({
 async listar(r,{offset=0,estado="",buscar="",vencePronto=false}={}){
  const a=await contexto(r,"GET");
  if(!Number.isSafeInteger(offset)||offset<0||offset>1000000||!["","sin_contratar","programada","vencida","prueba","activa","suspendida","cancelada"].includes(estado)||typeof buscar!=="string"||buscar.length>120||typeof vencePronto!=="boolean")throw Error("Consulta inválida.");
  const sql="SELECT e.id AS empresa,e.nombre,e.activa,s.plan,s.version,s.estado,s.inicio,s.vence,s.revision,p.mensualidad,"+efectivo+" AS estado_efectivo"+base+" WHERE "+guard+" AND (?='' OR instr(lower(e.nombre),lower(?))>0) AND (?=0 OR (e.activa=1 AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>? AND s.vence<=?))";
  const b=buscar.trim(),args=[a.n,a.n,...a.args,b,b,vencePronto?1:0,a.n,a.n,a.n+2592000000,estado,estado];
  const [total,items]=await lote(a,[q("SELECT count(*) AS total FROM ("+sql+") WHERE (?='' OR estado_efectivo=?)",...args),q("SELECT * FROM ("+sql+") WHERE (?='' OR estado_efectivo=?) ORDER BY nombre COLLATE NOCASE,empresa LIMIT 25 OFFSET ?",...args,offset)]);
  return {fecha:a.n,offset,total:total[0].total,items,pagos:{estado:"no_integrado"}};
 },
 async detalle(r,{empresa,antes=null}={}){
  const a=await contexto(r,"GET");if(!id(empresa)||antes!==null&&(!Number.isSafeInteger(antes)||antes<2))throw Error("Consulta inválida.");
  const [ficha]=await lote(a,[q("SELECT e.id,e.nombre,e.activa,k.plan AS plan_inicial,k.version AS version_inicial,s.plan,s.version,s.inicio,s.vence,s.estado,s.revision,p.mensualidad,p.usuarios,p.sucursales,(SELECT count(*) FROM membresias WHERE empresa=e.id AND activa=1) AS usuarios_activos,(SELECT count(*) FROM sucursales WHERE empresa=e.id AND activa=1) AS sucursales_activas FROM empresas e JOIN comercial_contratos_iniciales k ON k.empresa=e.id LEFT JOIN comercial_suscripciones s ON s.empresa=e.id LEFT JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE e.id=? AND "+guard,empresa,...a.args)]);
  if(ficha.length!==1)throw Error("Comercio no disponible.");
  const actual=await ciclo.consultar(r,{empresa}),historial=await ciclo.historial(r,{empresa,antes});
  // Read snapshots may differ; all mutations use the lifecycle service's live CAS and guards.
  const f=ficha[0],requisitos={empresa_habilitada:f.activa===1,vigencia:f.inicio!==null&&f.inicio<=a.n&&a.n<f.vence,cupo_usuarios:f.usuarios!==null&&f.usuarios_activos<=f.usuarios,cupo_sucursales:f.sucursales!==null&&f.sucursales_activas<=f.sucursales,reactivacion_autorizable:actual.acciones_disponibles.includes("reactivar")};
  return {fecha:a.n,ficha:f,actual,requisitos,historial,antes_siguiente:historial.length===50&&historial.at(-1).revision>1?historial.at(-1).revision:null,pagos:{estado:"no_integrado"},restricciones:["Sin renovación ni cobro automático","Cancelación definitiva del contrato actual","La reactivación exige propietario habilitado y módulos compatibles y operativos","Las sesiones invalidadas no se restauran"]};
 },
 async decidir(r,d){
  const a=await contexto(r,"POST"),{accion,datos}=validarDecisionCiclo(d);await lote(a,[]);return ciclo[accion](r,datos);
 }
 });
}
