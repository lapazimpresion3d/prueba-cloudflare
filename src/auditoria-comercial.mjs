// Private read-only audit. No public routes. No raw historical invitation hashes.
export async function crearConsultaAuditoria(env,{autorizar,habilitado=false}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizar!=="function")throw Error("Auditoría no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 return async function consultar(request,{empresa,limite=50,offset=0}={}){
  if(habilitado!==true||request.method!=="GET"||typeof empresa!=="string"||!empresa||empresa.length>128||!Number.isSafeInteger(limite)||limite<1||limite>100||!Number.isSafeInteger(offset)||offset<0)throw Error("Consulta inválida.");
  const acceso=await autorizar(request,{empresa,permiso:"usuarios.administrar"});
  if(acceso.empresa!==empresa||acceso.sucursal!==null||acceso.permiso!=="usuarios.administrar")throw Error("Acceso denegado.");
  return (await db.prepare("SELECT id,empresa,actor,sucursal,accion,objetivo,fecha,anterior,posterior FROM comercio_auditoria_detalle WHERE empresa=? AND posterior IS NOT NULL AND EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario JOIN empresas e ON e.id=m.empresa JOIN rol_permisos p ON p.empresa=m.empresa AND p.rol=m.rol WHERE m.empresa=? AND m.usuario=? AND m.alcance='empresa' AND m.activa=1 AND u.activo=1 AND e.activa=1 AND p.permiso='usuarios.administrar') ORDER BY fecha DESC,id DESC LIMIT ? OFFSET ?").bind(empresa,empresa,acceso.actor,limite,offset).all()).results;
 };
}
