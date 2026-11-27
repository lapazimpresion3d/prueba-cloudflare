// Adaptador de terminal exclusivamente simulado. Sin red ni credenciales.
export function crearTerminalSimulada(){
 const operaciones=new Map();
 function consultar(id){const o=operaciones.get(id);if(!o)throw Error("Operación inexistente.");return {...o};}
 return Object.freeze({proveedor:"point_simulado",modo:"simulado",
 solicitar({id,importeCentavos}){
 if(typeof id!=="string"||!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||!Number.isSafeInteger(importeCentavos)||importeCentavos<=0||importeCentavos>100000000)throw Error("Solicitud inválida.");
 if(operaciones.has(id)){const o=consultar(id);if(o.importeCentavos!==importeCentavos)throw Error("Identificador utilizado.");return o;}
 operaciones.set(id,{id,importeCentavos,estado:"pendiente",modo:"simulado"});return consultar(id);
 },consultar,
 resolver(id,estado){const o=consultar(id);if(!["aprobado","rechazado","cancelado"].includes(estado)||o.estado!=="pendiente")throw Error("Transición inválida.");operaciones.set(id,{...o,estado});return consultar(id);},
 cancelar(id){const o=consultar(id);if(o.estado==="cancelado")return o;if(o.estado!=="pendiente")throw Error("No se puede cancelar.");operaciones.set(id,{...o,estado:"cancelado"});return consultar(id);}
 });
}
