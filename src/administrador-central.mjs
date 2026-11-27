import {modulos} from "../public/demostraciones/config.mjs";
// Servicio interno, sin rutas públicas. El autenticador debe verificar una identidad central.
export async function crearAdministradorCentral(env,{autenticarCentral,habilitado=false,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticarCentral!=="function")throw Error("Administrador central no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema comercial incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM central_operadores WHERE id=? AND activo=1)";
 const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
 async function actor(r,escritura=false){
  if(habilitado!==true||escritura&&(r.method!=="POST"||r.headers.get("Origin")!==new URL(r.url).origin))throw Error("Operación no autorizada.");
  const i=await autenticarCentral(r);
  if(!id(i?.emisor)||!id(i?.sujeto))throw Error("Identidad central requerida.");
  const a=await q("SELECT id FROM central_operadores WHERE emisor=? AND sujeto=? AND activo=1",i.emisor,i.sujeto).first();
  if(!a)throw Error("Acceso central denegado.");return a.id;
 }
 const log=(a,e,accion,o)=>q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha) SELECT ?,?,?,?,? WHERE changes()=1",a,e,accion,o,reloj());
 async function escribir(stmt,a,e,accion,o){const r=await db.batch([stmt,log(a,e,accion,o)]);if(!r[0].results?.length)throw Error("Conflicto o acceso denegado.");return r[0].results[0];}
 return Object.freeze({
 async autorizarOperador(r){try{await actor(r,true);return true}catch{return false}},
 async directorio(r,{limite=50,offset=0}={}){
  const a=await actor(r);if(!Number.isSafeInteger(limite)||limite<1||limite>100||!Number.isSafeInteger(offset)||offset<0)throw Error("Paginación inválida.");
  return (await q("SELECT e.id,e.nombre,e.activa,s.plan,s.version,s.estado,s.inicio,s.vence,s.revision,i.estado AS implementacion,i.revision AS revision_implementacion FROM empresas e LEFT JOIN comercial_suscripciones s ON s.empresa=e.id LEFT JOIN central_implementaciones i ON i.empresa=e.id WHERE "+guard+" ORDER BY e.nombre,e.id LIMIT ? OFFSET ?",a,limite,offset).all()).results;
 },
 async indicadores(r){
  const a=await actor(r),n=reloj();
  return q("SELECT (SELECT count(*) FROM empresas) AS clientes,(SELECT count(*) FROM comercial_suscripciones s JOIN empresas e ON e.id=s.empresa WHERE e.activa=1 AND s.estado='activa' AND s.inicio<=? AND s.vence>?) AS vigentes,(SELECT COALESCE(sum(p.mensualidad),0) FROM comercial_suscripciones s JOIN empresas e ON e.id=s.empresa JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE e.activa=1 AND s.estado='activa' AND s.inicio<=? AND s.vence>?) AS mrr_centavos,(SELECT COALESCE(sum(importe),0) FROM central_pagos_servicio) AS registrado_centavos WHERE "+guard,n,n,n,n,a).first();
 },
 async versionPlan(r,d){
  const a=await actor(r);if(!["p1","p2","p3","p4"].includes(d.id)||!id(d.nombre)||!Number.isSafeInteger(d.version)||d.version<2||![d.implementacion,d.mensualidad].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=100000000)||![d.usuarios,d.sucursales].every(x=>Number.isSafeInteger(x)&&x>0&&x<=10000)||!Array.isArray(d.modulos)||!d.modulos.every(x=>modulos.some(m=>m.id===x)))throw Error("Plan inválido.");
  return escribir(q("INSERT INTO comercial_planes SELECT ?,?,?,?,?,'MXN',?,?,? WHERE "+guard+" AND ?=(SELECT COALESCE(MAX(version),0)+1 FROM comercial_planes WHERE id=?) RETURNING version",d.id,d.version,d.nombre,d.implementacion,d.mensualidad,d.usuarios,d.sucursales,JSON.stringify([...new Set(d.modulos)]),a,d.version,d.id),a,null,"plan.version",d.id+":"+d.version);
 },
 async implementacion(r,d){
  const a=await actor(r);if(!id(d.empresa)||!["pendiente","configuracion","revision","entregada"].includes(d.estado)||!Number.isSafeInteger(d.revision)||d.revision<0)throw Error("Implementación inválida.");
  const s=d.revision===0?q("INSERT INTO central_implementaciones SELECT ?,?,1 WHERE "+guard+" ON CONFLICT(empresa) DO NOTHING RETURNING revision",d.empresa,d.estado,a):q("UPDATE central_implementaciones SET estado=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+guard+" RETURNING revision",d.estado,d.empresa,d.revision,a);
  return escribir(s,a,d.empresa,"implementacion.estado",d.estado);
 },
 async registrarPago(r,d){
  const a=await actor(r);if(!id(d.id)||!id(d.empresa)||!["implementacion","mensualidad","adicional"].includes(d.concepto)||!Number.isSafeInteger(d.importe)||d.importe<1||d.importe>100000000||typeof d.referencia!=="string"||!d.referencia.trim()||d.referencia.trim().length>120)throw Error("Registro inválido.");
  return escribir(q("INSERT INTO central_pagos_servicio SELECT ?,?,?,?,?,?,? WHERE "+guard+" RETURNING id",d.id,d.empresa,d.concepto,d.importe,reloj(),d.referencia.trim(),a,a),a,d.empresa,"pago.registrado",d.id);
 },
 async pagos(r,empresa){const a=await actor(r);if(!id(empresa))throw Error("Empresa inválida.");return (await q("SELECT id,concepto,importe,fecha,referencia FROM central_pagos_servicio WHERE empresa=? AND "+guard+" ORDER BY fecha DESC,id LIMIT 100",empresa,a).all()).results;}
 });
}
