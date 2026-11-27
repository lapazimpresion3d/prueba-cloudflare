// Datos de ejemplo controlados. No enviar nombres, teléfonos ni domicilios reales.
export const clientesDemo=Object.freeze([
 Object.freeze({id:"cliente-1",nombre:"Ana · Cliente de ejemplo",telefono:"000 000 0001",correo:"ana@example.invalid"}),
 Object.freeze({id:"cliente-2",nombre:"Luis · Cliente de ejemplo",telefono:"000 000 0002",correo:"luis@example.invalid"}),
 Object.freeze({id:"cliente-3",nombre:"María · Cliente de ejemplo",telefono:"000 000 0003",correo:"maria@example.invalid"})
]);
export const direccionesDemo=Object.freeze([
 Object.freeze({id:"domicilio-1",calle:"Calle de ejemplo 101",colonia:"Colonia de demostración A",referencias:"Puerta azul (ejemplo)"}),
 Object.freeze({id:"domicilio-2",calle:"Avenida de ejemplo 202",colonia:"Colonia de demostración B",referencias:"Entrada principal (ejemplo)"})
]);
export const notasPedidoDemo=Object.freeze([
 {id:"",nombre:"Sin instrucciones"},{id:"sin-cubiertos",nombre:"Sin cubiertos desechables"},{id:"separado",nombre:"Empacar por separado"},{id:"contactar",nombre:"Confirmar detalles antes de preparar"}
].map(Object.freeze));
export const notasCitaDemo=Object.freeze([{id:"",nombre:"Sin comentarios"},{id:"primera-visita",nombre:"Primera visita"},{id:"consulta",nombre:"Consultar detalles del servicio"},{id:"preferencia",nombre:"Confirmar preferencia al llegar"}].map(Object.freeze));
export const pagosDemo=Object.freeze([{id:"efectivo",nombre:"Efectivo"},{id:"transferencia",nombre:"Transferencia (simulada)"}].map(Object.freeze));
export const mesasDemo=Object.freeze(["1","2","3","4","5"]);
function elegir(lista,id,mensaje){const v=lista.find(x=>x.id===id);if(!v)throw Error(mensaje);return v;}
export function datosCitaDemo(d){
 if(!d||typeof d!=="object")throw Error("Selecciona un cliente ficticio.");
 const c=elegir(clientesDemo,d.cliente,"Selecciona un cliente ficticio.");
 const n=elegir(notasCitaDemo,d.nota??"","Comentario de práctica inválido.");
 return {cliente:{...c},nota:n.nombre};
}
export function datosPedidoDemo(d,modalidad,giro){
 if(!d||typeof d!=="object")throw Error("Selecciona un cliente ficticio.");
 const c=elegir(clientesDemo,d.cliente,"Selecciona un cliente ficticio.");
 const p=elegir(pagosDemo,d.pago,"Selecciona la forma de pago.");
 const n=elegir(notasPedidoDemo,d.nota??"","Instrucción de práctica inválida.");
 const entrega=modalidad==="domicilio"?{...elegir(direccionesDemo,d.direccion,"Selecciona una dirección de ejemplo.")}:null;
 const mesa=modalidad==="local"&&giro==="restaurante"?d.mesa:null;
 if(modalidad==="local"&&giro==="restaurante"&&!mesasDemo.includes(mesa))throw Error("Selecciona una mesa de ejemplo.");
 return {cliente:{...c},pago:{...p},nota:n.nombre,entrega,mesa};
}
// No persistir objetos arbitrarios; en reintentos, solo la selección normalizada.
export function seleccionCita(d){const v=datosCitaDemo(d);return {cliente:v.cliente.id,nota:d.nota??""};}
export function seleccionPedido(d,modalidad,giro){const v=datosPedidoDemo(d,modalidad,giro);return {cliente:v.cliente.id,pago:v.pago.id,nota:d.nota??"",direccion:v.entrega?.id??"",mesa:v.mesa??""};}
