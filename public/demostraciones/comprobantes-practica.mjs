import {importe} from "./config.mjs";
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {logoDemo} from "./identidad.mjs";
import {crearPerfilesLocales} from "./perfil-local.mjs";
import {metodosCobroDemo} from "./cobros-practica.mjs";
import {clientesDemo} from "./clientes-practica.mjs";
const limpio=(s,max)=>typeof s==="string"?s.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max):"";
export function validarFormato(d){if(!d||![58,80].includes(d.ancho)||typeof d.logo!=="boolean"||typeof d.pie!=="string"||d.pie.length>180)throw Error("Configuración de comprobante inválida.");return {ancho:d.ancho,logo:d.logo,pie:limpio(d.pie,180)};}
export function formatosComprobante(storage,id,plan){if(!obtenerEstablecimiento(id)||!["p3","p4"].includes(plan))throw Error("Contexto de comprobante inválido.");const key="lapaz:comprobante:v1:"+id+":"+plan;return {leer(){try{return validarFormato(JSON.parse(storage.getItem(key)));}catch{return {ancho:80,logo:true,pie:"Gracias por tu visita."};}},guardar(d){const v=validarFormato(d);storage.setItem(key,JSON.stringify(v));return v;}};}
export function identidadComprobante(id,storage){const p=crearPerfilesLocales(storage).leer(id);return {nombre:p.nombre,ubicacion:p.ubicacion,contacto:p.contacto,logo:p.logo||logoDemo(id)};}
const fecha=n=>Number.isSafeInteger(n)?new Date(n).toLocaleString("es-MX",{timeZone:"America/Mazatlan"}):"Sin fecha";
const fila=(a,b)=>[String(a),String(b)];
const efectivo=(a,b)=>fila(a,importe(b));
const empleado=(i,r)=>"Empleado "+(i+1)+(r?" · "+r:"");
export function comprobanteVenta(v){
 if(!v||!Array.isArray(v.detalle)||!["vendido","cancelado"].includes(v.estado))throw Error("Venta inválida.");
 const cancelada=v.estado==="cancelado",c=v.cobro??(cancelada?v.historialCobros?.filter(x=>x.accion==="registrar").at(-1)?.cobro:null);
 const datos=[fila("Folio",v.folio),fila("Fecha",fecha(v.creado)),fila("Sucursal",v.sucursal),fila("Turno",v.turno??"Anterior a caja"),fila("Atendió",empleado(v.empleado,v.rol)),fila("Cliente",clientesDemo.find(x=>x.id===v.cliente)?.nombre??"Público general")];
 const productos=v.detalle.map(l=>({nombre:l.nombre,cantidad:l.cantidad,unitario:importe(l.precioCentavos),importe:importe(l.subtotal),opciones:Array.isArray(l.personalizacion)?l.personalizacion.map(String):[]}));
 const totales=[efectivo("Subtotal",v.subtotal),efectivo("Descuento",v.descuentoCentavos),efectivo(cancelada?"Total original":"TOTAL",v.total)];
 if(v.anticipoAplicado){totales.push(efectivo("Anticipos previos aplicados",v.anticipoAplicado),efectivo("Saldo liquidado en turno",v.saldoLiquidado));}
 if(c){totales.push(fila("Método original",metodosCobroDemo[c.metodo]??c.metodo),efectivo("Recibido",c.recibidoCentavos),efectivo("Cambio",c.cambioCentavos));if(c.referencia)totales.push(fila("Referencia ficticia",c.referencia));}else if(!cancelada)totales.push(fila("Cobro",v.anticipoAplicado?"Liquidado con anticipos previos":"Sin cargo"));
 if(cancelada){totales.push(efectivo("Venta neta",0),fila("Motivo",v.cancelacion?.motivo??"Sin motivo registrado"),fila("Cancelación",fecha(v.cancelacion?.fecha)),fila("Autorizó",empleado(v.cancelacion?.empleado??0,v.cancelacion?.rol)));}
 return {tipo:cancelada?"CANCELACIÓN DE VENTA":"TICKET DE VENTA",folio:v.folio,datos,productos,totales,nota:cancelada?"Registro anulado. No acredita devolución de dinero.":"Cobro simulado. No acredita un pago real."};
}
export function comprobanteCorte(t){if(t?.estado!=="cerrado"||!t.cierre?.resumen)throw Error("El corte requiere un turno cerrado.");const r=t.cierre.resumen;return {tipo:"CORTE DE CAJA",folio:t.id,datos:[fila("Turno",t.id),fila("Sucursal",t.sucursal),fila("Apertura",fecha(t.apertura)),fila("Cierre",fecha(t.cierre.fecha)),fila("Abrió",empleado(t.empleado,t.rol)),fila("Cerró",empleado(t.cierre.empleado,t.cierre.rol))],productos:[],totales:[efectivo("Fondo inicial",r.fondo),efectivo("Efectivo",r.efectivo),efectivo("Tarjeta",r.tarjeta_externa),efectivo("Transferencia",r.transferencia),efectivo("Cobros de ventas en turno",r.totalVentas),...(r.anticiposAplicados?[efectivo("Anticipos previos aplicados (no caja)",r.anticiposAplicados)]:[]),efectivo("Ingresos",r.ingresos),efectivo("Retiros",r.retiros),fila("Ventas",r.ventas),fila("Canceladas",r.canceladas),efectivo("Efectivo esperado",r.esperado),efectivo("Efectivo contado",t.cierre.contado),efectivo("Diferencia",t.cierre.diferencia)],nota:"Corte simulado. Sin validez contable ni fiscal."};}
export function textoComprobante(c,marca,f){return [marca.nombre,marca.ubicacion,marca.contacto,c.tipo,"DEMOSTRACIÓN · SIN VALIDEZ FISCAL",...c.datos.map(([a,b])=>a+": "+b),...c.productos.flatMap(p=>[p.nombre,p.cantidad+" × "+p.unitario+" = "+p.importe,...p.opciones]),...c.totales.map(([a,b])=>a+": "+b),c.nota,f.pie].filter(Boolean).join("\n");}
export function archivoComprobante(c){return ("demo-"+c.tipo.toLowerCase().replace(/[^a-z]+/g,"-")+"-"+String(c.folio).replace(/[^a-zA-Z0-9_-]/g,"-")).slice(0,150)+".txt";}
