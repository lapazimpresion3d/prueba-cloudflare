import {planes,modulos,limitesPlanes as limites} from "../public/demostraciones/config.mjs";
// Límites provisionales; catálogo de contratación no equivale a disponibilidad de producción.
// La versión contractual 1 conserva sus tarifas; el escaparate tiene precios de lanzamiento.
const mensualidadesV1=Object.freeze({p1:14900,p2:29900,p3:44900,p4:64900});
export const catalogoInicial=Object.freeze(planes.map((p,i)=>Object.freeze({...p,mensualidad:mensualidadesV1[p.id],version:1,usuarios:limites[p.id][0],sucursales:limites[p.id][1],modulos:Object.freeze(modulos.filter(m=>m.desde<=i+1).map(m=>m.id))})));
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
export async function crearGestorSuscripciones(env,{identificarOperador,autorizarComercial,habilitado=false,reloj=Date.now,modulosOperativos=[]}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof identificarOperador!=="function"||typeof autorizarComercial!=="function")throw Error("Suscripciones no configuradas.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema comercial incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM central_operadores WHERE id=? AND activo=1)";
 async function operador(r){if(habilitado!==true||r.method!=="POST"||r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Operación no autorizada.");const a=await identificarOperador(r);if(!id(a)||!(await q("SELECT id FROM central_operadores WHERE id=? AND activo=1",a).first()))throw Error("Operación no autorizada.");return a;}
 return Object.freeze({
 async inicializar(r){const actor=await operador(r);const stm=[];for(const p of catalogoInicial){stm.push(q("INSERT INTO comercial_planes SELECT ?,?,?,?,?,?,?,?,? WHERE "+guard+" ON CONFLICT(id,version) DO NOTHING",p.id,p.version,p.nombre,p.implementacion,p.mensualidad,p.moneda,p.usuarios,p.sucursales,JSON.stringify(p.modulos),actor),q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,posterior) SELECT ?,NULL,'plan.inicial',?,?,(SELECT json_object('version',version,'implementacion',implementacion,'mensualidad',mensualidad,'moneda',moneda,'usuarios',usuarios,'sucursales',sucursales,'modulos',json(modulos)) FROM comercial_planes WHERE id=? AND version=?) WHERE changes()=1",actor,p.id+":"+p.version,reloj(),p.id,p.version));}await db.batch(stm);},
 async contratar(r,d){
  const actor=await operador(r);
  if(!id(d.empresa)||!Object.hasOwn(limites,d.plan)||!Number.isSafeInteger(d.version)||!Number.isSafeInteger(d.revision)||d.revision<0||!["prueba","activa","suspendida","cancelada"].includes(d.estado)||!Number.isSafeInteger(d.inicio)||!Number.isSafeInteger(d.vence)||d.vence<=d.inicio)throw Error("Suscripción inválida.");
  const filtro=guard+" AND EXISTS(SELECT 1 FROM empresas WHERE id=? AND activa=1) AND EXISTS(SELECT 1 FROM comercial_planes p WHERE p.id=? AND p.version=? AND (SELECT count(*) FROM membresias WHERE empresa=? AND activa=1)<=p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=? AND activa=1)<=p.sucursales)";
  const a=[actor,d.empresa,d.plan,d.version,d.empresa,d.empresa];
  const stmt=d.revision===0?q("INSERT INTO comercial_suscripciones SELECT ?,?,?,?,?,?,1 WHERE "+filtro+" ON CONFLICT(empresa) DO NOTHING RETURNING revision",d.empresa,d.plan,d.version,d.estado,d.inicio,d.vence,...a):q("UPDATE comercial_suscripciones SET plan=?,version=?,estado=?,inicio=?,vence=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+filtro+" RETURNING revision",d.plan,d.version,d.estado,d.inicio,d.vence,d.empresa,d.revision,...a);
  const estado="SELECT json_object('plan',plan,'version',version,'estado',estado,'inicio',inicio,'vence',vence,'revision',revision) FROM comercial_suscripcion_historial WHERE empresa=? AND revision=?";
  const log=q("INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,anterior,posterior) SELECT ?,?,'suscripcion.cambio',?,?,("+estado+"),("+estado+") WHERE changes()=1",actor,d.empresa,d.empresa,reloj(),d.empresa,d.revision,d.empresa,d.revision+1);
  const res=await db.batch([stmt,log]);if(!res[0].results?.length)throw Error("Conflicto de revisión, plan o límites.");return res[0].results[0];
 },
 async consultar(r,empresa,sucursal=null){
  await autorizarComercial(r,{empresa,...(sucursal===null?{}:{sucursal}),permiso:"empresa.ver"});
  const s=await q("SELECT s.*,p.nombre,p.implementacion,p.mensualidad,p.moneda,p.usuarios,p.sucursales,p.modulos FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE s.empresa=?",empresa).first();
  if(!s)return {estado:"sin_contratar",vigente:false,modulos:[]};
  const n=reloj();return {...s,vigente:["prueba","activa"].includes(s.estado)&&s.inicio<=n&&s.vence>n,modulos:JSON.parse(s.modulos)};
 },
 async autorizarModulo(r,{empresa,sucursal=null,permiso,modulo}){
  // El permiso y módulo deben ser constantes de la ruta, nunca elegidos por el cliente.
  const acceso=await autorizarComercial(r,{empresa,sucursal,permiso});
  const n=reloj();
  const s=await q("SELECT 1 AS ok FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version JOIN json_each(p.modulos) m WHERE s.empresa=? AND s.estado IN ('prueba','activa') AND s.inicio<=? AND s.vence>? AND m.value=? AND (SELECT count(*) FROM membresias WHERE empresa=s.empresa AND activa=1)<=p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=s.empresa AND activa=1)<=p.sucursales",empresa,n,n,modulo).first();
  if(!s||!modulosOperativos.includes(modulo))throw Error("Módulo no disponible.");return acceso;
 }
 });
}
