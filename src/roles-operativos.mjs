import {hashSesionComercial} from "./sesiones-comerciales.mjs";
import {resolverCompatibilidad} from "./compatibilidad-modulos.mjs";
import {permisosGranulares,permisoAdicional} from "./nucleo-comercial.mjs";
const acciones={pedidos:["consultar","crear","modificar","cancelar"],cocina:["consultar","modificar"],mesas:["consultar","modificar"],citas:["consultar","crear","modificar","cancelar"],agendas:["consultar","modificar"],reservaciones:["consultar","crear","modificar","cancelar"],catalogo:["consultar","crear","modificar"],clientes:["consultar","crear","modificar"],pos:["consultar","crear","cancelar"],caja:["consultar","abrir","cerrar","ajustar"],inventario:["consultar","modificar"],almacen:["consultar","modificar"],compras:["consultar","crear","modificar"],reportes:["consultar","exportar"],cotizaciones:["consultar","crear","modificar","cancelar"],ordenes_servicio:["consultar","crear","modificar","cancelar"]};
export const permisosOperativos=Object.freeze(Object.fromEntries(Object.entries(acciones).flatMap(([m,a])=>a.map(v=>[m+"."+v,m]))));
const plantillas={mesero:["pedidos.consultar","pedidos.crear","pedidos.modificar","mesas.consultar","mesas.modificar"],cocinero:["cocina.consultar","cocina.modificar"],barbero:["citas.consultar","agendas.consultar"],recepcionista:["citas.consultar","citas.crear","citas.modificar","citas.cancelar","agendas.consultar"],cajero:["pos.consultar","pos.crear","caja.consultar","caja.abrir","caja.cerrar"],vendedor:["catalogo.consultar","pedidos.consultar","pedidos.crear","pos.consultar","pos.crear"],almacenista:["inventario.consultar","inventario.modificar","almacen.consultar","almacen.modificar"],tecnico:["ordenes_servicio.consultar","ordenes_servicio.modificar","cotizaciones.consultar"]};
export const plantillasOperativas=Object.freeze(Object.fromEntries(Object.entries(plantillas).map(([k,v])=>[k,Object.freeze(v)])));
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const rev=x=>Number.isSafeInteger(x)&&x>=0&&x<Number.MAX_SAFE_INTEGER;
const lista=x=>Array.isArray(x)&&x.length<=Object.keys(permisosOperativos).length&&new Set(x).size===x.length&&x.every(k=>Object.hasOwn(permisosOperativos,k));
const rolValido=x=>typeof x==="string"&&/^operativo-[a-f0-9-]{36}$/.test(x);
export async function crearRolesOperativos(env,{habilitado=false,autorizarComercial,reloj=Date.now,operativos=[]}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarComercial!=="function")throw Error("Roles no configurados.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM empresas e JOIN membresias m ON m.empresa=e.id JOIN usuarios u ON u.id=m.usuario JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercio_altas_pendientes z ON z.empresa=e.id JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercio_invitaciones_propietario j ON j.alta=z.id JOIN central_implementaciones c ON c.empresa=e.id WHERE e.id=? AND m.usuario=? AND cs.hash=? AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND e.activa=1 AND m.activa=1 AND u.activo=1 AND m.rol='propietario' AND m.alcance='empresa' AND z.estado='aceptada' AND j.consumido IS NOT NULL AND c.estado IN ('pendiente','configuracion','revision') AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=e.id AND p.rol=m.rol AND p.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=e.id AND d.usuario=m.usuario AND d.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=e.id AND s.estado IN ('suspendida','cancelada')))";
 const disponibles=Object.freeze([...operativos]);
 async function contexto(r,e,metodo){
  if(habilitado!==true||!id(e)||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Rol no disponible.");
  const a=await autorizarComercial(r,{empresa:e,permiso:"usuarios.administrar"}),h=await hashSesionComercial(r),n=reloj();
  if(a?.empresa!==e||!id(a.actor)||!h||!Number.isSafeInteger(n)||n<0)throw Error("Rol no disponible.");
  return {actor:a.actor,n,args:[e,a.actor,h,n,n-1800000]};
 }
 const log=(e,a,accion,k)=>q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,?,?,? WHERE changes()=1",e,a.actor,accion,k,a.n);
 const contrato="EXISTS(SELECT 1 FROM comercial_contratos_iniciales k JOIN comercial_planes p ON p.id=COALESCE((SELECT plan FROM comercial_suscripciones WHERE empresa=k.empresa),k.plan) AND p.version=COALESCE((SELECT version FROM comercial_suscripciones WHERE empresa=k.empresa),k.version) JOIN comercio_altas_pendientes z ON z.id=k.alta WHERE k.empresa=? AND NOT EXISTS(SELECT 1 FROM json_each(?) j WHERE NOT EXISTS(SELECT 1 FROM json_each(p.modulos) pm WHERE pm.value=j.value)))";
 return Object.freeze({
 async listar(r,{empresa}={}){
  const a=await contexto(r,empresa,"GET");
  if(!await q("SELECT 1 AS ok WHERE "+guard,...a.args).first())throw Error("Rol no disponible.");
  const x=await q("SELECT p.rol,p.nombre,p.revision,p.permisos FROM comercio_roles_operativos p WHERE p.empresa=? AND "+guard+" AND p.revision=(SELECT MAX(v.revision) FROM comercio_roles_operativos v WHERE v.empresa=p.empresa AND v.rol=p.rol) ORDER BY p.rol LIMIT 100",empresa,...a.args).all();
  return x.results.map(v=>({...v,permisos:JSON.parse(v.permisos)}));
 },
 async guardar(r,d){
  const a=await contexto(r,d?.empresa,"POST"),nuevo=d.rol===undefined;
  if(!rev(d.revision)||nuevo&&d.revision!==0||!nuevo&&(!rolValido(d.rol)||d.revision===0)||typeof d.nombre!=="string"||!d.nombre.trim()||d.nombre.trim().length>120||/[\u0000-\u001f\u007f]/u.test(d.nombre)||!lista(d.permisos)||Object.keys(d).some(k=>!["empresa","rol","revision","nombre","permisos"].includes(k)))throw Error("Rol inválido.");
  const rol=nuevo?"operativo-"+crypto.randomUUID():d.rol,p=JSON.stringify([...d.permisos].sort()),m=JSON.stringify([...new Set(d.permisos.map(k=>permisosOperativos[k]))]);
  const stm=[];
  if(nuevo)stm.push(q("INSERT INTO roles(empresa,id,nombre) SELECT ?,?,? WHERE "+guard+" AND "+contrato,d.empresa,rol,d.nombre.trim(),...a.args,d.empresa,m),q("INSERT INTO rol_permisos(empresa,rol,permiso) SELECT ?,?,'empresa.ver' WHERE changes()=1",d.empresa,rol));
  const indice=stm.length;
  stm.push(q("INSERT INTO comercio_roles_operativos(empresa,rol,revision,nombre,permisos,actor,fecha) SELECT ?,?,?,?,?,?,? WHERE "+guard+" AND "+contrato+" AND EXISTS(SELECT 1 FROM roles WHERE empresa=? AND id=?) AND (SELECT COALESCE(MAX(revision),0) FROM comercio_roles_operativos WHERE empresa=? AND rol=?)=? RETURNING revision",d.empresa,rol,d.revision+1,d.nombre.trim(),p,a.actor,a.n,...a.args,d.empresa,m,d.empresa,rol,d.empresa,rol,d.revision),log(d.empresa,a,"rol.operativo_guardado",rol));
  const res=await db.batch(stm);if(!res[indice].results?.length)throw Error("Conflicto de revisión, contrato o autorización.");return {rol,revision:d.revision+1};
 },
 async restringir(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!id(d.usuario)||!rev(d.revision)||!lista(d.denegados)||Object.keys(d).some(k=>!["empresa","usuario","revision","denegados"].includes(k)))throw Error("Restricción inválida.");
  const res=await db.batch([q("INSERT INTO comercio_restricciones_operativas(empresa,usuario,revision,denegados,actor,fecha) SELECT ?,?,?,?,?,? WHERE "+guard+" AND EXISTS(SELECT 1 FROM membresias WHERE empresa=? AND usuario=? AND activa=1 AND rol<>'propietario') AND (SELECT COALESCE(MAX(revision),0) FROM comercio_restricciones_operativas WHERE empresa=? AND usuario=?)=? RETURNING revision",d.empresa,d.usuario,d.revision+1,JSON.stringify([...d.denegados].sort()),a.actor,a.n,...a.args,d.empresa,d.usuario,d.empresa,d.usuario,d.revision),log(d.empresa,a,"rol.restriccion_guardada",d.usuario)]);
  if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");return res[0].results[0];
 },
 async autorizarOperacion(r,{empresa,sucursal,permiso}={}){
  if(habilitado!==true||!id(empresa)||!id(sucursal)||!Object.hasOwn(permisosOperativos,permiso)||new URL(r.url).protocol!=="https:")throw Error("Operación no disponible.");
  const a=await autorizarComercial(r,{empresa,sucursal,permiso:"empresa.ver"}),h=await hashSesionComercial(r),n=reloj(),modulo=permisosOperativos[permiso];
  if(a?.empresa!==empresa||!id(a.actor)||!h||!Number.isSafeInteger(n)||n<0)throw Error("Operación no disponible.");
  const x=await q("SELECT m.rol,z.giro,p.modulos AS contratados,ac.modulos AS seleccion,ro.permisos,rd.denegados FROM membresias m JOIN usuarios u ON u.id=m.usuario JOIN empresas e ON e.id=m.empresa JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercial_suscripciones s ON s.empresa=e.id JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version JOIN comercial_activaciones ac ON ac.empresa=e.id JOIN comercial_contratos_iniciales k ON k.empresa=e.id JOIN comercio_altas_pendientes z ON z.id=k.alta LEFT JOIN comercio_roles_operativos ro ON ro.empresa=m.empresa AND ro.rol=m.rol AND ro.revision=(SELECT MAX(v.revision) FROM comercio_roles_operativos v WHERE v.empresa=m.empresa AND v.rol=m.rol) LEFT JOIN comercio_restricciones_operativas rd ON rd.empresa=m.empresa AND rd.usuario=m.usuario AND rd.revision=(SELECT MAX(v.revision) FROM comercio_restricciones_operativas v WHERE v.empresa=m.empresa AND v.usuario=m.usuario) WHERE m.empresa=? AND m.usuario=? AND cs.hash=? AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND m.activa=1 AND u.activo=1 AND e.activa=1 AND z.estado='aceptada' AND s.estado IN ('activa','prueba') AND s.inicio<=? AND s.vence>? AND EXISTS(SELECT 1 FROM sucursales b WHERE b.empresa=m.empresa AND b.id=? AND b.activa=1) AND (m.alcance='empresa' OR EXISTS(SELECT 1 FROM membresia_sucursales ms WHERE ms.empresa=m.empresa AND ms.usuario=m.usuario AND ms.sucursal=?)) AND (SELECT count(*) FROM membresias WHERE empresa=e.id AND activa=1)<=p.usuarios AND (SELECT count(*) FROM sucursales WHERE empresa=e.id AND activa=1)<=p.sucursales AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=m.empresa AND d.usuario=m.usuario AND d.permiso IN (?,?,?))",empresa,a.actor,h,n,n-1800000,n,n,sucursal,sucursal,permiso,permisosGranulares[permiso]??(permiso==="reportes.consultar"?"reportes.ver":permiso),permisoAdicional(permiso)).first();
  if(!x||x.rol!=="propietario"&&(!x.permisos||!JSON.parse(x.permisos).includes(permiso))||x.denegados&&JSON.parse(x.denegados).includes(permiso))throw Error("Operación no autorizada.");
  const mapa=new Map(resolverCompatibilidad({giro:x.giro,contratados:JSON.parse(x.contratados),operativos:disponibles}).modulos.map(m=>[m.id,m])),seleccion=new Set(JSON.parse(x.seleccion));
  const efectivo=k=>seleccion.has(k)&&mapa.get(k)?.disponibleTecnico===true&&mapa.get(k).dependencias.every(efectivo);
  if(!efectivo(modulo))throw Error("Módulo no disponible.");
  return {empresa,sucursal,actor:a.actor,rol:x.rol,permiso,modulo};
 }
 });
}
