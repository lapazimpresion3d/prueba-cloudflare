import {restriccionesOperativas} from "./nucleo-comercial.mjs";
// Administración privada. Revalidación del propietario dentro del batch D1.
const operativos=["empresa.ver","pos.operar","caja.operar","caja.supervisar","reportes.ver","inventario.operar"];
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const nombre=x=>typeof x==="string"&&x.trim().length>0&&x.trim().length<=120;
const guard="EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario JOIN empresas e ON e.id=m.empresa JOIN rol_permisos p ON p.empresa=m.empresa AND p.rol=m.rol WHERE m.empresa=? AND m.usuario=? AND m.rol='propietario' AND m.alcance='empresa' AND m.activa=1 AND u.activo=1 AND e.activa=1 AND p.permiso=?)";
export async function crearAdministracionComercial(env,{autenticar,habilitado=false,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticar!=="function")throw Error("Administración no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 async function contexto(r,e){if(!habilitado||!id(e)||r.method!=="POST"||r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Operación no permitida.");const a=await autenticar(r);if(!id(a?.actor))throw Error("Autenticación requerida.");return a.actor;}
 const log=(e,a,accion,obj)=>q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,?,?,? WHERE changes()=1",e,a,accion,obj,reloj());

 const detalle=(e,a,accion,obj,sucursal,consulta,params,permiso,condicion="",valores=[])=>{
  const marca=crypto.randomUUID();
  const previo=q("INSERT INTO comercio_auditoria_detalle(id,empresa,actor,sucursal,accion,objetivo,fecha,anterior) SELECT ?,?,?,?,?,?,?,("+consulta+") WHERE "+guard+condicion,marca,e,a,sucursal,accion,obj,reloj(),...params,e,a,permiso,...valores);
  const final=q("UPDATE comercio_auditoria_detalle SET posterior=("+consulta+") WHERE id=?",...params,marca);
  return {previo,final};
 };
 const estadoSucursal="SELECT json_object('activa',activa) FROM sucursales WHERE empresa=? AND id=?";
 const estadoRol="SELECT json_object('permisos',json((SELECT json_group_array(permiso) FROM (SELECT permiso FROM rol_permisos WHERE empresa=roles.empresa AND rol=roles.id ORDER BY permiso)))) FROM roles WHERE empresa=? AND id=?";
 const estadoMembresia="SELECT json_object('rol',rol,'activa',activa,'alcance',alcance,'sucursales',json((SELECT json_group_array(sucursal) FROM (SELECT sucursal FROM membresia_sucursales WHERE empresa=membresias.empresa AND usuario=membresias.usuario ORDER BY sucursal))),'permisosRol',json((SELECT json_group_array(permiso) FROM (SELECT permiso FROM rol_permisos WHERE empresa=membresias.empresa AND rol=membresias.rol ORDER BY permiso)))) FROM membresias WHERE empresa=? AND usuario=?";
 async function ejecutar(stm,indice=0){const r=await db.batch(stm);if(!r[indice].results?.length)throw Error("Operación no autorizada o inexistente.");return r[indice].results[0];}
 return Object.freeze({
 async guardarSucursal(r,d){
  const a=await contexto(r,d.empresa);if(!nombre(d.nombre)||![0,1].includes(d.activa))throw Error("Sucursal inválida.");
  const s=d.id??crypto.randomUUID();if(!id(s))throw Error("Sucursal inválida.");
  const args=[d.empresa,a,"sucursales.administrar"];
  const stmt=d.id?q("UPDATE sucursales SET nombre=?,activa=? WHERE empresa=? AND id=? AND "+guard+" RETURNING id",d.nombre.trim(),d.activa,d.empresa,s,...args):q("INSERT INTO sucursales(empresa,id,nombre,activa) SELECT ?,?,?,? WHERE "+guard+" RETURNING id",d.empresa,s,d.nombre.trim(),d.activa,...args);
  const h=detalle(d.empresa,a,"sucursal.guardada",s,s,estadoSucursal,[d.empresa,s],"sucursales.administrar");
  return ejecutar([h.previo,stmt,log(d.empresa,a,"sucursal.guardada",s),h.final],1);
 },
 async guardarRol(r,d){
  const a=await contexto(r,d.empresa);if(!nombre(d.nombre)||!Array.isArray(d.permisos)||!d.permisos.length||d.permisos.some(p=>!operativos.includes(p)))throw Error("Rol inválido o permiso crítico.");
  const rol=d.id??"custom-"+crypto.randomUUID();if(!/^custom-[a-f0-9-]{36}$/.test(rol))throw Error("Rol base protegido.");
  const args=[d.empresa,a,"usuarios.administrar"];
  const stm=[d.id?q("UPDATE roles SET nombre=? WHERE empresa=? AND id=? AND "+guard+" RETURNING id",d.nombre.trim(),d.empresa,rol,...args):q("INSERT INTO roles SELECT ?,?,? WHERE "+guard+" RETURNING id",d.empresa,rol,d.nombre.trim(),...args),log(d.empresa,a,"rol.guardado",rol),q("DELETE FROM rol_permisos WHERE empresa=? AND rol=? AND "+guard,d.empresa,rol,...args)];
  for(const p of new Set(d.permisos))stm.push(q("INSERT INTO rol_permisos SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM roles WHERE empresa=? AND id=?) AND "+guard,d.empresa,rol,p,d.empresa,rol,...args));
  const h=detalle(d.empresa,a,"rol.guardado",rol,null,estadoRol,[d.empresa,rol],"usuarios.administrar");
  return ejecutar([h.previo,...stm,h.final],1);
 },
 async asignar(r,d){
  const a=await contexto(r,d.empresa);if(!id(d.usuario)||!id(d.rol)||!Array.isArray(d.sucursales)||d.sucursales.length<1||d.sucursales.length>20||d.sucursales.some(s=>!id(s))||!["encargado","cajero"].includes(d.rol)&&!/^custom-[a-f0-9-]{36}$/.test(d.rol))throw Error("Asignación inválida.");
  const suc=[...new Set(d.sucursales)],args=[d.empresa,a,"usuarios.administrar"];
  const filtro=" AND EXISTS(SELECT 1 FROM usuarios WHERE id=membresias.usuario AND activo=1) AND EXISTS(SELECT 1 FROM roles WHERE empresa=membresias.empresa AND id=?) AND NOT EXISTS(SELECT 1 FROM json_each(?) j WHERE NOT EXISTS(SELECT 1 FROM sucursales s WHERE s.empresa=membresias.empresa AND s.id=j.value AND s.activa=1))";
  // Guardar la marca mediante una fila de auditoría única en el mismo batch.
  const marca=crypto.randomUUID(),cond="EXISTS(SELECT 1 FROM comercio_auditoria WHERE empresa=? AND actor=? AND accion='membresia.asignada' AND objetivo=?)",obj=d.usuario+":"+marca;
  const stm=[q("UPDATE membresias SET rol=?,alcance='sucursales',activa=1 WHERE empresa=? AND usuario=? AND rol<>'propietario' AND "+guard+filtro+" RETURNING usuario",d.rol,d.empresa,d.usuario,...args,d.rol,JSON.stringify(suc)),log(d.empresa,a,"membresia.asignada",obj),q("DELETE FROM membresia_sucursales WHERE empresa=? AND usuario=? AND "+cond,d.empresa,d.usuario,d.empresa,a,obj)];
  for(const s of suc)stm.push(q("INSERT INTO membresia_sucursales SELECT ?,?,? WHERE "+cond,d.empresa,d.usuario,s,d.empresa,a,obj));
  const h=detalle(d.empresa,a,"membresia.asignada",d.usuario,null,estadoMembresia,[d.empresa,d.usuario],"usuarios.administrar"," AND EXISTS(SELECT 1 FROM membresias WHERE empresa=? AND usuario=? AND rol<>'propietario'"+filtro+")",[d.empresa,d.usuario,d.rol,JSON.stringify(suc)]);
  return ejecutar([h.previo,...stm,h.final],1);
 },
 async guardarPermisosIndividuales(r,d){
  const a=await contexto(r,d.empresa);
  const permitidos=restriccionesOperativas;
  if(!id(d.usuario)||!Array.isArray(d.denegados)||d.denegados.length>permitidos.length||new Set(d.denegados).size!==d.denegados.length||d.denegados.some(p=>!permitidos.includes(p)))throw Error("Restricciones individuales inválidas.");
  const marca=crypto.randomUUID(),args=[d.empresa,a,"usuarios.administrar"];
  const filtro=" AND EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=? AND m.usuario=? AND m.rol<>'propietario' AND m.activa=1 AND u.activo=1)";
  const estado="SELECT json_object('denegados',json((SELECT json_group_array(permiso) FROM (SELECT permiso FROM membresia_permisos_denegados WHERE empresa=membresias.empresa AND usuario=membresias.usuario ORDER BY permiso)))) FROM membresias WHERE empresa=? AND usuario=?";
  const previo=q("INSERT INTO comercio_auditoria_detalle(id,empresa,actor,accion,objetivo,fecha,anterior) SELECT ?,?,?,'membresia.permisos',?,?,("+estado+") WHERE "+guard+filtro+" RETURNING id",marca,d.empresa,a,d.usuario,reloj(),d.empresa,d.usuario,...args,d.empresa,d.usuario);
  const cond="EXISTS(SELECT 1 FROM comercio_auditoria_detalle WHERE id=? AND empresa=? AND actor=? AND posterior IS NULL)";
  const stm=[previo,q("DELETE FROM membresia_permisos_denegados WHERE empresa=? AND usuario=? AND "+cond,d.empresa,d.usuario,marca,d.empresa,a)];
  for(const p of d.denegados)stm.push(q("INSERT INTO membresia_permisos_denegados SELECT ?,?,? WHERE "+cond,d.empresa,d.usuario,p,marca,d.empresa,a));
  stm.push(q("UPDATE comercio_auditoria_detalle SET posterior=("+estado+") WHERE id=?",d.empresa,d.usuario,marca));
  return ejecutar(stm);
 },
 async revocarInvitacion(r,d){
  const a=await contexto(r,d.empresa);if(!/^[a-f0-9]{64}$/.test(d.hash))throw Error("Invitación inválida.");
  return ejecutar([q("UPDATE comercio_invitaciones SET revocado=?,revocado_por=? WHERE empresa=? AND hash=? AND consumido IS NULL AND revocado IS NULL AND "+guard+" RETURNING hash",reloj(),a,d.empresa,d.hash,d.empresa,a,"usuarios.administrar"),log(d.empresa,a,"invitacion.revocada",d.hash)]);
 }
 });
}
