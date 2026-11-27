import {admiteCuentas,validarApertura,cuentaIdValida} from "../public/demostraciones/cuentas-practica.mjs";
import {leerJsonLimitado} from "./seguridad.mjs";
const segundos=()=>Math.floor(Date.now()/1000);
const err=(json,error,status)=>json({error},status);
export async function cuentasListas(db){try{return (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='demo_cuentas'").first())?.name==="demo_cuentas";}catch{return false;}}
export async function atenderCuentasDemo(request,db,s,ctx,json){
 if(!admiteCuentas(ctx.establecimiento.id,ctx.plan.id))return err(json,"Cuentas no incluidas.",403);
 if(!await cuentasListas(db)||!(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='demo_pedidos'").first()))return err(json,"Falta configurar las cuentas de práctica.",503);
 const buscar=id=>db.prepare("SELECT cuenta_id,mesa,personas,abierto,cerrado FROM demo_cuentas WHERE sesion_id=? AND cuenta_id=?").bind(s.id,id).first();
 if(request.method==="GET"){
  const cuentas=await db.prepare("SELECT cuenta_id,mesa,personas,abierto,cerrado FROM demo_cuentas WHERE sesion_id=? AND EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) ORDER BY abierto DESC,cuenta_id LIMIT 30").bind(s.id,s.id,segundos()).all();
  return json({cuentas:cuentas.results,expira:s.expira});
 }
 const d=await leerJsonLimitado(request,2000);
 if(!cuentaIdValida(d?.cuenta))return err(json,"Cuenta inválida.",400);
 if(request.method==="POST"){
  try{validarApertura(d);}catch(e){return err(json,e.message,400);}
  const previa=await buscar(d.cuenta);if(previa)return previa.mesa===d.mesa&&previa.personas===d.personas?json({cuenta:previa,repetida:true}):err(json,"Identificador utilizado.",409);
  const fila=await db.prepare("INSERT INTO demo_cuentas(sesion_id,cuenta_id,mesa,personas,abierto) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) AND (SELECT count(*) FROM demo_cuentas WHERE sesion_id=?)<30 ON CONFLICT DO NOTHING RETURNING cuenta_id,mesa,personas,abierto,cerrado").bind(s.id,d.cuenta,d.mesa,d.personas,Date.now(),s.id,segundos(),s.id).first();
  if(fila)return json({cuenta:fila},201);
  const repetida=await buscar(d.cuenta);if(repetida&&repetida.mesa===d.mesa&&repetida.personas===d.personas)return json({cuenta:repetida,repetida:true});
  return err(json,"La mesa ya está ocupada, sesión caducada o límite alcanzado.",409);
 }
 if(d.accion!=="cerrar")return err(json,"Acción inválida.",400);
 const previa=await buscar(d.cuenta);if(!previa)return err(json,"Cuenta no encontrada.",404);if(previa.cerrado!==null)return json({cuenta:previa,repetida:true});
 // Cierre atómico: no puede competir con una nueva comanda ni con cambios de pago.
 const fila=await db.prepare("UPDATE demo_cuentas SET cerrado=? WHERE sesion_id=? AND cuenta_id=? AND cerrado IS NULL AND EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) AND NOT EXISTS(SELECT 1 FROM demo_pedidos p WHERE p.sesion_id=demo_cuentas.sesion_id AND p.establecimiento_id='taqueria-el-comal' AND json_extract(p.datos_json,'$.cuenta')=demo_cuentas.cuenta_id AND p.estado<>'cancelado' AND (p.estado<>'entregado' OR (json_extract(p.datos_json,'$.total')>0 AND COALESCE(json_extract(p.datos_json,'$.cobro.importeCentavos'),-1)<>json_extract(p.datos_json,'$.total')))) RETURNING cuenta_id,mesa,personas,abierto,cerrado").bind(Date.now(),s.id,d.cuenta,s.id,segundos()).first();
 return fila?json({cuenta:fila}):err(json,"Hay comandas pendientes de entrega o pago, o la sesión caducó.",409);
}
