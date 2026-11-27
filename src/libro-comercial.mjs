import {crearNucleoComercial,permisosGranulares} from "./nucleo-comercial.mjs";
import {hashSesionComercial} from "./sesiones-comerciales.mjs";
// Internal service only. Amounts must come from an authoritative pricing layer, never raw HTTP bodies.
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const op=x=>typeof x==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(x);
const metodos=["efectivo","transferencia","tarjeta_externa"];
const guard=`EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario JOIN empresas e ON e.id=m.empresa JOIN sucursales b ON b.empresa=m.empresa JOIN rol_permisos p ON p.empresa=m.empresa AND p.rol=m.rol
 JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercial_suscripciones sc ON sc.empresa=m.empresa JOIN comercial_planes cp ON cp.id=sc.plan AND cp.version=sc.version
 WHERE m.empresa=? AND b.id=? AND u.id=? AND cs.hash=? AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>?
 AND m.activa=1 AND u.activo=1 AND e.activa=1 AND b.activa=1 AND p.permiso=?
 AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=m.empresa AND d.usuario=m.usuario AND d.permiso IN(p.permiso,?))
 AND (m.alcance='empresa' OR EXISTS(SELECT 1 FROM membresia_sucursales ms WHERE ms.empresa=m.empresa AND ms.usuario=m.usuario AND ms.sucursal=b.id))
 AND sc.estado IN('prueba','activa') AND sc.inicio<=? AND sc.vence>? AND EXISTS(SELECT 1 FROM json_each(cp.modulos) WHERE value='pos')
 AND (SELECT count(*) FROM membresias WHERE empresa=m.empresa AND activa=1)<=cp.usuarios
 AND (SELECT count(*) FROM sucursales WHERE empresa=m.empresa AND activa=1)<=cp.sucursales)`;
export async function crearLibroComercial(env,{autenticar,habilitado=false,reloj=Date.now}={}){
 const db=env.COMMERCE_DB,nucleo=await crearNucleoComercial(env,{autenticar});
 const q=(sql,...args)=>db.prepare(sql).bind(...args);
 async function contexto(r,d,permiso,metodo){
  if(habilitado!==true||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin||!id(d?.empresa)||!id(d?.sucursal))throw Error("Operación no permitida.");
  const hash=await hashSesionComercial(r);if(!hash)throw Error("Sesión requerida.");
  const a=await nucleo.autorizar(r,{empresa:d.empresa,sucursal:d.sucursal,permiso});
  const n=reloj();return {a,n,args:[d.empresa,d.sucursal,a.actor,hash,n,n-1800000,permisosGranulares[permiso],permiso,n,n]};
 }
 async function guardar(r,d,tipo){
  if(!op(d?.id)||tipo==="venta"&&(!Number.isSafeInteger(d.importe)||d.importe<1||d.importe>100000000||!metodos.includes(d.metodo))||tipo==="reversion"&&!op(d.original))throw Error("Movimiento inválido.");
  const {a,n,args}=await contexto(r,d,tipo==="venta"?"pos.crear":"pos.cancelar","POST");
  const stmt=tipo==="venta"?q("INSERT INTO comercio_movimientos_financieros SELECT ?,?,?,?,?,'venta',?,?,NULL WHERE "+guard+" ON CONFLICT DO NOTHING RETURNING *",d.empresa,d.sucursal,d.id,a.actor,n,d.importe,d.metodo,...args):
   q("INSERT INTO comercio_movimientos_financieros SELECT p.empresa,p.sucursal,?,?,?,'reversion',p.importe,p.metodo,p.id FROM comercio_movimientos_financieros p WHERE p.empresa=? AND p.sucursal=? AND p.id=? AND p.tipo='venta' AND "+guard+" ON CONFLICT DO NOTHING RETURNING *",d.id,a.actor,n,d.empresa,d.sucursal,d.original,...args);
  const nuevo=await stmt.first();if(nuevo)return {movimiento:nuevo,repetido:false};
  const previo=await q("SELECT * FROM comercio_movimientos_financieros WHERE empresa=? AND sucursal=? AND id=? AND actor=? AND tipo=? AND "+guard,d.empresa,d.sucursal,d.id,a.actor,tipo,...args).first();
  if(!previo||tipo==="venta"&&(previo.importe!==d.importe||previo.metodo!==d.metodo)||tipo==="reversion"&&previo.original!==d.original)throw Error("Conflicto o acceso denegado.");
  return {movimiento:previo,repetido:true};
 }
 return Object.freeze({
  registrarVenta:(r,d)=>guardar(r,d,"venta"),
  revertirVenta:(r,d)=>guardar(r,d,"reversion"),
  async consultar(r,d){const {args}=await contexto(r,d,"pos.consultar","GET");const limite=d.limite??50,offset=d.offset??0;if(!Number.isSafeInteger(limite)||limite<1||limite>100||!Number.isSafeInteger(offset)||offset<0)throw Error("Paginación inválida.");
   if(!await q("SELECT 1 AS ok WHERE "+guard,...args).first())throw Error("Acceso denegado.");
   return (await q("SELECT * FROM comercio_movimientos_financieros WHERE empresa=? AND sucursal=? AND "+guard+" ORDER BY fecha DESC,id DESC LIMIT ? OFFSET ?",d.empresa,d.sucursal,...args,limite,offset).all()).results;
  },
  async resumen(r,d){const {args}=await contexto(r,d,"pos.consultar","GET");const row=await q("SELECT COALESCE(sum(CASE WHEN tipo='venta' THEN importe ELSE -importe END),0) AS neto,COALESCE(sum(CASE WHEN tipo='venta' THEN importe ELSE 0 END),0) AS bruto,COALESCE(sum(CASE WHEN tipo='reversion' THEN importe ELSE 0 END),0) AS reversado FROM comercio_movimientos_financieros WHERE empresa=? AND sucursal=? HAVING "+guard,d.empresa,d.sucursal,...args).first();if(!row)throw Error("Acceso denegado.");return row;}
 });
}
