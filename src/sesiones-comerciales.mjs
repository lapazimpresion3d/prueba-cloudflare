// Exclusivamente servidor. verificarIdentidad debe validar criptográficamente el login externo.
const COOKIE="__Host-lapaz-comercial";
const DURACION=8*60*60*1000, INACTIVIDAD=30*60*1000;
export const MAX_SESIONES_COMERCIALES=5;
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
const hash=async t=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))));
const cookie=(t,edad)=>COOKIE+"="+t+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age="+edad;
function extraer(request){
 const a=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+"="));
 if(a.length!==1)return null;
 const t=a[0].slice(COOKIE.length+1);return /^[a-f0-9]{64}$/.test(t)?t:null;
}
// Internal proof for SQL revalidation; never expose the hash in HTTP responses.
export async function hashSesionComercial(request){const t=extraer(request);return t?hash(t):null;}
export async function crearSesionesComerciales(env,{verificarIdentidad,habilitado=false,reloj=Date.now,exigirMembresia=false}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof verificarIdentidad!=="function")throw Error("Sesiones comerciales no configuradas.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema comercial incorrecto.");
 const q=(sql,...args)=>db.prepare(sql).bind(...args).first();
 const exigir=()=>{if(habilitado!==true)throw Error("Sesiones comerciales deshabilitadas.");};
 const escritura=request=>{exigir();if(request.method!=="POST"||request.headers.get("Origin")!==new URL(request.url).origin||new URL(request.url).protocol!=="https:")throw Error("Origen no permitido.");};
 const vigencia="revocado IS NULL AND expira>? AND ultima>?";
 async function sesionActual(request){if(habilitado!==true||new URL(request.url).protocol!=="https:")return null;const t=extraer(request);if(!t)return null;const h=await hash(t),n=reloj();return {h,n};}
 async function autenticar(request){
  const actual=await sesionActual(request);if(!actual)return null;
  const {h,n}=actual;
  const r=await q("UPDATE comercio_sesiones SET ultima=MAX(ultima,?) WHERE hash=? AND revocado IS NULL AND expira>? AND ultima>? AND EXISTS(SELECT 1 FROM usuarios WHERE id=comercio_sesiones.usuario AND activo=1) RETURNING usuario",n,h,n,n-INACTIVIDAD);
  if(!r)return null;
  const u=await q("SELECT u.id,u.emisor,u.sujeto FROM usuarios u JOIN comercio_sesiones s ON s.usuario=u.id WHERE u.id=? AND u.activo=1 AND s.hash=? AND s.revocado IS NULL AND s.expira>? AND s.ultima>?",r.usuario,h,n,n-INACTIVIDAD);
  return u?{actor:u.id,emisor:u.emisor,sujeto:u.sujeto}:null;
 }
 return Object.freeze({
 async iniciar(request){
  escritura(request);
  const i=await verificarIdentidad(request);
  if(!i||i.emailVerified!==true||typeof i.emisor!=="string"||!i.emisor||i.emisor.length>128||typeof i.sujeto!=="string"||!i.sujeto||i.sujeto.length>128)throw Error("Identidad comercial no verificada.");
  const token=hex(crypto.getRandomValues(new Uint8Array(32))),h=await hash(token),n=reloj();
  // Single SQL statement: the cap is checked against active sessions in the same write.
  const r=await q("INSERT INTO comercio_sesiones(hash,usuario,creado,expira,ultima,identificador) SELECT ?,id,?,?,?,? FROM usuarios WHERE emisor=? AND sujeto=? AND activo=1 AND (?=0 OR EXISTS(SELECT 1 FROM membresias m JOIN empresas e ON e.id=m.empresa WHERE m.usuario=usuarios.id AND m.activa=1 AND e.activa=1 AND (m.alcance='empresa' OR EXISTS(SELECT 1 FROM membresia_sucursales ms JOIN sucursales b ON b.empresa=ms.empresa AND b.id=ms.sucursal AND b.activa=1 WHERE ms.empresa=m.empresa AND ms.usuario=m.usuario)))) AND (SELECT count(*) FROM comercio_sesiones WHERE usuario=usuarios.id AND "+vigencia+")<? RETURNING usuario",h,n,n+DURACION,n,crypto.randomUUID(),i.emisor,i.sujeto,exigirMembresia===true?1:0,n,n-INACTIVIDAD,MAX_SESIONES_COMERCIALES);
  if(!r)throw Error("No se pudo iniciar sesión comercial.");
  return {cookie:cookie(token,DURACION/1000),expira:n+DURACION};
 },
 autenticar,
 async cerrar(request){
  escritura(request);
  const t=extraer(request);if(t)await q("UPDATE comercio_sesiones SET revocado=? WHERE hash=? AND revocado IS NULL RETURNING usuario",reloj(),await hash(t));
  return {cookie:cookie("",0)};
 },
 async listar(request){
  exigir();if(request.method!=="GET")throw Error("Consulta no permitida.");
  const actual=await sesionActual(request);if(!actual)throw Error("Autenticación requerida.");
  const {h,n}=actual;
  const u=await autenticar(request);if(!u)throw Error("Autenticación requerida.");
  return (await db.prepare("SELECT identificador,creado,expira,ultima,CASE WHEN hash=? THEN 1 ELSE 0 END AS actual FROM comercio_sesiones WHERE usuario=? AND "+vigencia+" AND EXISTS(SELECT 1 FROM comercio_sesiones s JOIN usuarios u ON u.id=s.usuario WHERE s.hash=? AND s.usuario=? AND u.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>?) ORDER BY creado DESC,identificador").bind(h,u.actor,n,n-INACTIVIDAD,h,u.actor,n,n-INACTIVIDAD).all()).results;
 },
 async revocarOtra(request,identificador){
  escritura(request);if(typeof identificador!=="string"||!/^[a-f0-9-]{36}$/.test(identificador))throw Error("Sesión inválida.");
  const actual=await sesionActual(request);if(!actual)throw Error("Autenticación requerida.");
  const {h,n}=actual;
  const r=await q("UPDATE comercio_sesiones SET revocado=? WHERE identificador=? AND hash<>? AND revocado IS NULL AND EXISTS(SELECT 1 FROM comercio_sesiones s JOIN usuarios u ON u.id=s.usuario WHERE s.hash=? AND s.usuario=comercio_sesiones.usuario AND u.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>?) RETURNING identificador",n,identificador,h,h,n,n-INACTIVIDAD);
  if(!r)throw Error("Sesión no disponible.");return {revocada:true};
 },
 async revocarTodas(request){
  escritura(request);
  const actual=await sesionActual(request);if(!actual)throw Error("Autenticación requerida.");
  const {h,n}=actual;
  // Validate the requesting session inside the write; select owner before revoking rows.
  const r=await db.prepare("WITH titular AS MATERIALIZED (SELECT s.usuario FROM comercio_sesiones s JOIN usuarios u ON u.id=s.usuario WHERE s.hash=? AND u.activo=1 AND s.revocado IS NULL AND s.expira>? AND s.ultima>?) UPDATE comercio_sesiones SET revocado=? WHERE usuario IN (SELECT usuario FROM titular) AND revocado IS NULL RETURNING usuario").bind(h,n,n-INACTIVIDAD,n).all();
  if(!r.results?.length)throw Error("Autenticación requerida.");
  return {cookie:cookie("",0)};
 }
 });
}
