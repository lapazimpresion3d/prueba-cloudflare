// Diario de una operación incierta por pestaña. Nunca genera un ID nuevo al recuperar.
export function estadoOperacion(p,datos){
 if(!datos||datos.cuenta!==p.cuenta)return "desconocida";
 if(p.datos.accion==="cerrar")return datos.cerrado!==null&&datos.cerrado!==undefined?"confirmada":datos.plan.revision===p.datos.revision?"reintentar":"conflicto";
 const lista=p.datos.accion==="anular"?datos.plan.anulaciones:p.datos.accion==="reasignar"?datos.plan.reasignaciones:datos.plan.movimientos;
 if((lista||[]).some(m=>m.id===p.datos.id))return "confirmada";
 return datos.cerrado!==null?"conflicto":datos.plan.revision===p.datos.revision?"reintentar":"conflicto";
}
export function diarioOperacion(storage,key){
 return {leer(){const raw=storage.getItem(key);return raw?JSON.parse(raw):null;},guardar(p){storage.setItem(key,JSON.stringify(p));},limpiar(){storage.removeItem(key);}};
}
