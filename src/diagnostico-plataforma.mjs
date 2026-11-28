// Internal diagnostics, no HTTP route. Never return raw errors or customer data.
const checks=Object.freeze({
 DB:[["esquema_original","SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('pedidos_demo','cobros_pedido','historial_cobros')",3]],
 DEMO_DB:[["identidad_demo","SELECT count(*) AS n FROM demo_identidad WHERE clave='lapaz-demo-practica'",1],["esquema_demo","SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('demo_sesiones','demo_catalogos','demo_terminal_resoluciones')",3]],
 COMMERCE_DB:[["identidad_comercial","SELECT count(*) AS n FROM comercio_identidad WHERE clave='lapaz-comercios-v1'",1],["esquema_comercial","SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('central_operadores','comercial_suscripciones','comercio_movimientos_financieros','central_anulaciones_pago')",4],["reversiones_inconsistentes","SELECT count(*) AS n FROM comercio_movimientos_financieros r LEFT JOIN comercio_movimientos_financieros p ON p.empresa=r.empresa AND p.id=r.original WHERE r.tipo='reversion' AND (p.id IS NULL OR p.tipo<>'venta' OR p.sucursal<>r.sucursal OR p.importe<>r.importe OR p.metodo<>r.metodo)",0],["auditoria_financiera_faltante","SELECT count(*) AS n FROM comercio_movimientos_financieros m WHERE NOT EXISTS(SELECT 1 FROM comercio_auditoria a WHERE a.empresa=m.empresa AND a.actor=m.actor AND a.accion='finanzas.'||m.tipo AND a.objetivo=m.id AND a.fecha=m.fecha)",0]],
 PROVIDER_DB:[["identidad_proveedor","SELECT count(*) AS n FROM proveedor_identidad WHERE clave='lapaz-proveedores-v1'",1],["esquema_proveedor","SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('proveedor_credenciales','proveedor_eventos','proveedor_oauth_estado')",3]]
});
export function incidenteSeguro(servicio){const tipo=["api_original","api_demo"].includes(servicio)?servicio:"interno";return {id:crypto.randomUUID(),servicio:tipo,codigo:"ERROR_INTERNO",gravedad:"alta"};}
export async function diagnosticarPlataforma(env,{habilitado=false,requeridos=["DB","DEMO_DB","COMMERCE_DB","PROVIDER_DB"]}={}){
 if(habilitado!==true)throw Error("Diagnóstico deshabilitado.");
 const nombres=Object.keys(checks);if(!Array.isArray(requeridos)||requeridos.some(x=>!nombres.includes(x)))throw Error("Configuración inválida.");
 const resultados=[];
 for(const base of nombres){
  const db=env[base],agregar=(codigo,estado,gravedad)=>resultados.push({base,codigo,estado,gravedad});
  if(!db){agregar("binding_ausente","no_configurado",requeridos.includes(base)?"alta":"informativa");continue;}
  if(nombres.some(k=>k!==base&&env[k]===db)){agregar("binding_compartido","error","critica");continue;}
  let identidad=true;
  for(const [codigo,sql,esperado] of checks[base]){
   if(!identidad)break;
   try{const r=await db.prepare(sql).first();const ok=r?.n===esperado;agregar(codigo,ok?"correcto":"error",ok?"informativa":codigo.startsWith("identidad")?"critica":"alta");if(!ok&&(codigo.startsWith("identidad")||codigo.startsWith("esquema")))identidad=false;}
   catch{agregar(codigo,"error","alta");identidad=false;}
  }
 }
 return {estado:resultados.some(x=>["critica","alta"].includes(x.gravedad))?"requiere_atencion":"correcto",resultados};
}
