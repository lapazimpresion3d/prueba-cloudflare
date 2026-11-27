// Exclusivamente servidor. verificarIdentidad debe validar criptográficamente el login externo.
const COOKIE="__Host-lapaz-comercial";
const DURACION=8*60*60*1000, INACTIVIDAD=30*60*1000;
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
const hash=async t=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))));
const cookie=(t,edad)=>COOKIE+"="+t+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age="+edad;
function extraer(request){
 const a=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+"="));
 if(a.length!==1)return null;
 const t=a[0].slice(COOKIE.length+1);return /^[a-f0-9]{64}$/.test(t)?t:null;
}
export async function crearSesionesComerciales(env,{verificarIdentidad,habilitado=false,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof verificarIdentidad!=="function")throw Error("Sesiones comerciales no configuradas.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema comercial incorrecto.");
 const q=(sql,...args)=>db.prepare(sql).bind(...args).first();
 const exigir=()=>{if(habilitado!==true)throw Error("Sesiones comerciales deshabilitadas.");};
 async function autenticar(request){
  if(habilitado!==true)return null;
  const t=extraer(request);if(!t)return null;
  const h=await hash(t),n=reloj();
  const r=await q("UPDATE comercio_sesiones SET ultima=MAX(ultima,?) WHERE hash=? AND revocado IS NULL AND expira>? AND ultima>? AND EXISTS(SELECT 1 FROM usuarios WHERE id=comercio_sesiones.usuario AND activo=1) RETURNING usuario",n,h,n,n-INACTIVIDAD);
  if(!r)return null;
  const u=await q("SELECT id,emisor,sujeto FROM usuarios WHERE id=? AND activo=1",r.usuario);
  return u?{actor:u.id,emisor:u.emisor,sujeto:u.sujeto}:null;
 }
 return Object.freeze({
 async iniciar(request){
  exigir();
  const i=await verificarIdentidad(request);
  if(!i||i.emailVerified!==true||typeof i.emisor!=="string"||typeof i.sujeto!=="string")throw Error("Identidad comercial no verificada.");
  const token=hex(crypto.getRandomValues(new Uint8Array(32))),h=await hash(token),n=reloj();
  const r=await q("INSERT INTO comercio_sesiones(hash,usuario,creado,expira,ultima) SELECT ?,id,?,?,? FROM usuarios WHERE emisor=? AND sujeto=? AND activo=1 RETURNING usuario",h,n,n+DURACION,n,i.emisor,i.sujeto);
  if(!r)throw Error("Usuario comercial no autorizado.");
  return {cookie:cookie(token,DURACION/1000),expira:n+DURACION};
 },
 autenticar,
 async cerrar(request){
  exigir();
  if(request.method!=="POST"||request.headers.get("Origin")!==new URL(request.url).origin)throw Error("Origen no permitido.");
  const t=extraer(request);if(t)await q("UPDATE comercio_sesiones SET revocado=? WHERE hash=? AND revocado IS NULL RETURNING usuario",reloj(),await hash(t));
  return {cookie:cookie("",0)};
 },
 async revocarTodas(request){
  exigir();
  if(request.method!=="POST"||request.headers.get("Origin")!==new URL(request.url).origin)throw Error("Origen no permitido.");
  const u=await autenticar(request);if(!u)throw Error("Autenticación requerida.");
  await db.prepare("UPDATE comercio_sesiones SET revocado=? WHERE usuario=? AND revocado IS NULL").bind(reloj(),u.actor).run();
  return {cookie:cookie("",0)};
 }
 });
}
