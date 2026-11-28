import {rolesIniciales} from "./nucleo-comercial.mjs";
// Servicio privado; no se conecta a rutas hasta verificar identidad y permisos.
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
const hash=async t=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t))));
const nombre=x=>typeof x==="string"&&x.trim().length>=1&&x.trim().length<=120;
const correo=x=>typeof x==="string"&&x.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)?x.trim().toLowerCase():null;
export async function crearAltasComerciales(env,{verificarIdentidad,autenticar,habilitado=false,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof verificarIdentidad!=="function"||typeof autenticar!=="function")throw Error("Altas no configuradas.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const estadoMembresia="SELECT json_object('rol',rol,'activa',activa,'alcance',alcance,'sucursales',json((SELECT json_group_array(sucursal) FROM (SELECT sucursal FROM membresia_sucursales WHERE empresa=membresias.empresa AND usuario=membresias.usuario ORDER BY sucursal))),'permisosRol',json((SELECT json_group_array(permiso) FROM (SELECT permiso FROM rol_permisos WHERE empresa=membresias.empresa AND rol=membresias.rol ORDER BY permiso)))) FROM membresias WHERE empresa=? AND usuario=?";
 const exigir=r=>{if(habilitado!==true||new URL(r.url).protocol!=="https:"||r.method!=="POST"||r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Operación no permitida.");};
 async function identidad(r){const i=await verificarIdentidad(r);if(!i||i.emailVerified!==true||!correo(i.email)||typeof i.emisor!=="string"||!i.emisor||i.emisor.length>128||typeof i.sujeto!=="string"||!i.sujeto||i.sujeto.length>128)throw Error("Identidad no verificada.");return i;}
 // El actor se vuelve a verificar dentro de cada sentencia de escritura.
 const guard="EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario JOIN empresas e ON e.id=m.empresa JOIN rol_permisos p ON p.empresa=m.empresa AND p.rol=m.rol WHERE m.empresa=? AND m.usuario=? AND m.activa=1 AND m.alcance='empresa' AND m.rol='propietario' AND u.activo=1 AND e.activa=1 AND p.permiso='usuarios.administrar')";
 async function actor(r){const a=await autenticar(r);if(!a?.actor)throw Error("Autenticación requerida.");return a.actor;}
 return Object.freeze({
 async registrar(r,d){
  exigir(r);const i=await identidad(r);if(!nombre(d.nombre)||!nombre(d.sucursal))throw Error("Nombre inválido.");
  const empresa=crypto.randomUUID(),sucursal=crypto.randomUUID(),usuario=crypto.randomUUID(),n=reloj();
  const stm=[q("INSERT INTO usuarios(id,emisor,sujeto) VALUES(?,?,?) ON CONFLICT(emisor,sujeto) DO NOTHING",usuario,i.emisor,i.sujeto),q("INSERT INTO empresas(id,nombre) VALUES(?,?)",empresa,d.nombre.trim()),q("INSERT INTO sucursales(empresa,id,nombre) VALUES(?,?,?)",empresa,sucursal,d.sucursal.trim())];
  for(const [rol,permisos] of Object.entries(rolesIniciales)){stm.push(q("INSERT INTO roles VALUES(?,?,?)",empresa,rol,rol));for(const p of permisos)stm.push(q("INSERT INTO rol_permisos VALUES(?,?,?)",empresa,rol,p));}
  // NOT NULL obliga a revertir todo el batch si el usuario está desactivado.
  stm.push(q("INSERT INTO membresias(empresa,usuario,rol,alcance) VALUES(?,(SELECT id FROM usuarios WHERE emisor=? AND sujeto=? AND activo=1),'propietario','empresa')",empresa,i.emisor,i.sujeto),q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,id,'empresa.alta',?,? FROM usuarios WHERE emisor=? AND sujeto=?",empresa,empresa,n,i.emisor,i.sujeto));
  await db.batch(stm);return {empresa,sucursal};
 },
 async invitar(r,d){
  exigir(r);const a=await actor(r),email=correo(d.correo),rol=d.rol,sucursal=d.sucursal??null;
  if(!email||!["administrador","encargado","cajero"].includes(rol)|| (rol==="administrador"?sucursal!==null:typeof sucursal!=="string"||!sucursal))throw Error("Invitación inválida.");
  const t=hex(crypto.getRandomValues(new Uint8Array(32))),h=await hash(t),n=reloj();
  const res=await db.batch([q("INSERT INTO comercio_invitaciones(hash,empresa,correo,rol,sucursal,actor,expira) SELECT ?,?,?,?,?,?,? WHERE "+guard+" AND (? IS NULL OR EXISTS(SELECT 1 FROM sucursales WHERE empresa=? AND id=? AND activa=1)) RETURNING hash",h,d.empresa,email,rol,sucursal,a,n+86400000,d.empresa,a,sucursal,d.empresa,sucursal),q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT empresa,actor,'invitacion.creada',hash,? FROM comercio_invitaciones WHERE hash=?",n,h)]);
  if(!res[0].results?.length)throw Error("Invitación no autorizada.");
  return {token:t,expira:n+86400000};
 },
 async aceptar(r,token){
  exigir(r);const i=await identidad(r);if(typeof token!=="string"||!/^[a-f0-9]{64}$/.test(token))throw Error("Invitación inválida.");
  const h=await hash(token),n=reloj(),email=correo(i.email);
  // La marca de consumo es única para esta aceptación; todos los pasos se ejecutan en un batch atómico.
  const marca=crypto.randomUUID(),u=crypto.randomUUID();
  const res=await db.batch([
   q("UPDATE comercio_invitaciones SET consumido=? WHERE hash=? AND correo=? AND consumido IS NULL AND revocado IS NULL AND expira>? AND "+guard.replace("m.empresa=?","m.empresa=comercio_invitaciones.empresa").replace("m.usuario=?","m.usuario=comercio_invitaciones.actor")+" AND (sucursal IS NULL OR EXISTS(SELECT 1 FROM sucursales s WHERE s.empresa=comercio_invitaciones.empresa AND s.id=comercio_invitaciones.sucursal AND s.activa=1)) RETURNING empresa",marca,h,email,n),
   q("INSERT INTO usuarios(id,emisor,sujeto) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM comercio_invitaciones WHERE hash=? AND consumido=?) ON CONFLICT(emisor,sujeto) DO NOTHING",u,i.emisor,i.sujeto,h,marca),
   q("INSERT INTO membresias(empresa,usuario,rol,alcance) SELECT empresa,(SELECT id FROM usuarios WHERE emisor=? AND sujeto=? AND activo=1),rol,CASE WHEN sucursal IS NULL THEN 'empresa' ELSE 'sucursales' END FROM comercio_invitaciones WHERE hash=? AND consumido=?",i.emisor,i.sujeto,h,marca),
   q("INSERT INTO membresia_sucursales SELECT empresa,(SELECT id FROM usuarios WHERE emisor=? AND sujeto=?),sucursal FROM comercio_invitaciones WHERE hash=? AND consumido=? AND sucursal IS NOT NULL",i.emisor,i.sujeto,h,marca),
   q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT empresa,(SELECT id FROM usuarios WHERE emisor=? AND sujeto=?),'invitacion.aceptada',hash,? FROM comercio_invitaciones WHERE hash=? AND consumido=?",i.emisor,i.sujeto,n,h,marca),
   q("INSERT INTO comercio_auditoria_detalle(id,empresa,actor,sucursal,accion,objetivo,fecha,anterior,posterior) SELECT ?,empresa,(SELECT id FROM usuarios WHERE emisor=? AND sujeto=?),sucursal,'membresia.alta',(SELECT id FROM usuarios WHERE emisor=? AND sujeto=?),?,NULL,("+estadoMembresia.replace("empresa=? AND usuario=?","empresa=comercio_invitaciones.empresa AND usuario=(SELECT id FROM usuarios WHERE emisor=? AND sujeto=?)")+") FROM comercio_invitaciones WHERE hash=? AND consumido=?",crypto.randomUUID(),i.emisor,i.sujeto,i.emisor,i.sujeto,n,i.emisor,i.sujeto,h,marca)
  ]);
  if(!res[0].results?.length)throw Error("Invitación no disponible.");return {empresa:res[0].results[0].empresa};
 },
 async desactivar(r,{empresa,usuario}){
  exigir(r);const a=await actor(r),n=reloj();
  const marca=crypto.randomUUID();
  const previo=q("INSERT INTO comercio_auditoria_detalle(id,empresa,actor,accion,objetivo,fecha,anterior) SELECT ?,?,?,'membresia.desactivada',?,?,("+estadoMembresia+") WHERE "+guard+" AND EXISTS(SELECT 1 FROM membresias WHERE empresa=? AND usuario=? AND activa=1 AND rol<>'propietario')",marca,empresa,a,usuario,n,empresa,usuario,empresa,a,empresa,usuario);
  const final=q("UPDATE comercio_auditoria_detalle SET posterior=("+estadoMembresia+") WHERE id=?",empresa,usuario,marca);
  const res=await db.batch([previo,q("UPDATE membresias SET activa=0 WHERE empresa=? AND usuario=? AND activa=1 AND rol<>'propietario' AND "+guard+" RETURNING usuario",empresa,usuario,empresa,a),q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,'membresia.desactivada',?,? WHERE changes()=1",empresa,a,usuario,n),final]);
  if(!res[1].results?.length)throw Error("Desactivación no permitida.");return {desactivada:true};
 }
 });
}
