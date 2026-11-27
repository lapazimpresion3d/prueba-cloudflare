import {planes,modulos,limitesPlanes as limites} from "../public/demostraciones/config.mjs";
// Límites provisionales; catálogo de contratación no equivale a disponibilidad de producción.
// La versión contractual 1 conserva sus tarifas; el escaparate tiene precios de lanzamiento.
const mensualidadesV1=Object.freeze({p1:14900,p2:29900,p3:44900,p4:64900});
export const catalogoInicial=Object.freeze(planes.map((p,i)=>Object.freeze({...p,mensualidad:mensualidadesV1[p.id],version:1,usuarios:limites[p.id][0],sucursales:limites[p.id][1],modulos:Object.freeze(modulos.filter(m=>m.desde<=i+1).map(m=>m.id))})));
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
export async function crearGestorSuscripciones(env,{autorizarOperador,autorizarComercial,habilitado=false,reloj=Date.now,modulosOperativos=[]}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarOperador!=="function"||typeof autorizarComercial!=="function")throw Error("Suscripciones no configuradas.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema comercial incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 async function operador(r){if(habilitado!==true||r.method!=="POST"||r.headers.get("Origin")!==new URL(r.url).origin||await autorizarOperador(r)!==true)throw Error("Operación no autorizada.");}
 return Object.freeze({
 async inicializar(r){await operador(r);await db.batch(catalogoInicial.map(p=>q("INSERT INTO comercial_planes VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id,version) DO NOTHING",p.id,p.version,p.nombre,p.implementacion,p.mensualidad,p.moneda,p.usuarios,p.sucursales,JSON.stringify(p.modulos))));},
 async contratar(r,d){
  await operador(r);
  if(!id(d.empresa)||!Object.hasOwn(limites,d.plan)||!Number.isSafeInteger(d.version)||!Number.isSafeInteger(d.revision)||d.revision<0||!["prueba","activa","suspendida","cancelada"].includes(d.estado)||!Number.isSafeInteger(d.inicio)||!Number.isSafeInteger(d.vence)||d.vence<=d.inicio)throw Error("Suscripción inválida.");
  const filtro=" EXISTS(SELECT 1 FROM empresas WHERE id=? AND activa=1) AND EXISTS(SELECT 1 FROM comercial_planes p WHERE p.id=? AND p.version=? AND (SELECT count(*) FROM membresias WHERE empresa=? AND activa=1)<=p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=? AND activa=1)<=p.sucursales)";
  const a=[d.empresa,d.plan,d.version,d.empresa,d.empresa];
  const stmt=d.revision===0?q("INSERT INTO comercial_suscripciones SELECT ?,?,?,?,?,?,1 WHERE "+filtro+" ON CONFLICT(empresa) DO NOTHING RETURNING revision",d.empresa,d.plan,d.version,d.estado,d.inicio,d.vence,...a):q("UPDATE comercial_suscripciones SET plan=?,version=?,estado=?,inicio=?,vence=?,revision=revision+1 WHERE empresa=? AND revision=? AND "+filtro+" RETURNING revision",d.plan,d.version,d.estado,d.inicio,d.vence,d.empresa,d.revision,...a);
  const res=await stmt.first();if(!res)throw Error("Conflicto de revisión, plan o límites.");return res;
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
