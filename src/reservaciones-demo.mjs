import {admiteMesas,validarReserva,transicionesReserva} from "../public/demostraciones/mesas-practica.mjs";
import {seleccionCita} from "../public/demostraciones/clientes-practica.mjs";
import {leerJsonLimitado} from "./seguridad.mjs";
const ahora=()=>Math.floor(Date.now()/1000);
const jsonError=(json,error,status)=>json({error},status);
export async function reservasListas(db){try{return (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='demo_reservaciones'").first())?.name==="demo_reservaciones";}catch{return false;}}
export async function atenderReservasDemo(request,db,s,ctx,json){
 if(!admiteMesas(ctx.establecimiento.id,ctx.plan.id))return jsonError(json,"Reservaciones no incluidas.",403);
 if(!await reservasListas(db))return jsonError(json,"Tabla de reservaciones pendiente.",503);
 const buscar=id=>db.prepare("SELECT huella,estado,datos_json FROM demo_reservaciones WHERE sesion_id=? AND solicitud_id=?").bind(s.id,id).first();
 if(request.method==="GET"){const f=await db.prepare("SELECT datos_json FROM demo_reservaciones WHERE sesion_id=? AND EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) ORDER BY fecha,inicio,mesa LIMIT 60").bind(s.id,s.id,ahora()).all();return json({reservas:f.results.map(x=>JSON.parse(x.datos_json)),expira:s.expira});}
 const d=await leerJsonLimitado(request,4000);
 if(typeof d?.solicitud!=="string"||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(d.solicitud))return jsonError(json,"Solicitud inválida.",400);
 if(request.method==="POST"){
  let seleccion;try{seleccion=seleccionCita(d.datosCliente);}catch(e){return jsonError(json,e.message,400);}
  const huella=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify({fecha:d.fecha,personas:d.personas,mesa:d.mesa,inicio:d.inicio,seleccion})))),b=>b.toString(16).padStart(2,"0")).join("");
  const previo=await buscar(d.solicitud);if(previo)return previo.huella===huella?json({reserva:JSON.parse(previo.datos_json),repetida:true}):jsonError(json,"Solicitud ya utilizada.",409);
  let v;try{v=validarReserva(d);}catch(e){return jsonError(json,e.message,409);}
  const {seleccion:_,...datos}=v,reserva={...datos,solicitud:d.solicitud,estado:"pendiente"};
  const f=await db.prepare("INSERT INTO demo_reservaciones(sesion_id,solicitud_id,huella,mesa,fecha,inicio,fin,estado,datos_json) SELECT ?,?,?,?,?,?,?,'pendiente',? WHERE EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) AND (SELECT count(*) FROM demo_reservaciones WHERE sesion_id=?)<60 AND NOT EXISTS(SELECT 1 FROM demo_reservaciones WHERE sesion_id=? AND mesa=? AND fecha=? AND estado NOT IN ('cancelada','no_asistio') AND inicio<? AND fin>?) ON CONFLICT(sesion_id,solicitud_id) DO NOTHING RETURNING datos_json").bind(s.id,d.solicitud,huella,v.mesa,v.fecha,v.inicio,v.fin,JSON.stringify(reserva),s.id,ahora(),s.id,s.id,v.mesa,v.fecha,v.fin,v.inicio).first();
  if(f)return json({reserva:JSON.parse(f.datos_json)},201);
  const repetida=await buscar(d.solicitud);if(repetida&&repetida.huella===huella)return json({reserva:JSON.parse(repetida.datos_json),repetida:true});
  return jsonError(json,"Mesa ocupada, sesión caducada o límite alcanzado.",409);
 }
 const f=await buscar(d.solicitud);if(!f)return jsonError(json,"Reservación no encontrada.",404);
 if(f.estado!==d.esperado||!transicionesReserva(f.estado).includes(d.destino))return jsonError(json,"Estado actualizado o transición inválida.",409);
 const reserva=JSON.parse(f.datos_json);reserva.estado=d.destino;
 const actual=await db.prepare("UPDATE demo_reservaciones SET estado=?,datos_json=? WHERE sesion_id=? AND solicitud_id=? AND estado=? AND EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) RETURNING datos_json").bind(d.destino,JSON.stringify(reserva),s.id,d.solicitud,d.esperado,s.id,ahora()).first();
 return actual?json({reserva:JSON.parse(actual.datos_json)}):jsonError(json,"La reservación cambió.",409);
}
