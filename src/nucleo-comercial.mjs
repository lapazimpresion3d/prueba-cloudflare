// Núcleo comercial privado. Identidad debe provenir de un autenticador de servidor verificado.
export const permisos=Object.freeze(["empresa.ver","empresa.administrar","sucursales.administrar","usuarios.administrar","proveedores.ver","proveedores.administrar","pos.operar","caja.operar","caja.supervisar","reportes.ver","inventario.operar"]);
export const rolesIniciales=Object.freeze({
 propietario:Object.freeze([...permisos]),
 administrador:Object.freeze(permisos.filter(p=>p!=="proveedores.administrar"&&p!=="usuarios.administrar")),
 encargado:Object.freeze(["empresa.ver","pos.operar","caja.operar","caja.supervisar","inventario.operar","reportes.ver"]),
 cajero:Object.freeze(["empresa.ver","pos.operar","caja.operar"])
});
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
export async function crearNucleoComercial(env,{autenticar}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autenticar!=="function")throw Error("Núcleo comercial no configurado.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema comercial no preparado.");
 async function autorizar(request,{empresa,sucursal=null,permiso}){
  if(!id(empresa)||!permisos.includes(permiso)||(sucursal!==null&&!id(sucursal)))throw Error("Contexto comercial inválido.");
  const identidad=await autenticar(request);
  if(!id(identidad?.emisor)||!id(identidad?.sujeto))throw Error("Autenticación requerida.");
  // Operaciones financieras de proveedor y administración son siempre de alcance empresa.
  if(sucursal!==null&&permiso!=="empresa.ver"&&(/^(proveedores|empresa|usuarios|sucursales)\./.test(permiso)))throw Error("Permiso de alcance empresa requerido.");
  const r=await db.prepare(`SELECT u.id AS actor,m.rol FROM usuarios u JOIN membresias m ON m.usuario=u.id JOIN empresas e ON e.id=m.empresa JOIN rol_permisos p ON p.empresa=m.empresa AND p.rol=m.rol
 WHERE u.emisor=? AND u.sujeto=? AND u.activo=1 AND m.activa=1 AND e.activa=1 AND m.empresa=? AND p.permiso=?
 AND ((? IS NULL AND m.alcance='empresa') OR (? IS NOT NULL AND EXISTS(SELECT 1 FROM sucursales s WHERE s.empresa=m.empresa AND s.id=? AND s.activa=1) AND (m.alcance='empresa' OR EXISTS(SELECT 1 FROM membresia_sucursales ms WHERE ms.empresa=m.empresa AND ms.usuario=u.id AND ms.sucursal=?))))`).bind(identidad.emisor,identidad.sujeto,empresa,permiso,sucursal,sucursal,sucursal,sucursal).first();
  if(!r)throw Error("Acceso comercial denegado.");
  return Object.freeze({empresa,sucursal,actor:r.actor,rol:r.rol,permiso});
 }
 return Object.freeze({autorizar});
}
