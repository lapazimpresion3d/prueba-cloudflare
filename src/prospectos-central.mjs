import {precioConfirmado} from "./precios-confirmados.mjs";
// Central onboarding adapter. Delegates mutations to verified existing services.
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))),x=>x.toString(16).padStart(2,"0")).join("");
export async function crearProspectosCentral(env,{habilitado=false,autenticarCentral,altas,contratos,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function"||!altas||!contratos)throw Error("Prospectos no configurados.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM central_operadores o JOIN central_sesiones cs ON cs.operador=o.id WHERE o.emisor=? AND o.sujeto=? AND cs.hash=? AND o.activo=1 AND o.rol IN ('administrador','comercial') AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND (?=0 OR cs.creado>?))";
 async function contexto(r,metodo){
  if(habilitado!==true||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Consulta no autorizada.");
  const a=await autenticarCentral(r),c=(r.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("__Host-lapaz-central=")),t=c.length===1?c[0].slice("__Host-lapaz-central=".length):"",n=reloj();
  if(!id(a?.emisor)||!id(a?.sujeto)||!/^[a-f0-9]{64}$/.test(t)||!Number.isSafeInteger(n)||n<0)throw Error("Consulta no autorizada.");
  return {n,args:[a.emisor,a.sujeto,await hash(t),n,n-600000,metodo==="POST"?1:0,n-300000]};
 }
 // Confirmed commercial reference. Legacy v1 remains immutable; only matching published versions can be used for new onboarding here.
 const opciones="SELECT p.id,p.version,p.nombre,p.implementacion,p.mensualidad,p.moneda,p.usuarios,p.sucursales FROM comercial_planes p WHERE (p.version=1 OR EXISTS(SELECT 1 FROM comercial_plan_publicaciones b WHERE b.plan=p.id AND b.version=p.version)) AND "+guard+" ORDER BY p.id,p.version DESC";
 function vigentes(rows){const vistos=new Set();return rows.filter(p=>{if(vistos.has(p.id))return false;vistos.add(p.id);return precioConfirmado(p);});}
 const campos=(d,keys)=>{if(!d||typeof d!=="object"||Array.isArray(d)||Object.keys(d).length!==keys.length||keys.some(k=>!Object.hasOwn(d,k)))throw Error("Datos inválidos.");};
 return Object.freeze({
 async listar(r,{offset=0}={}){
  const a=await contexto(r,"GET");
  if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)throw Error("Paginación inválida.");
  const rs=await db.batch([
   q("SELECT 1 AS autorizado WHERE "+guard,...a.args),
   q("SELECT count(*) AS total FROM comercio_altas_pendientes z JOIN comercio_altas_prospecto v ON v.alta=z.id WHERE "+guard,...a.args),
   q("SELECT z.id,z.nombre,z.sucursal,z.giro,z.plan,z.version,z.estado,z.creado,z.expira,z.empresa,p.mensualidad,p.implementacion,j.id AS invitacion,j.expira AS invitacion_expira,j.consumido,j.cancelado,k.fecha AS contrato_fecha,CASE WHEN z.estado='pendiente' AND z.expira<=? THEN 'vencida' ELSE z.estado END AS efectivo FROM comercio_altas_pendientes z JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercial_planes p ON p.id=z.plan AND p.version=z.version LEFT JOIN comercio_invitaciones_propietario j ON j.alta=z.id LEFT JOIN comercial_contratos_iniciales k ON k.alta=z.id WHERE "+guard+" ORDER BY z.creado DESC,z.id LIMIT 25 OFFSET ?",a.n,...a.args,offset),
   q(opciones,...a.args)
  ]);
  if(rs[0].results?.[0]?.autorizado!==1)throw Error("Consulta no autorizada.");
  return {fecha:a.n,offset,total:rs[1].results[0].total,items:rs[2].results,planes:vigentes(rs[3].results)};
 },
 async ejecutar(r,accion,d){
  const a=await contexto(r,"POST");if(!await q("SELECT 1 AS autorizado WHERE "+guard,...a.args).first())throw Error("Operación no autorizada.");
  if(accion==="preparar"){
   campos(d,["nombre","sucursal","giro","plan","version","prueba"]);
   const rows=(await q(opciones,...a.args).all()).results;
   if(!vigentes(rows).some(p=>p.id===d.plan&&p.version===d.version))throw Error("Plan comercial no disponible.");
   const {prueba,...datos}=d;return altas.prepararProspecto(r,datos,prueba);
  }
  if(accion==="emitir"){campos(d,["alta"]);return altas.emitirInvitacion(r,d.alta);}
  if(accion==="renovar"){campos(d,["alta","invitacion"]);return altas.renovarInvitacion(r,d.alta,d.invitacion);}
  if(accion==="cancelar"){campos(d,["alta","confirmacion"]);if(d.confirmacion!=="CANCELAR:"+d.alta)throw Error("Confirmación requerida.");return altas.cancelarAlta(r,d.alta);}
  if(accion==="contratar"){campos(d,["empresa","alta","plan","version","referencia","confirmacion"]);if(d.confirmacion!=="CONTRATAR:"+d.alta)throw Error("Confirmación requerida.");const {confirmacion,...datos}=d;return contratos.contratar(r,datos);}
  throw Error("Acción no disponible.");
 }
 });
}
