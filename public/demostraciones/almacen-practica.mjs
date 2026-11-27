import {registrar,estadoExistencia} from "./inventario-practica.mjs";
const buscar=(i,s,id)=>i.productos.find(p=>p.sucursal===s&&p.id===id);
const cantidadValida=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000;
export function enviarTraspaso(i,a,destino,id,cantidad,folio,fecha){
 const p=buscar(i,a.sucursal,id),d=buscar(i,destino,id);
 if(a.sucursal===destino||!p?.activo||!d?.activo||!cantidadValida(cantidad)||cantidad===0||p.existencias<cantidad||i.traspasos.length>=300||!/^TR-[a-zA-Z0-9-]{1,80}$/.test(folio)||i.traspasos.some(t=>t.folio===folio))throw Error("Traspaso inválido: configura ambos inventarios y revisa las existencias.");
 registrar(i,p,a,"traspaso_salida",-cantidad,"Envío a sucursal "+destino,fecha,folio);
 const t={folio,id,sku:p.sku,origen:a.sucursal,destino,cantidad,estado:"transito",envio:{fecha,empleado:a.empleado,rol:a.rol}};i.traspasos.unshift(t);return t;
}
export function recibirTraspaso(i,a,folio,cantidad,motivo,fecha){
 const t=i.traspasos.find(t=>t.folio===folio&&t.destino===a.sucursal),p=t&&buscar(i,t.destino,t.id);
 if(!t||t.estado!=="transito"||!p?.activo||!cantidadValida(cantidad)||cantidad>t.cantidad||cantidad<t.cantidad&&!["Faltante de traslado","Daño de traslado"].includes(motivo))throw Error("Recepción inválida.");
 registrar(i,p,a,"traspaso_entrada",cantidad,"Recepción desde sucursal "+t.origen,fecha,folio);
 t.estado="recibido";t.recibido=cantidad;t.faltante=t.cantidad-cantidad;t.motivo=t.faltante?motivo:"";t.recepcion={fecha,empleado:a.empleado,rol:a.rol};return t;
}
export function cancelarTraspaso(i,a,folio,fecha){
 const t=i.traspasos.find(t=>t.folio===folio&&t.origen===a.sucursal),p=t&&buscar(i,t.origen,t.id);
 if(!t||t.estado!=="transito"||!p)throw Error("Solo se cancela un envío pendiente desde su origen.");
 registrar(i,p,a,"traspaso_cancelacion",t.cantidad,"Retorno físico confirmado al origen",fecha,folio);t.estado="cancelado";t.cancelacion={fecha,empleado:a.empleado,rol:a.rol};return t;
}
export function consolidarInventario(i,sucursales){
 const map=new Map();const fila=id=>{if(!map.has(id))map.set(id,{id,disponible:0,transito:0,faltantes:0,ubicaciones:[]});return map.get(id);};
 for(const p of i.productos.filter(p=>sucursales.includes(p.sucursal))){const f=fila(p.id);f.ubicaciones.push({...p,estado:estadoExistencia(p)});if(p.activo)f.disponible+=p.existencias;}
 for(const t of i.traspasos.filter(t=>sucursales.includes(t.origen)||sucursales.includes(t.destino))){const f=fila(t.id);if(t.estado==="transito")f.transito+=t.cantidad;if(t.estado==="recibido")f.faltantes+=t.faltante;}
 return [...map.values()];
}
export function csvFilas(filas){return "\ufeff"+filas.map(f=>f.map(v=>{let s=String(v??"");if(typeof v==="string"&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(",")).join("\r\n");}
