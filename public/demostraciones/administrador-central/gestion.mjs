// Funciones puras de práctica; no contienen acceso a servicios privados.
export const periodoActual=()=>new Date().toISOString().slice(0,7);
export function filtrarClientes(clientes,{texto="",plan="",estado=""}={}){
 const t=texto.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 return clientes.filter(c=>(!plan||c.plan===plan)&&(!estado||c.estado===estado)&&c.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(t));
}
export function saldoMensual(c,pagos,periodo){
 if(c.estado!=="activa")return 0;
 return Math.max(0,c.mensualidad-pagos.filter(p=>p.id===c.id&&p.concepto==="mensualidad"&&p.periodo===periodo).reduce((n,p)=>n+p.importe,0));
}
export function csv(filas){
 return "\ufeff"+filas.map(f=>f.map(v=>{let s=String(v??"");if(/^[\s\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]*[=+@\-＝＋＠－]/u.test(s)||/^[\u0000-\u001f\u007f]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}).join(",")).join("\r\n");
}
export function registrarCambio(datos,c,d,fecha){
 const anterior={plan:c.plan,estado:c.estado,vence:c.vence,mensualidad:c.mensualidad};
 if(c.plan!==d.plan)c.mensualidad=datos.precios.find(p=>p.id===d.plan).mensualidad;
 Object.assign(c,{plan:d.plan,estado:d.estado,vence:d.vence});
 datos.historial.push({id:c.id,fecha,anterior,nuevo:{plan:c.plan,estado:c.estado,vence:c.vence,mensualidad:c.mensualidad}});
}
