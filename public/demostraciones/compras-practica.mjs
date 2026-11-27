import {entradaInsumo,devolverInsumoCompra} from "./recetas-practica.mjs";
// Compras ficticias. Toda recepción/devolución comparte la escritura de inventario y POS.
import {registrar} from "./inventario-practica.mjs";
const entero=(n,max=1000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const texto=(s,max)=>typeof s==="string"&&s.trim().length>0&&s.trim().length<=max;
const stock=(i,s,id)=>i.productos.find(p=>p.sucursal===s&&p.id===id);
export const comprasVacias=()=>({proveedores:[],ordenes:[]});
export function validarCompras(c){
 if(!c||!Array.isArray(c.proveedores)||c.proveedores.length>50||!Array.isArray(c.ordenes)||c.ordenes.length>100||new Set(c.proveedores.map(p=>p?.id)).size!==c.proveedores.length||new Set(c.ordenes.map(o=>o?.folio)).size!==c.ordenes.length||c.proveedores.some(p=>!p||typeof p.id!=="string"||!texto(p.nombre,80)||!Array.isArray(p.articulos))||c.ordenes.some(o=>!o||typeof o.folio!=="string"||!Array.isArray(o.lineas)||!Array.isArray(o.eventos)||!Array.isArray(o.pagos)||!["abierta","cerrada","cancelada"].includes(o.estado)))throw Error("Registro de compras inválido.");
 return c;
}
export function guardarProveedor(c,id,d,catalogo){
 if(!/^PROV-[a-zA-Z0-9-]{1,80}$/.test(id)||!texto(d.nombre,80)||typeof d.activo!=="boolean"||!Array.isArray(d.articulos)||d.articulos.length>100||new Set(d.articulos.map(a=>a.id)).size!==d.articulos.length||d.articulos.some(a=>!catalogo.some(p=>p.id===a.id&&p.tipo!=="servicio")||!entero(a.costo,100000000)))throw Error("Proveedor o artículos inválidos.");
 const p={id,nombre:d.nombre.trim(),contacto:"Contacto ficticio · sin comunicaciones",activo:d.activo,articulos:d.articulos.map(a=>({id:a.id,costo:a.costo}))},n=c.proveedores.findIndex(x=>x.id===id);if(n<0){if(c.proveedores.length>=50)throw Error("Límite de proveedores.");c.proveedores.push(p);}else c.proveedores[n]=p;return p;
}
export function resumenCompra(o){
 const pedido=o.lineas.reduce((s,l)=>s+l.cantidad*l.costo,0),recibido=o.lineas.reduce((s,l)=>s+l.recibido*l.costo,0),devuelto=o.lineas.reduce((s,l)=>s+l.devuelto*l.costo,0),pagado=o.pagos.reduce((s,p)=>s+p.importe,0);
 return {pedido,recibido,devuelto,neto:recibido-devuelto,pagado,pendiente:recibido-devuelto-pagado};
}
export function crearOrden(c,i,a,proveedor,lineas,folio,fecha,r=null){
 const p=c.proveedores.find(p=>p.id===proveedor&&p.activo);
 if(!p||!/^OC-[a-zA-Z0-9-]{1,80}$/.test(folio)||c.ordenes.some(o=>o.folio===folio)||c.ordenes.length>=100||!Array.isArray(lineas)||!lineas.length||lineas.length>30||new Set(lineas.map(l=>l.id)).size!==lineas.length)throw Error("Orden inválida.");
 const ls=lineas.map(l=>{const art=p.articulos.find(x=>x.id===l.id);if(!art||!(stock(i,a.sucursal,l.id)?.activo||r?.insumos.some(p=>p.sucursal===a.sucursal&&p.id===l.id))||!entero(l.cantidad)||l.cantidad===0)throw Error("Configura el producto y su inventario antes de comprar.");return {id:l.id,cantidad:l.cantidad,costo:art.costo,recibido:0,devuelto:0};});
 const o={folio,proveedor:p.id,proveedorNombre:p.nombre,sucursal:a.sucursal,empleado:a.empleado,creado:fecha,estado:"abierta",lineas:ls,eventos:[],pagos:[]};if(resumenCompra(o).pedido>100000000)throw Error("Importe supera límite de práctica.");c.ordenes.unshift(o);return o;
}
function orden(c,a,f){const o=c.ordenes.find(o=>o.folio===f&&o.sucursal===a.sucursal);if(!o||o.estado==="cancelada"||o.eventos.length>=100)throw Error("Orden no disponible.");return o;}
function evento(o,a,tipo,fecha,d){o.eventos.push({tipo,fecha,empleado:a.empleado,rol:a.rol,...d});}
export function recibirCompra(c,i,a,f,id,n,fecha,r=null){
 const o=orden(c,a,f),l=o.lineas.find(l=>l.id===id),p=stock(i,a.sucursal,id);const ins=r?.insumos.find(x=>x.sucursal===a.sucursal&&x.id===id);if(o.estado!=="abierta"||!l||!(p?.activo||ins)||!entero(n)||n===0||n>l.cantidad-l.recibido)throw Error("Recepción superior a pendiente o inválida.");
 if(ins)entradaInsumo(r,a,id,n,n*l.costo,fecha,f);else registrar(i,p,a,"compra_entrada",n,"Recepción de compra",fecha,f);l.recibido+=n;evento(o,a,"recepcion",fecha,{id,cantidad:n});if(o.lineas.every(l=>l.recibido===l.cantidad))o.estado="cerrada";return o;
}
export function devolverCompra(c,i,a,f,id,n,fecha,r=null){
 const o=orden(c,a,f),l=o.lineas.find(l=>l.id===id),p=stock(i,a.sucursal,id);const ins=r?.insumos.find(x=>x.sucursal===a.sucursal&&x.id===id);if(!l||!(p?.activo||ins)||!entero(n)||n===0||n>l.recibido-l.devuelto||n>(ins?ins.stock:p.existencias)||n*l.costo>resumenCompra(o).pendiente)throw Error("Devolución inválida o requiere ajuste de un pago previo.");
 if(ins)devolverInsumoCompra(r,a,id,n,fecha,f);else registrar(i,p,a,"compra_devolucion",-n,"Devolución a proveedor",fecha,f);l.devuelto+=n;evento(o,a,"devolucion",fecha,{id,cantidad:n});return o;
}
export function cerrarCompra(c,a,f,fecha){
 const o=orden(c,a,f);if(o.estado!=="abierta")throw Error("Orden ya cerrada.");o.estado=o.lineas.some(l=>l.recibido>0)?"cerrada":"cancelada";evento(o,a,"cierre_pendiente",fecha,{});return o;
}
export function pagarCompra(c,a,f,importe,referencia,fecha){
 const o=orden(c,a,f);if(!entero(importe,100000000)||importe===0||importe>resumenCompra(o).pendiente||!/^DEMO-[0-9]{6}$/.test(referencia)||c.ordenes.some(o=>o.pagos.some(p=>p.referencia===referencia))||o.pagos.length>=30)throw Error("Pago ficticio inválido, duplicado o superior al saldo.");o.pagos.push({importe,referencia,fecha,empleado:a.empleado});evento(o,a,"pago",fecha,{importe,referencia});return o;
}
export function sugerirCompras(c,i,s){
 return i.productos.filter(p=>p.sucursal===s&&p.activo&&p.existencias<=p.minimo).map(p=>{const pendiente=c.ordenes.filter(o=>o.sucursal===s&&o.estado==="abierta").flatMap(o=>o.lineas).filter(l=>l.id===p.id).reduce((n,l)=>n+l.cantidad-l.recibido,0);return {id:p.id,existencias:p.existencias,minimo:p.minimo,pendiente,sugerido:Math.max(0,p.minimo+1-p.existencias-pendiente),proveedores:c.proveedores.filter(x=>x.activo&&x.articulos.some(a=>a.id===p.id)).map(x=>x.id)};});
}
