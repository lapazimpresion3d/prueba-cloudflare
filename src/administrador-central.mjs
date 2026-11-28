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
  if(habilitado!==true||new URL(r.url).protocol!=="https:"||escritura&&(r.method!=="POST"||r.headers.get("Origin")!==new URL(r.url).origin))throw Error("Operación no autorizada.");
  const i=await autenticarCentral(r);
  if(!id(i?.emisor)||!id(i?.sujeto))throw Error("Identidad central requerida.");
  const a=await q("SELECT id FROM central_operadores WHERE emisor=? AND sujeto=? AND activo=1",i.emisor,i.sujeto).first();
  if(!a)throw Error("Acceso central denegado.");return a.id;
 }
 const log=(a,e,accion,o,anterior,posterior)=>q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,anterior,posterior) SELECT ?,?,?,?,?,("+anterior.sql+"),("+posterior.sql+") WHERE changes()=1",a,e,accion,o,reloj(),...anterior.args,...posterior.args);
 async function escribir(stmt,a,e,accion,o,anterior,posterior){const r=await db.batch([stmt,log(a,e,accion,o,anterior,posterior)]);if(!r[0].results?.length)throw Error("Conflicto o acceso denegado.");return r[0].results[0];}
 const plan=(id,version)=>({sql:"SELECT json_object('version',version,'implementacion',implementacion,'mensualidad',mensualidad,'moneda',moneda,'usuarios',usuarios,'sucursales',sucursales,'modulos',json(modulos)) FROM comercial_planes WHERE id=? AND version=?",args:[id,version]});
 const implementacion=(empresa,revision)=>({sql:"SELECT json_object('estado',estado,'revision',revision) FROM central_implementacion_historial WHERE empresa=? AND revision=?",args:[empresa,revision]});

 return Object.freeze({
 async autorizarOperador(r){try{await actor(r,true);return true}catch{return false}},
 async identificarOperador(r){return actor(r,true);},
 async auditoria(r,{empresa=null,limite=50,offset=0}={}){if(r.method!=="GET"||(empresa!==null&&!id(empresa))||!Number.isSafeInteger(limite)||limite<1||limite>100||!Number.isSafeInteger(offset)||offset<0)throw Error("Consulta inválida.");const a=await actor(r);return (await q("SELECT id,actor,empresa,accion,objetivo,fecha,anterior,posterior FROM central_auditoria WHERE "+guard+" AND (? IS NULL OR empresa=?) ORDER BY fecha DESC,id DESC LIMIT ? OFFSET ?",a,empresa,empresa,limite,offset).all()).results;},
 async directorio(r,{limite=50,offset=0}={}){
  const a=await actor(r);if(!Number.isSafeInteger(limite)||limite<1||limite>100||!Number.isSafeInteger(offset)||offset<0)throw Error("Paginación inválida.");
  return (await q("SELECT e.id,e.nombre,e.activa,s.plan,s.version,s.estado,s.inicio,s.vence,s.revision,i.estado AS implementacion,i.revision AS revision_implementacion FROM empresas e LEFT JOIN comercial_suscripciones s ON s.empresa=e.id LEFT JOIN central_implementaciones i ON i.empresa=e.id WHERE "+guard+" ORDER BY e.nombre,e.id LIMIT ? OFFSET ?",a,limite,offset).all()).results;
 },
 async indicadores(r){
  const a=await actor(r),n=reloj();
  return q("SELECT (SELECT count(*) FROM empresas) AS clientes,(SELECT count(*) FROM comercial_suscripciones s JOIN empresas e ON e.id=s.empresa WHERE e.activa=1 AND s.estado='activa' AND s.inicio<=? AND s.vence>?) AS vigentes,(SELECT COALESCE(sum(p.mensualidad),0) FROM comercial_suscripciones s JOIN empresas e ON e.id=s.empresa JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE e.activa=1 AND s.estado='activa' AND s.inicio<=? AND s.vence>?) AS mrr_centavos,(SELECT COALESCE(sum(importe),0) FROM central_pagos_servicio p WHERE NOT EXISTS(SELECT 1 FROM central_anulaciones_pago a WHERE a.pago=p.id)) AS registrado_centavos WHERE "+guard,n,n,n,n,a).first();
 },
 async versionPlan(r,d){
  const a=await actor(r,true);if(!["p1","p2","p3","p4"].includes(d.id)||!id(d.nombre)||!Number.isSafeInteger(d.version)||d.version<2||![d.implementacion,d.mensualidad].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=100000000)||![d.usuarios,d.sucursales].every(x=>Number.isSafeInteger(x)&&x>0&&x<=10000)||!Array.isArray(d.modulos)||!d.modulos.every(x=>modulos.some(m=>m.id===x)))throw Error("Plan inválido.");
  return escribir(q("INSERT INTO comercial_planes SELECT ?,?,?,?,?,'MXN',?,?,? WHERE "+guard+" AND ?=(SELECT COALESCE(MAX(version),0)+1 FROM comercial_planes WHERE id=?) RETURNING version",d.id,d.version,d.nombre,d.implementacion,d.mensualidad,d.usuarios,d.sucursales,JSON.stringify([...new Set(d.modulos)]),a,d.version,d.id),a,null,"plan.version",d.id+":"+d.version,plan(d.id,d.version-1),plan(d.id,d.version));
 },
 async implementacion(r,d){
  const a=await actor(r,true);if(!id(d.empresa)||!["pendiente","configuracion","revision"].includes(d.estado)||!Number.isSafeInteger(d.revision)||d.revision<0)throw Error("Implementación inválida.");
  const s=d.revision===0?q("INSERT INTO central_implementaciones SELECT ?,?,1 WHERE "+guard+" ON CONFLICT(empresa) DO NOTHING RETURNING revision",d.empresa,d.estado,a):q("UPDATE central_implementaciones SET estado=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+guard+" RETURNING revision",d.estado,d.empresa,d.revision,a);
  return escribir(s,a,d.empresa,"implementacion.estado",d.empresa,implementacion(d.empresa,d.revision),implementacion(d.empresa,d.revision+1));
 },
 async registrarPago(r,d){
  const a=await actor(r,true);if(!id(d.id)||!id(d.empresa)||!["implementacion","mensualidad","adicional"].includes(d.concepto)||!Number.isSafeInteger(d.importe)||d.importe<1||d.importe>100000000||typeof d.referencia!=="string"||!d.referencia.trim()||d.referencia.trim().length>120)throw Error("Registro inválido.");
  const referencia=d.referencia.trim();
  const stmt=q("INSERT INTO central_pagos_servicio SELECT ?,?,?,?,?,?,? WHERE "+guard+" ON CONFLICT DO NOTHING RETURNING id",d.id,d.empresa,d.concepto,d.importe,reloj(),referencia,a,a);
  const res=await db.batch([stmt,log(a,d.empresa,"pago.registrado",d.id,{sql:"SELECT NULL",args:[]},{sql:"SELECT json_object('concepto',concepto,'importe',importe) FROM central_pagos_servicio WHERE id=? AND empresa=?",args:[d.id,d.empresa]})]);
  if(res[0].results?.length)return {...res[0].results[0],repetido:false};
  const previo=await q("SELECT id FROM central_pagos_servicio WHERE id=? AND empresa=? AND concepto=? AND importe=? AND referencia=? AND "+guard,d.id,d.empresa,d.concepto,d.importe,referencia,a).first();
  if(!previo)throw Error("Conflicto de identificador, referencia o autorización.");
  return {...previo,repetido:true};
 },
 async anularPago(r,d){
  const a=await actor(r,true);if(!id(d.id)||!id(d.empresa)||!id(d.pago)||!["importe_incorrecto","concepto_incorrecto","registro_duplicado","referencia_incorrecta"].includes(d.motivo))throw Error("Anulación inválida.");
  const stmt=q("INSERT INTO central_anulaciones_pago(id,pago,actor,fecha,motivo) SELECT ?,p.id,?,?,? FROM central_pagos_servicio p WHERE p.id=? AND p.empresa=? AND "+guard+" ON CONFLICT DO NOTHING RETURNING id",d.id,a,reloj(),d.motivo,d.pago,d.empresa,a);
  const estado=(anulado)=>({sql:"SELECT json_object('pago',id,'importe',importe,'concepto',concepto,'anulado',"+anulado+") FROM central_pagos_servicio WHERE id=? AND empresa=?",args:[d.pago,d.empresa]});
  const res=await db.batch([stmt,log(a,d.empresa,"pago.anulado",d.id,estado(0),{sql:"SELECT json_object('pago',p.id,'importe',p.importe,'concepto',p.concepto,'anulado',1,'motivo',x.motivo) FROM central_pagos_servicio p JOIN central_anulaciones_pago x ON x.pago=p.id WHERE x.id=? AND p.empresa=?",args:[d.id,d.empresa]})]);
  if(res[0].results?.length)return {...res[0].results[0],repetido:false};
  const previo=await q("SELECT x.id FROM central_anulaciones_pago x JOIN central_pagos_servicio p ON p.id=x.pago WHERE x.id=? AND x.pago=? AND p.empresa=? AND x.motivo=? AND "+guard,d.id,d.pago,d.empresa,d.motivo,a).first();
  if(!previo)throw Error("Conflicto de anulación o autorización.");
  return {...previo,repetido:true};
 },
 async pagos(r,empresa){const a=await actor(r);if(!id(empresa))throw Error("Empresa inválida.");return (await q("SELECT p.id,p.concepto,p.importe,p.fecha,p.referencia,CASE WHEN x.id IS NULL THEN 0 ELSE 1 END AS anulado,x.id AS anulacion FROM central_pagos_servicio p LEFT JOIN central_anulaciones_pago x ON x.pago=p.id WHERE p.empresa=? AND "+guard+" ORDER BY p.fecha DESC,p.id LIMIT 100",empresa,a).all()).results;}
 });
}
