// Exclusivamente servidor. El llamador debe autenticar y autorizar al actor.
export async function crearAlmacenProveedores(env){
 const db=env.PROVIDER_DB;
 if(!db||db===env.DB||db===env.DEMO_DB)throw Error("Base de proveedores no aislada.");
 if(!(await db.prepare("SELECT clave FROM proveedor_identidad WHERE clave='lapaz-proveedores-v1'").first()))throw Error("Esquema de proveedores no preparado.");
 const ejecutar=async(sql,...args)=>db.prepare(sql).bind(...args).first();
 const valido=r=>r&&r.version===1&&typeof r.iv==="string"&&typeof r.datos==="string";
 const guardar=r=>{if(!valido(r))throw Error("Registro cifrado inválido.");return JSON.stringify(r);};
 const leer=r=>r?JSON.parse(r):null;
 const ahora=()=>Date.now();
 async function cambiar(lease,estado){
  return ejecutar("UPDATE proveedor_credenciales SET estado=?,reserva=NULL,reservado=NULL,revision=revision+1 WHERE comercio=? AND entorno=? AND estado='ocupado' AND reserva=? AND revision=? RETURNING revision",estado,lease.comercio,lease.entorno,lease.reserva,lease.revision);
 }
 return Object.freeze({
 async crearEstado(e){await db.prepare("INSERT INTO proveedor_oauth_estado(hash,comercio,entorno,actor,expira,cifrado) VALUES(?,?,?,?,?,?)").bind(e.hash,e.comercio,e.entorno,e.actor,e.expira,guardar(e.cifrado)).run();},
 async consumirEstado(e){
  const r=await ejecutar("UPDATE proveedor_oauth_estado SET consumido=? WHERE hash=? AND comercio=? AND entorno=? AND actor=? AND expira>? AND consumido IS NULL RETURNING cifrado",e.ahora,e.hash,e.comercio,e.entorno,e.actor,e.ahora);
  return r?{cifrado:leer(r.cifrado)}:null;
 },
 async reservar(comercio,entorno){
  const reserva=crypto.randomUUID();
  const r=await ejecutar("INSERT INTO proveedor_credenciales(comercio,entorno,estado,reserva,reservado,revision) VALUES(?,?,'ocupado',?,?,1) ON CONFLICT(comercio,entorno) DO UPDATE SET estado='ocupado',reserva=excluded.reserva,reservado=excluded.reservado,revision=proveedor_credenciales.revision+1 WHERE proveedor_credenciales.estado IN ('activo','sin_vincular','desvinculado') RETURNING comercio,entorno,vendedor,expira,cifrado,reserva,revision",comercio,entorno,reserva,ahora());
  return r?{...r,cifrado:leer(r.cifrado)}:null;
 },
 async confirmar(l,d){
  const r=await ejecutar("UPDATE proveedor_credenciales SET vendedor=?,expira=?,cifrado=?,estado='activo',reserva=NULL,reservado=NULL,revision=revision+1 WHERE comercio=? AND entorno=? AND estado='ocupado' AND reserva=? AND revision=? AND (vendedor IS NULL OR vendedor=?) RETURNING revision",d.vendedor,d.expira,guardar(d.cifrado),l.comercio,l.entorno,l.reserva,l.revision,d.vendedor);
  if(!r)throw Error("Reserva de credenciales inválida.");
 },
 async marcarIncierto(l){await cambiar(l,"incierto");},
 async estado(comercio,entorno){
  const r=await ejecutar("SELECT vendedor,expira,estado,revision FROM proveedor_credenciales WHERE comercio=? AND entorno=?",comercio,entorno);
  return r?{...r,expirado:r.expira!==null&&r.expira<=ahora()}:{estado:"sin_vincular"};
 },
 async desvincularLocal(comercio,entorno,revision){
  const r=await ejecutar("UPDATE proveedor_credenciales SET estado='desvinculado',cifrado=NULL,vendedor=NULL,expira=NULL,revision=revision+1 WHERE comercio=? AND entorno=? AND revision=? AND estado IN ('activo','incierto') RETURNING revision",comercio,entorno,revision);
  if(!r)throw Error("Desvinculación no permitida.");
  return r;
 },
 async limpiarEstados(){await db.prepare("DELETE FROM proveedor_oauth_estado WHERE expira<=?").bind(ahora()).run();}
 });
}
