import {hashSesionComercial} from "./sesiones-comerciales.mjs";
import {validarHorario,compilarHorario} from "./horarios-comerciales.mjs";
const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
const rev=x=>Number.isSafeInteger(x)&&x>=0&&x<Number.MAX_SAFE_INTEGER;
const lista=(x,max)=>Array.isArray(x)&&x.length<=max&&new Set(x).size===x.length&&x.every(id);
const claves=(d,k)=>Object.keys(d).every(x=>k.includes(x));
const tipos=["sillon","estacion","consultorio","espacio","equipo","otro"];
const semanaVacia=()=>[[],[],[],[],[],[],[]];
const dia=f=>(new Date(f+"T00:00:00Z").getUTCDay()+6)%7;
const anterior=f=>new Date(Date.parse(f+"T00:00:00Z")-86400000).toISOString().slice(0,10);
function tramos(h,f,i,excepciones){
 if(excepciones&&Object.hasOwn(h.excepciones_horario,f))return h.excepciones_horario[f];
 const a=h.horario_semanal[i].map(([s,t])=>[s,Math.min(t,1440)]);
 if(!excepciones||!Object.hasOwn(h.excepciones_horario,anterior(f)))for(const [s,t] of h.horario_semanal[(i+6)%7])if(t>1440)a.push([0,t-1440]);
 return a;
}
// All employee schedules share one civil timezone: cross-zone schedules are rejected,
// avoiding ambiguous overlaps across DST and zone changes. Exceptions replace civil days.
export function validarTurnos(x){
 if(!x||typeof x!=="object"||Array.isArray(x)||!claves(x,["zona_horaria","sucursales","ausencias"])||!Array.isArray(x.sucursales)||x.sucursales.length>20)throw Error("Turnos inválidos.");
 const z=validarHorario({zona_horaria:x.zona_horaria,horario_semanal:semanaVacia(),excepciones_horario:{}}).zona_horaria;
 const ids=x.sucursales.map(v=>v?.sucursal);if(!lista(ids,20))throw Error("Turnos inválidos.");
 const sucursales=x.sucursales.map(v=>{
  if(!claves(v,["sucursal","horario_semanal","excepciones_horario"]))throw Error("Turnos inválidos.");
  return {sucursal:v.sucursal,...validarHorario({...v,zona_horaria:z})};
 });
 const ausencias=x.ausencias??[];
 if(!Array.isArray(ausencias)||ausencias.length>366||new Set(ausencias).size!==ausencias.length)throw Error("Ausencias inválidas.");
 validarHorario({zona_horaria:z,horario_semanal:semanaVacia(),excepciones_horario:Object.fromEntries(ausencias.map(f=>[f,[]]))});
 if(ausencias.some(f=>typeof f!=="string"))throw Error("Ausencias inválidas.");
 const comprobar=(f,i,ex)=>{
  const a=sucursales.flatMap(h=>tramos(h,f,i,ex).map(([s,t])=>[s,t,h.sucursal])).sort((a,b)=>a[0]-b[0]);
  let fin=-1;for(const [s,t] of a){if(s<fin)throw Error("Turnos simultáneos.");fin=t;}
 };
 for(let i=0;i<7;i++)comprobar("2026-01-01",i,false);
 const fechas=new Set(sucursales.flatMap(h=>Object.keys(h.excepciones_horario)));
 for(const f of [...fechas])fechas.add(new Date(Date.parse(f+"T00:00:00Z")+86400000).toISOString().slice(0,10));
 for(const f of fechas)comprobar(f,dia(f),true);
 return {zona_horaria:z,sucursales:sucursales.map(({zona_horaria,...v})=>v),ausencias:[...ausencias].sort()};
}
export function evaluarDisponibilidad({turnos,sucursal,comercial,recurso=null,inicio,fin}){
 if(!Number.isSafeInteger(inicio)||!Number.isSafeInteger(fin)||inicio%60000!==0||fin%60000!==0||fin<=inicio||fin-inicio>86400000)throw Error("Intervalo inválido.");
 const x=validarTurnos(turnos),s=x.sucursales.find(v=>v.sucursal===sucursal);if(!s)return false;
 const laboral=compilarHorario({...s,zona_horaria:x.zona_horaria}),abierto=compilarHorario(comercial),r=recurso?compilarHorario(recurso):()=>true;
 const fmt=new Intl.DateTimeFormat("en-CA",{timeZone:x.zona_horaria,year:"numeric",month:"2-digit",day:"2-digit"});
 const aus=new Set(x.ausencias);
 for(let t=inicio;t<fin;t+=60000){const p=Object.fromEntries(fmt.formatToParts(t).map(v=>[v.type,v.value]));if(aus.has(p.year+"-"+p.month+"-"+p.day)||!laboral(t)||!abierto(t)||!r(t))return false;}
 return true;
}
export async function crearDisponibilidadLaboral(env,{habilitado=false,autorizarComercial,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db)||typeof autorizarComercial!=="function")throw Error("Disponibilidad no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(s,...a)=>db.prepare(s).bind(...a);
 const guard="EXISTS(SELECT 1 FROM empresas e JOIN membresias m ON m.empresa=e.id JOIN usuarios u ON u.id=m.usuario JOIN comercio_sesiones cs ON cs.usuario=u.id JOIN comercio_altas_pendientes z ON z.empresa=e.id JOIN comercio_altas_prospecto v ON v.alta=z.id JOIN comercio_invitaciones_propietario j ON j.alta=z.id JOIN central_implementaciones c ON c.empresa=e.id WHERE e.id=? AND m.usuario=? AND cs.hash=? AND NOT EXISTS(SELECT 1 FROM comercio_acceso_corte ac WHERE ac.empresa=m.empresa AND ac.usuario=m.usuario AND cs.creado<=ac.desde) AND cs.revocado IS NULL AND cs.expira>? AND cs.ultima>? AND e.activa=1 AND m.activa=1 AND u.activo=1 AND m.rol='propietario' AND m.alcance='empresa' AND z.estado='aceptada' AND j.consumido IS NOT NULL AND c.estado IN ('pendiente','configuracion','revision') AND EXISTS(SELECT 1 FROM rol_permisos p WHERE p.empresa=e.id AND p.rol=m.rol AND p.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM membresia_permisos_denegados d WHERE d.empresa=e.id AND d.usuario=m.usuario AND d.permiso='usuarios.administrar') AND NOT EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=e.id AND s.estado IN ('suspendida','cancelada')))";
 async function contexto(r,e,metodo){
  if(habilitado!==true||!id(e)||r.method!==metodo||new URL(r.url).protocol!=="https:"||metodo==="POST"&&r.headers.get("Origin")!==new URL(r.url).origin)throw Error("Disponibilidad no permitida.");
  const a=await autorizarComercial(r,{empresa:e,permiso:"usuarios.administrar"}),h=await hashSesionComercial(r),n=reloj();
  if(a?.empresa!==e||!id(a.actor)||!h||!Number.isSafeInteger(n)||n<0)throw Error("Disponibilidad no permitida.");
  return {actor:a.actor,n,args:[e,a.actor,h,n,n-1800000]};
 }
 const log=(e,a,accion,k)=>q("INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) SELECT ?,?,?,?,? WHERE changes()=1",e,a.actor,accion,k,a.n);
 async function ejecutar(stm){const res=await db.batch(stm);if(!res[0].results?.length)throw Error("Conflicto de revisión o autorización.");return res[0].results[0];}
 return Object.freeze({
 async guardarTurnos(r,d){
  const a=await contexto(r,d?.empresa,"POST");
  if(!id(d.empleado)||!rev(d.revision)||!claves(d,["empresa","empleado","revision","turnos"]))throw Error("Turnos inválidos.");
  const t=validarTurnos(d.turnos),json=JSON.stringify(t),s=JSON.stringify(t.sucursales.map(v=>v.sucursal));
  if(json.length>120000)throw Error("Turnos inválidos.");
  return ejecutar([q("INSERT INTO comercio_turnos_laborales(empresa,empleado,revision,turnos,actor,fecha) SELECT ?,?,?,?,?,? WHERE "+guard+" AND EXISTS(SELECT 1 FROM comercio_empleados WHERE empresa=? AND id=? AND activo=1) AND (SELECT COALESCE(MAX(revision),0) FROM comercio_turnos_laborales WHERE empresa=? AND empleado=?)=? AND NOT EXISTS(SELECT 1 FROM json_each(?) j WHERE NOT EXISTS(SELECT 1 FROM sucursales b JOIN comercio_asignaciones_personal l ON l.empresa=b.empresa WHERE b.empresa=? AND b.id=j.value AND b.activa=1 AND l.empleado=? AND l.revision=(SELECT MAX(revision) FROM comercio_asignaciones_personal WHERE empresa=l.empresa AND empleado=l.empleado) AND EXISTS(SELECT 1 FROM json_each(l.sucursales) WHERE value=b.id))) RETURNING revision",d.empresa,d.empleado,d.revision+1,json,a.actor,a.n,...a.args,d.empresa,d.empleado,d.empresa,d.empleado,d.revision,s,d.empresa,d.empleado),log(d.empresa,a,"personal.turnos_guardados",d.empleado)]);
 },
 async guardarRecurso(r,d){
  const a=await contexto(r,d?.empresa,"POST"),nuevo=d.id===undefined;
  if(!rev(d.revision)||nuevo&&d.revision!==0||!nuevo&&(!id(d.id)||d.revision===0)||!id(d.sucursal)||typeof d.codigo!=="string"||!/^[A-Za-z0-9_-]{1,40}$/.test(d.codigo)||typeof d.nombre!=="string"||!d.nombre.trim()||d.nombre.trim().length>120||/[\u0000-\u001f\u007f]/u.test(d.nombre)||!tipos.includes(d.tipo)||![0,1].includes(d.activo)||!lista(d.servicios,100)||!Object.hasOwn(d,"horario")||!claves(d,["empresa","id","revision","sucursal","codigo","nombre","tipo","activo","horario","servicios"]))throw Error("Recurso inválido.");
  const k=nuevo?crypto.randomUUID():d.id,h=d.horario===null?null:JSON.stringify(validarHorario(d.horario)),s=JSON.stringify([...d.servicios].sort());
  const filtro=" AND EXISTS(SELECT 1 FROM sucursales WHERE empresa=? AND id=? AND (activa=1 OR ?=0)) AND NOT EXISTS(SELECT 1 FROM json_each(?) j WHERE NOT EXISTS(SELECT 1 FROM comercio_servicios_personal WHERE empresa=? AND id=j.value AND (activo=1 OR ?=0)))",v=[d.empresa,d.sucursal,d.activo,s,d.empresa,d.activo];
  const stmt=nuevo?q("INSERT INTO comercio_recursos_laborales(empresa,id,sucursal,codigo,nombre,tipo,activo,revision,horario,servicios) SELECT ?,?,?,?,?,?,?,1,?,? WHERE "+guard+filtro+" RETURNING id,revision",d.empresa,k,d.sucursal,d.codigo.toUpperCase(),d.nombre.trim(),d.tipo,d.activo,h,s,...a.args,...v):q("UPDATE comercio_recursos_laborales SET codigo=?,nombre=?,tipo=?,activo=?,horario=?,servicios=?,revision=revision+1 WHERE empresa=? AND id=? AND sucursal=? AND revision=? AND "+guard+filtro+" RETURNING id,revision",d.codigo.toUpperCase(),d.nombre.trim(),d.tipo,d.activo,h,s,d.empresa,k,d.sucursal,d.revision,...a.args,...v);
  return ejecutar([stmt,log(d.empresa,a,"personal.recurso_guardado",k)]);
 },
 async consultarTurnos(r,{empresa,empleado}={}){
  const a=await contexto(r,empresa,"GET");if(!id(empleado)||!await q("SELECT id FROM comercio_empleados WHERE empresa=? AND id=? AND "+guard,empresa,empleado,...a.args).first())throw Error("Empleado no disponible.");
  const x=await q("SELECT revision,turnos FROM comercio_turnos_laborales WHERE empresa=? AND empleado=? AND "+guard+" ORDER BY revision DESC LIMIT 1",empresa,empleado,...a.args).first();
  return x?{revision:x.revision,turnos:JSON.parse(x.turnos)}:{revision:0,turnos:null};
 },
 async listarRecursos(r,{empresa,sucursal,despues=""}={}){
  const a=await contexto(r,empresa,"GET");if(!id(sucursal)||typeof despues!=="string"||despues.length>128||!await q("SELECT id FROM sucursales WHERE empresa=? AND id=? AND "+guard,empresa,sucursal,...a.args).first())throw Error("Sucursal no disponible.");
  const x=(await q("SELECT id,codigo,nombre,tipo,activo,revision,horario,servicios FROM comercio_recursos_laborales WHERE empresa=? AND sucursal=? AND id>? AND "+guard+" ORDER BY id LIMIT 51",empresa,sucursal,despues,...a.args).all()).results;
  return {recursos:x.slice(0,50).map(v=>({...v,horario:v.horario?JSON.parse(v.horario):null,servicios:JSON.parse(v.servicios)})),siguiente:x.length>50?x[49].id:null};
 },
 async disponibilidad(r,{empresa,empleado,sucursal,servicio,recurso=null,inicio,fin}={}){
  const a=await contexto(r,empresa,"GET");
  if(![empleado,sucursal,servicio].every(id)||!(recurso===null||id(recurso))||!Number.isSafeInteger(inicio)||!Number.isSafeInteger(fin)||inicio%60000||fin%60000||fin<=inicio||fin-inicio>86400000)throw Error("Consulta inválida.");
  // Single statement snapshot; absence is indistinguishable from unavailable.
  const x=await q("SELECT t.turnos,b.horario AS horario_sucursal,p.zona_horaria,p.horario_semanal,p.excepciones_horario,r.horario AS horario_recurso FROM comercio_empleados e JOIN sucursales b ON b.empresa=e.empresa JOIN comercio_perfiles_privados p ON p.empresa=e.empresa JOIN comercio_servicios_personal s ON s.empresa=e.empresa JOIN comercio_asignaciones_personal l ON l.empresa=e.empresa AND l.empleado=e.id JOIN comercio_turnos_laborales t ON t.empresa=e.empresa AND t.empleado=e.id LEFT JOIN comercio_recursos_laborales r ON r.empresa=e.empresa AND r.sucursal=b.id AND r.id=? AND r.activo=1 WHERE e.empresa=? AND e.id=? AND e.activo=1 AND b.id=? AND b.activa=1 AND s.id=? AND s.activo=1 AND l.revision=(SELECT MAX(revision) FROM comercio_asignaciones_personal WHERE empresa=e.empresa AND empleado=e.id) AND t.revision=(SELECT MAX(revision) FROM comercio_turnos_laborales WHERE empresa=e.empresa AND empleado=e.id) AND EXISTS(SELECT 1 FROM json_each(l.sucursales) WHERE value=b.id) AND EXISTS(SELECT 1 FROM json_each(l.servicios) WHERE value=s.id) AND (? IS NULL OR (r.id IS NOT NULL AND EXISTS(SELECT 1 FROM json_each(r.servicios) WHERE value=s.id))) AND "+guard,recurso,empresa,empleado,sucursal,servicio,recurso,...a.args).first();
  if(!x)return {disponible:false};
  const comercial=x.horario_sucursal?JSON.parse(x.horario_sucursal):{zona_horaria:x.zona_horaria,horario_semanal:JSON.parse(x.horario_semanal),excepciones_horario:JSON.parse(x.excepciones_horario)};
  const turnos=JSON.parse(x.turnos);
  // Fail closed if branch time zone differs from the common labor zone.
  if(validarHorario(comercial).zona_horaria!==turnos.zona_horaria)return {disponible:false};
  return {disponible:evaluarDisponibilidad({turnos,sucursal,comercial,recurso:x.horario_recurso?JSON.parse(x.horario_recurso):null,inicio,fin})};
 }
 });
}
