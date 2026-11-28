// Internal agreement registration; never creates operational subscriptions or payments.
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
export async function crearContratacionAutorizada(env,{habilitado=false,autenticarCentral,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function")throw Error("Contratación no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="SELECT o.id FROM central_operadores o JOIN central_sesiones s ON s.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND s.hash=? AND o.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>? AND s.creado>?";
 async function central(r){
  if(habilitado!==true||r.method!=="POST"||new URL(r.url).protocol!=="https:"||r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Contratación no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0)throw Error("Contratación no autorizada.");
  return {n,args:[a.emisor,a.sujeto,await hash(t),n,n-600000,n-300000]};
 }
 return Object.freeze({
 async contratar(r,d){
  const {n,args}=await central(r);
  if(!id(d?.empresa)||!id(d.alta)||!["p1","p2","p3","p4"].includes(d.plan)||!Number.isSafeInteger(d.version)||d.version<1||typeof d.referencia!=="string"||!d.referencia.trim()||d.referencia.trim().length>120||Object.keys(d).some(k=>!["empresa","alta","plan","version","referencia"].includes(k)))throw Error("Contrato inválido.");
  const res=await db.batch([
   q("INSERT INTO comercial_contratos_iniciales(empresa,alta,plan,version,operador,fecha,referencia) SELECT e.id,a.id,p.id,p.version,("+guard+"),?,? FROM comercio_altas_pendientes a JOIN comercio_altas_prospecto v ON v.alta=a.id JOIN comercio_invitaciones_propietario j ON j.alta=a.id JOIN empresas e ON e.id=a.empresa JOIN comercial_planes p ON p.id=a.plan AND p.version=a.version JOIN central_implementaciones c ON c.empresa=e.id WHERE e.id=? AND a.id=? AND p.id=? AND p.version=? AND a.estado='aceptada' AND j.consumido IS NOT NULL AND e.activa=1 AND c.estado IN ('pendiente','configuracion','revision') AND (p.version=1 OR EXISTS(SELECT 1 FROM comercial_plan_publicaciones b WHERE b.plan=p.id AND b.version=p.version)) AND EXISTS(SELECT 1 FROM usuarios u JOIN membresias m ON m.usuario=u.id WHERE u.emisor=a.emisor AND u.sujeto=a.sujeto AND u.activo=1 AND m.empresa=e.id AND m.rol='propietario' AND m.alcance='empresa' AND m.activa=1) AND (SELECT count(*) FROM membresias WHERE empresa=e.id AND activa=1)<=p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=e.id AND activa=1)<=p.sucursales AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=e.id) AND NOT EXISTS(SELECT 1 FROM comercial_contratos_iniciales k WHERE k.empresa=e.id) RETURNING empresa,plan,version",...args,n,d.referencia.trim(),d.empresa,d.alta,d.plan,d.version),
   q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,posterior) SELECT k.operador,k.empresa,'contrato.inicial',k.alta,k.fecha,json_object('plan',k.plan,'version',k.version,'implementacion',p.implementacion,'mensualidad',p.mensualidad,'moneda',p.moneda,'usuarios',p.usuarios,'sucursales',p.sucursales,'modulos',json(p.modulos)) FROM comercial_contratos_iniciales k JOIN comercial_planes p ON p.id=k.plan AND p.version=k.version WHERE k.empresa=? AND changes()=1",d.empresa)
  ]);
  if(!res[0].results?.length)throw Error("Contratación no disponible.");
  return {...res[0].results[0],estado:"contratado_pendiente_activacion"};
 }
 });
}
