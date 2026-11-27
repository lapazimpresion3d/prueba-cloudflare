// Gestor D1 de práctica. No usa API bancaria ni registra abonos por sí mismo.
const ahora=()=>Math.floor(Date.now()/1000);
const identificador=x=>typeof x==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(x);
export async function terminalesListas(db){
 const r=await db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name IN ('demo_terminales','demo_terminal_operaciones','demo_terminal_ocupada','demo_terminal_cuenta_pendiente','demo_terminal_estado_final','demo_terminal_conectada')").first();
 return r?.n===6;
}
export async function listarTerminales(db,s){
 const terminales=(await db.prepare("SELECT t.terminal_id,t.nombre,t.proveedor,t.conectada,CASE WHEN EXISTS(SELECT 1 FROM demo_terminal_operaciones o WHERE o.sesion_id=t.sesion_id AND o.terminal_id=t.terminal_id AND o.estado='pendiente') THEN 'ocupada' WHEN t.conectada=0 THEN 'desconectada' ELSE 'disponible' END AS estado FROM demo_terminales t WHERE t.sesion_id=? ORDER BY t.nombre").bind(s.id).all()).results;
 const operaciones=(await db.prepare("SELECT o.*,CASE WHEN EXISTS(SELECT 1 FROM demo_planes_cobro p,json_each(p.datos_json,'$.movimientos') m WHERE p.sesion_id=o.sesion_id AND p.cuenta_id=o.cuenta_id AND json_extract(m.value,'$.terminal.id')=o.operacion_id AND json_extract(m.value,'$.terminal.importeCentavos')=o.importe_centavos AND NOT EXISTS(SELECT 1 FROM json_each(p.datos_json,'$.anulaciones') a WHERE json_extract(a.value,'$.movimiento')=json_extract(m.value,'$.id'))) THEN 1 ELSE 0 END AS conciliada FROM demo_terminal_operaciones o WHERE o.sesion_id=? ORDER BY creado DESC LIMIT 100").bind(s.id).all()).results.map(({sesion_id,...o})=>o);
 return {terminales,operaciones,modo:"simulado"};
}
export async function configurarTerminal(db,s,d){
 if(!identificador(d.terminal_id)||typeof d.nombre!=="string"||!d.nombre.trim()||d.nombre.trim().length>80||!["point_simulado","generico_simulado"].includes(d.proveedor)||![0,1].includes(d.conectada))throw Error("Terminal inválida.");
 const r=await db.prepare("INSERT INTO demo_terminales(sesion_id,terminal_id,nombre,proveedor,conectada) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) AND ((SELECT count(*) FROM demo_terminales WHERE sesion_id=?)<10 OR EXISTS(SELECT 1 FROM demo_terminales WHERE sesion_id=? AND terminal_id=?)) ON CONFLICT(sesion_id,terminal_id) DO UPDATE SET nombre=excluded.nombre,conectada=excluded.conectada WHERE demo_terminales.proveedor=excluded.proveedor AND NOT EXISTS(SELECT 1 FROM demo_terminal_operaciones o WHERE o.sesion_id=demo_terminales.sesion_id AND o.terminal_id=demo_terminales.terminal_id AND o.estado='pendiente') RETURNING terminal_id").bind(s.id,d.terminal_id,d.nombre.trim(),d.proveedor,d.conectada,s.id,ahora(),s.id,s.id,d.terminal_id).first();
 if(!r)throw Error("Terminal ocupada, proveedor distinto o límite alcanzado.");
 return r;
}
export async function solicitarTerminal(db,s,d){
 if(!identificador(d.operacion_id)||!identificador(d.terminal_id)||typeof d.cuenta_id!=="string"||!Number.isSafeInteger(d.importe_centavos)||d.importe_centavos<1||d.importe_centavos>100000000||!Number.isSafeInteger(d.revision_cuenta)||d.revision_cuenta<0||d.revision_cuenta>100)throw Error("Solicitud terminal inválida.");
 const buscar=()=>db.prepare("SELECT operacion_id,terminal_id,cuenta_id,importe_centavos,revision_cuenta,estado,creado,resuelto FROM demo_terminal_operaciones WHERE sesion_id=? AND operacion_id=?").bind(s.id,d.operacion_id).first();
 const anterior=await buscar();
 if(anterior){if(["terminal_id","cuenta_id","importe_centavos","revision_cuenta"].every(k=>anterior[k]===d[k]))return anterior;throw Error("Identificador ya utilizado.");}
 const r=await db.prepare("INSERT INTO demo_terminal_operaciones(sesion_id,operacion_id,terminal_id,cuenta_id,importe_centavos,revision_cuenta,creado) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) AND EXISTS(SELECT 1 FROM demo_cuentas WHERE sesion_id=? AND cuenta_id=? AND cerrado IS NULL) AND COALESCE((SELECT revision FROM demo_planes_cobro WHERE sesion_id=? AND cuenta_id=?),0)=? AND (SELECT count(*) FROM demo_terminal_operaciones WHERE sesion_id=?)<100 ON CONFLICT DO NOTHING RETURNING operacion_id,terminal_id,cuenta_id,importe_centavos,revision_cuenta,estado,creado,resuelto").bind(s.id,d.operacion_id,d.terminal_id,d.cuenta_id,d.importe_centavos,d.revision_cuenta,Date.now(),s.id,ahora(),s.id,d.cuenta_id,s.id,d.cuenta_id,d.revision_cuenta,s.id).first();
 if(!r)throw Error("Terminal o cuenta ocupada, revisión distinta o límite alcanzado.");
 return r;
}
export async function resolverTerminal(db,s,d){
 if(!identificador(d.operacion_id)||!["aprobado","rechazado","cancelado"].includes(d.estado))throw Error("Resultado terminal inválido.");
 const r=await db.prepare("UPDATE demo_terminal_operaciones SET estado=?,resuelto=? WHERE sesion_id=? AND operacion_id=? AND estado='pendiente' AND EXISTS(SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) RETURNING operacion_id,estado").bind(d.estado,Date.now(),s.id,d.operacion_id,s.id,ahora()).first();
 if(r)return r;
 const previo=await db.prepare("SELECT operacion_id,estado FROM demo_terminal_operaciones WHERE sesion_id=? AND operacion_id=?").bind(s.id,d.operacion_id).first();
 if(previo?.estado===d.estado)return previo;
 throw Error("Operación inexistente o ya resuelta.");
}
