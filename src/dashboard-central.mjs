// Read-only snapshot of existing commercial records. No financial ledger duplication.
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
const DIA=86400000;
export async function crearDashboardCentral(env,{habilitado=false,autenticarCentral,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function")throw Error("Dashboard no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const guard="EXISTS(SELECT 1 FROM central_operadores o JOIN central_sesiones cs ON cs.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND cs.hash=? AND o.activo=1 AND o.rol IN ('administrador','comercial','consulta') AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>?)";
 const q=(sql,...args)=>db.prepare(sql).bind(...args);
 return Object.freeze({async consultar(r){
  if(habilitado!==true||r.method!=="GET"||new URL(r.url).protocol!=="https:")throw Error("Consulta no autorizada.");
  const a=await autenticarCentral(r),cookies=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=cookies.length===1?cookies[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0||n>Number.MAX_SAFE_INTEGER-30*DIA)throw Error("Consulta no autorizada.");
  const args=[a.emisor,a.sujeto,await hash(t),n,n-600000];
  // Each query rechecks the same live central session. Batch is one consistent read transaction.
  const estado="CASE WHEN s.empresa IS NULL THEN 'sin_contratar' WHEN s.estado IN ('suspendida','cancelada') THEN s.estado WHEN s.inicio>? THEN 'programada' WHEN s.vence<=? THEN 'vencida' ELSE s.estado END";
  const base=" FROM empresas e LEFT JOIN comercial_suscripciones s ON s.empresa=e.id LEFT JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version";
  const rs=await db.batch([
   q("SELECT 1 AS autorizado WHERE "+guard,...args),
   q("SELECT "+estado+" AS estado,e.activa,count(*) AS total"+base+" WHERE "+guard+" GROUP BY 1,2",n,n,...args),
   q("SELECT s.plan,s.version,p.nombre,count(*) AS total"+base+" WHERE s.empresa IS NOT NULL AND "+guard+" GROUP BY s.plan,s.version,p.nombre ORDER BY s.plan,s.version",...args),
   q("SELECT count(*) AS total,COALESCE(sum(p.mensualidad),0) AS centavos"+base+" WHERE e.activa=1 AND s.estado='activa' AND s.inicio<=? AND s.vence>? AND "+guard,n,n,...args),
   q("SELECT count(*) AS total"+base+" WHERE e.activa=1 AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>? AND s.vence<=? AND "+guard,n,n,n+30*DIA,...args),
   q("SELECT e.id,e.nombre,s.plan,s.estado,s.vence"+base+" WHERE e.activa=1 AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>? AND s.vence<=? AND "+guard+" ORDER BY s.vence,e.id LIMIT 20",n,n,n+30*DIA,...args),
   q("SELECT CASE WHEN a.estado='pendiente' AND a.expira<=? THEN 'vencida' ELSE a.estado END AS estado,count(*) AS total FROM comercio_altas_pendientes a JOIN comercio_altas_prospecto v ON v.alta=a.id WHERE "+guard+" GROUP BY 1",n,...args),
   q("SELECT i.estado,count(*) AS total FROM central_implementaciones i WHERE "+guard+" GROUP BY i.estado",...args),
   q("SELECT r.estado,count(*) AS total FROM central_entrega_revisiones r WHERE r.revision=(SELECT MAX(v.revision) FROM central_entrega_revisiones v WHERE v.empresa=r.empresa) AND "+guard+" GROUP BY r.estado",...args),
   q("SELECT id,empresa,accion,fecha FROM central_auditoria WHERE "+guard+" ORDER BY fecha DESC,id DESC LIMIT 20",...args)
  ]);
  if(rs[0].results?.[0]?.autorizado!==1)throw Error("Consulta no autorizada.");
  const [_,estados,planes,mrr,vencimientos,lista,altas,implementaciones,entregas,actividad]=rs.map(x=>x.results);
  const totales=Object.fromEntries(["sin_contratar","programada","vencida","prueba","activa","suspendida","cancelada"].map(k=>[k,0]));
  for(const x of estados)totales[x.estado]+=x.total;
  return {fecha:n,comercios:estados.reduce((a,b)=>a+b.total,0),empresas_deshabilitadas:estados.filter(x=>x.activa===0).reduce((a,b)=>a+b.total,0),estados:totales,planes,mrr_centavos:mrr[0].centavos,mrr_contratos:mrr[0].total,vencimientos_total:vencimientos[0].total,vencimientos:lista,altas,implementaciones,entregas,actividad,pagos:{estado:"no_integrado",fuente:"administracion_principal",centavos:null}};
 }});
}
