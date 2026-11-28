import {idsModulos} from "./catalogo-contractual.mjs";
// Private rule baseline v1. Demo availability is not production readiness.
export const girosComerciales=Object.freeze(["restaurante","cafeteria","tienda","barberia","taller","otro"]);
const comercio=["restaurante","cafeteria","tienda"],servicios=["barberia","taller"],mesa=["restaurante"],cocina=["restaurante","cafeteria"],trabajos=["taller","barberia","tienda"];
const especial={pedidos:comercio,seguimiento:comercio,citas:servicios,reservaciones:mesa,qr_mesa:mesa,agendas:servicios,cocina,pagos:comercio,mesas:mesa,cotizaciones:trabajos,ordenes_servicio:trabajos};
const deps={seguimiento:["pedidos"],qr_mesa:["pedidos"],agendas:["citas"],cocina:["pedidos"],pagos:["pedidos"],caja:["pos"],comprobantes:["pos","caja"],inventario:["pos"],almacen:["inventario"],compras:["inventario"],reportes:["pos"],mesas:["cocina","qr_mesa"],cotizaciones:["pos"],ordenes_servicio:["cotizaciones"],fidelizacion:["clientes","pos"],recetas:["inventario"],automatizaciones:["pos"]};
export const reglasModulosV1=Object.freeze(Object.fromEntries(idsModulos.map(id=>[id,Object.freeze({giros:Object.freeze([...(especial[id]??girosComerciales)]),depende:Object.freeze([...(deps[id]??[])])})])));
const listaValida=a=>Array.isArray(a)&&a.length<=idsModulos.length&&new Set(a).size===a.length&&a.every(m=>idsModulos.includes(m));
// For published plans reject missing prerequisites even if a particular giro would not use them.
export function validarModulosContractuales(modulos){
 if(!listaValida(modulos)||!modulos.length)return false;
 const s=new Set(modulos);
 return modulos.every(m=>reglasModulosV1[m].depende.every(d=>s.has(d)));
}
export function resolverCompatibilidad({giro,contratados,operativos=[]}={}){
 if(!girosComerciales.includes(giro)||!listaValida(contratados)||!listaValida(operativos))throw Error("Compatibilidad no configurada.");
 const c=new Set(contratados),o=new Set(operativos),memo=new Map(),visita=new Set();
 function resolver(m){
  if(memo.has(m))return memo.get(m);
  if(visita.has(m))throw Error("Dependencia circular.");
  visita.add(m);
  const regla=reglasModulosV1[m],contratado=c.has(m),compatible=regla.giros.includes(giro);
  const dependencias=regla.depende.map(resolver);
  const aplicable=contratado&&compatible&&dependencias.every(d=>d.aplicable);
  const disponibleTecnico=aplicable&&o.has(m)&&dependencias.every(d=>d.disponibleTecnico);
  const estado=!contratado?"no_contratado":!compatible?"giro_incompatible":!aplicable?"dependencia_no_aplicable":!disponibleTecnico?"pendiente_tecnico":"candidato_activacion";
  const r=Object.freeze({id:m,contratado,compatible,aplicable,disponibleTecnico,habilitado:false,estado,dependencias:regla.depende});
  visita.delete(m);memo.set(m,r);return r;
 }
 return Object.freeze({giro,versionReglas:1,modulos:Object.freeze(idsModulos.map(resolver))});
}
// Read-only internal service. Source of giro and contracted version is the database, never request input.
export async function crearConsultaCompatibilidad(env,{habilitado=false,autorizarComercial,operativos=[]}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarComercial!=="function"||!listaValida(operativos))throw Error("Compatibilidad no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const disponibilidad=Object.freeze([...operativos]);
 return Object.freeze({async consultar(r,{empresa}={}){
  if(habilitado!==true||r.method!=="GET"||new URL(r.url).protocol!=="https:"||typeof empresa!=="string"||!empresa||empresa.length>128)throw Error("Consulta no permitida.");
  const a=await autorizarComercial(r,{empresa,permiso:"empresa.ver"});
  if(a?.empresa!==empresa||typeof a.actor!=="string"||!a.actor)throw Error("Consulta no permitida.");
  const x=await db.prepare("SELECT p.id AS plan,p.version,p.modulos,z.giro FROM comercial_contratos_iniciales k LEFT JOIN comercial_suscripciones s ON s.empresa=k.empresa JOIN comercial_planes p ON p.id=COALESCE(s.plan,k.plan) AND p.version=COALESCE(s.version,k.version) JOIN comercio_altas_pendientes z ON z.id=k.alta AND z.empresa=k.empresa JOIN empresas e ON e.id=k.empresa JOIN membresias m ON m.empresa=e.id JOIN usuarios u ON u.id=m.usuario WHERE k.empresa=? AND m.usuario=? AND e.activa=1 AND u.activo=1 AND m.activa=1 AND m.alcance='empresa' AND EXISTS(SELECT 1 FROM rol_permisos rp WHERE rp.empresa=m.empresa AND rp.rol=m.rol AND rp.permiso='empresa.ver') AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=m.empresa AND d.usuario=m.usuario AND d.permiso='empresa.ver') AND z.estado='aceptada'").bind(empresa,a.actor).first();
  if(!x)throw Error("Contrato no disponible.");
  return {empresa,plan:x.plan,version:x.version,...resolverCompatibilidad({giro:x.giro,contratados:JSON.parse(x.modulos),operativos:disponibilidad})};
 }});
}
