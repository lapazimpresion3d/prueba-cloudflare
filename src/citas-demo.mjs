import {datosCitaDemo,seleccionCita} from "../public/demostraciones/clientes-practica.mjs";
import {admiteCitas,horariosCita,serviciosCita,transicionesCita} from "../public/demostraciones/citas-practica.mjs";
import {leerJsonLimitado} from "./seguridad.mjs";
const error=(json,m,status)=>json({error:m},status);
const ahora=()=>Math.floor(Date.now()/1000);
const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const huella=async x=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(x)))),b=>b.toString(16).padStart(2,"0")).join("");
const leer=f=>JSON.parse(f.datos_json);
export async function citasListas(db){
 try{return (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='demo_citas'").first())?.name==="demo_citas";}catch{return false;}
}
export async function atenderCitasDemo(request,db,s,ctx,json){
 const id=ctx.establecimiento.id;
 if(!admiteCitas(id,ctx.plan.id))return error(json,"Citas no incluidas en este plan o giro.",403);
 if(!await citasListas(db))return error(json,"Agenda en servidor pendiente de configuración.",503);
 const buscar=solicitud=>db.prepare("SELECT huella,estado,datos_json FROM demo_citas WHERE sesion_id=? AND establecimiento_id=? AND solicitud_id=?").bind(s.id,id,solicitud).first();
 if(request.method==="GET"){
  const filas=await db.prepare("SELECT datos_json FROM demo_citas WHERE sesion_id=? AND establecimiento_id=? AND EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) ORDER BY fecha,inicio,recurso LIMIT 60").bind(s.id,id,s.id,ahora()).all();
  return json({establecimiento:id,citas:filas.results.map(leer),expira:s.expira});
 }
 const d=await leerJsonLimitado(request,4000);
 if(!uuid(d?.solicitud))return error(json,"Identificador inválido.",400);
 if(request.method==="POST"){
  if(!["original","personalizado"].includes(d.catalogo)||typeof d.servicio!=="string"||d.servicio.length>80||typeof d.recurso!=="string"||d.recurso.length>80||typeof d.fecha!=="string"||d.fecha.length!==10||!Number.isInteger(d.inicio)||!Number.isSafeInteger(d.precioEsperado)||!Number.isInteger(d.duracionEsperada))return error(json,"Solicitud inválida.",400);
  let seleccion,cliente;try{if(d.datosCliente!==undefined){seleccion=seleccionCita(d.datosCliente);cliente=datosCitaDemo(seleccion);}}catch(e){return error(json,e.message,400);}
  const firma=await huella({...(seleccion?{datosCliente:seleccion}:{}),catalogo:d.catalogo,servicio:d.servicio,recurso:d.recurso,fecha:d.fecha,inicio:d.inicio,precioEsperado:d.precioEsperado,duracionEsperada:d.duracionEsperada});
  const previo=await buscar(d.solicitud);
  if(previo)return previo.huella===firma?json({cita:leer(previo),repetida:true}):error(json,"Solicitud ya utilizada.",409);
  let catalogo=ctx.establecimiento.catalogo,revision=0;
  if(d.catalogo==="personalizado"){
   const fila=await db.prepare("SELECT revision,datos_json FROM demo_catalogos WHERE sesion_id=? AND establecimiento_id=?").bind(s.id,id).first();
   if(!fila)return error(json,"Guarda primero el catálogo personalizado en servidor.",409);
   catalogo=JSON.parse(fila.datos_json);revision=fila.revision;
  }
  const p=serviciosCita(catalogo).find(x=>x.id===d.servicio);
  if(!p||p.precioCentavos!==d.precioEsperado||p.duracionMinutos!==d.duracionEsperada)return error(json,"El servicio cambió. Revisa el catálogo guardado.",409);
  const slot=horariosCita(id,catalogo,[],d).find(h=>h.inicio===d.inicio);
  if(!slot)return error(json,"Horario no disponible.",409);
  const cita={...(cliente?{datosCliente:cliente}:{}),folio:"CITA-"+d.solicitud,solicitud:d.solicitud,servicio:p.id,nombreServicio:p.nombre,precioCentavos:p.precioCentavos,recurso:d.recurso,fecha:d.fecha,...slot,estado:"pendiente",historial:[{estado:"pendiente",fecha:Date.now()}]};
  // Un único INSERT comprueba sesión, límite, revisión e intervalos concurrentes.
  const fila=await db.prepare("INSERT INTO demo_citas (sesion_id,establecimiento_id,solicitud_id,huella,recurso,fecha,inicio,fin,estado,datos_json) SELECT ?,?,?,?,?,?,?,?,'pendiente',? WHERE EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) AND (SELECT count(*) FROM demo_citas WHERE sesion_id=? AND establecimiento_id=?)<60 AND (?=0 OR EXISTS (SELECT 1 FROM demo_catalogos WHERE sesion_id=? AND establecimiento_id=? AND revision=?)) AND NOT EXISTS (SELECT 1 FROM demo_citas WHERE sesion_id=? AND establecimiento_id=? AND recurso=? AND fecha=? AND estado<>'cancelada' AND inicio<? AND fin>?) ON CONFLICT(sesion_id,establecimiento_id,solicitud_id) DO NOTHING RETURNING datos_json").bind(s.id,id,d.solicitud,firma,d.recurso,d.fecha,slot.inicio,slot.fin,JSON.stringify(cita),s.id,ahora(),s.id,id,revision,s.id,id,revision,s.id,id,d.recurso,d.fecha,slot.fin,slot.inicio).first();
  if(fila)return json({cita:leer(fila),repetida:false},201);
  const repetida=await buscar(d.solicitud);
  if(repetida)return repetida.huella===firma?json({cita:leer(repetida),repetida:true}):error(json,"Solicitud ya utilizada.",409);
  return error(json,"Horario ocupado, catálogo actualizado, límite alcanzado o sesión caducada. Actualiza la agenda.",409);
 }
 const fila=await buscar(d.solicitud);
 if(!fila)return error(json,"Cita no encontrada.",404);
 if(fila.estado!==d.esperado||!transicionesCita(fila.estado).includes(d.destino))return error(json,"Estado actualizado o transición no permitida.",409);
 const c=leer(fila);c.estado=d.destino;c.historial.push({estado:c.estado,fecha:Date.now()});
 const resultado=await db.prepare("UPDATE demo_citas SET estado=?,datos_json=? WHERE sesion_id=? AND establecimiento_id=? AND solicitud_id=? AND estado=? AND EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) RETURNING datos_json").bind(c.estado,JSON.stringify(c),s.id,id,d.solicitud,d.esperado,s.id,ahora()).first();
 return resultado?json({cita:leer(resultado)}):error(json,"La cita cambió. Actualiza la agenda.",409);
}
