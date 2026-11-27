// Adaptador D1 aislado. No habilitar en rutas públicas hasta conciliar el cierre
// y los cobros anteriores. No procesa dinero ni modifica demo_pedidos.
import {crearPlanCobro,agregarMovimiento,resumenPlanCobro} from "../public/demostraciones/pagos-multiples.mjs";
import {cuentaIdValida} from "../public/demostraciones/cuentas-practica.mjs";
const ahora=()=>Math.floor(Date.now()/1000);
export async function pagosMultiplesListos(db){
 try{return (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='demo_planes_cobro'").first())?.name==="demo_planes_cobro";}catch{return false;}
}
async function contexto(db,s,id){
 if(!cuentaIdValida(id))throw Error("Cuenta inválida.");
 const c=await db.prepare("SELECT cuenta_id FROM demo_cuentas WHERE sesion_id=? AND cuenta_id=? AND cerrado IS NULL AND EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?)").bind(s.id,id,s.id,ahora()).first();
 if(!c)throw Error("Cuenta no disponible.");
 const filas=(await db.prepare("SELECT solicitud_id,datos_json FROM demo_pedidos WHERE sesion_id=? AND establecimiento_id='taqueria-el-comal' AND json_extract(datos_json,'$.cuenta')=? ORDER BY solicitud_id").bind(s.id,id).all()).results;
 const pedidos=filas.map(f=>JSON.parse(f.datos_json));
 if(pedidos.some(p=>p.cobro||!['entregado','cancelado'].includes(p.estado)))throw Error("La cuenta tiene cobros anteriores o comandas pendientes.");
 const total=pedidos.filter(p=>p.estado!=="cancelado").reduce((n,p)=>n+p.total,0);
 const fila=await db.prepare("SELECT revision,datos_json FROM demo_planes_cobro WHERE sesion_id=? AND cuenta_id=?").bind(s.id,id).first();
 const plan=fila?JSON.parse(fila.datos_json):crearPlanCobro(total);
 if(plan.consumoCentavos!==total)throw Error("El consumo cambió; requiere conciliación.");
 return {plan,filas};
}
export async function leerPlanCobro(db,s,id){
 const {plan}=await contexto(db,s,id);
 return {plan,resumen:resumenPlanCobro(plan)};
}
export async function guardarMovimiento(db,s,id,d){
 const {plan,filas}=await contexto(db,s,id);
 const nuevo=agregarMovimiento(plan,d);
 if(nuevo===plan)return {plan,resumen:resumenPlanCobro(plan),repetido:true};
 // Compare-and-swap de revisión y fotografía exacta de comandas en una sola sentencia.
 const sql=`INSERT INTO demo_planes_cobro(sesion_id,cuenta_id,revision,datos_json)
 SELECT ?,?,?,? WHERE
 EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?)
 AND EXISTS(SELECT 1 FROM demo_cuentas WHERE sesion_id=? AND cuenta_id=? AND cerrado IS NULL)
 AND (SELECT count(*) FROM demo_pedidos WHERE sesion_id=? AND establecimiento_id='taqueria-el-comal' AND json_extract(datos_json,'$.cuenta')=?)=?
 AND NOT EXISTS(SELECT 1 FROM json_each(?) j WHERE NOT EXISTS(
 SELECT 1 FROM demo_pedidos p WHERE p.sesion_id=? AND p.establecimiento_id='taqueria-el-comal'
 AND p.solicitud_id=json_extract(j.value,'$.solicitud_id') AND p.datos_json=json_extract(j.value,'$.datos_json')))
 AND COALESCE((SELECT revision FROM demo_planes_cobro WHERE sesion_id=? AND cuenta_id=?),0)=?
 ON CONFLICT(sesion_id,cuenta_id) DO UPDATE SET revision=excluded.revision,datos_json=excluded.datos_json
 WHERE demo_planes_cobro.revision=? RETURNING revision`;
 const f=await db.prepare(sql).bind(s.id,id,nuevo.revision,JSON.stringify(nuevo),s.id,ahora(),s.id,id,s.id,id,filas.length,JSON.stringify(filas),s.id,s.id,id,plan.revision,plan.revision).first();
 if(!f)throw Error("La cuenta cambió o expiró. Actualiza antes de reintentar.");
 return {plan:nuevo,resumen:resumenPlanCobro(nuevo)};
}
