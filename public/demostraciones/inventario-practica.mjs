// Inventario unitario de práctica. Mutaciones sobre copia del estado del POS.
const MAX=1000000,MAX_MOV=4000;
const entero=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX;
export const motivosInventario=Object.freeze({entrada:["Reposición","Devolución manual"],salida:["Merma","Consumo interno"],ajuste:["Conteo físico","Corrección"]});
const skuValido=s=>typeof s==="string"&&/^[A-Z0-9_-]{1,40}$/.test(s);
export function inventarioVacio(){return {productos:[],movimientos:[],traspasos:[]};}
export function validarInventario(i){
 if(!i||!Array.isArray(i.productos)||i.productos.length>300||!Array.isArray(i.movimientos)||i.movimientos.length>MAX_MOV||i.productos.some(p=>!p||typeof p.id!=="string"||!Number.isInteger(p.sucursal)||p.sucursal<1||p.sucursal>3||typeof p.activo!=="boolean"||!skuValido(p.sku)||!entero(p.existencias)||!entero(p.minimo))||new Set(i.productos.map(p=>p.sucursal+":"+p.id)).size!==i.productos.length||new Set(i.productos.map(p=>p.sucursal+":"+p.sku)).size!==i.productos.length)throw Error("Inventario de práctica inválido.");
 i.traspasos??=[];if(!Array.isArray(i.traspasos)||i.traspasos.length>300||new Set(i.traspasos.map(t=>t?.folio)).size!==i.traspasos.length||i.traspasos.some(t=>!t||typeof t.folio!=="string"||typeof t.id!=="string"||!Number.isInteger(t.origen)||!Number.isInteger(t.destino)||t.origen===t.destino||!entero(t.cantidad)||t.cantidad===0||!["transito","recibido","cancelado"].includes(t.estado)||t.estado==="recibido"&&(!entero(t.recibido)||t.recibido>t.cantidad||t.faltante!==t.cantidad-t.recibido)))throw Error("Traspasos inválidos.");
 return i;
}
export function estadoExistencia(p){return !p?.activo?"sin_control":p.existencias===0?"agotado":p.existencias<=p.minimo?"bajo":"disponible";}
const buscar=(i,s,id)=>i.productos.find(p=>p.sucursal===s&&p.id===id);
export function registrar(i,p,a,tipo,delta,motivo,fecha,referencia=""){
 if(i.movimientos.length>=MAX_MOV)throw Error("Límite de movimientos de práctica.");
 const antes=p.existencias,despues=antes+delta;if(!entero(despues))throw Error("Existencias insuficientes o fuera de límite.");
 p.existencias=despues;i.movimientos.unshift({sucursal:a.sucursal,empleado:a.empleado,rol:a.rol,id:p.id,sku:p.sku,tipo,delta,antes,despues,motivo,fecha,referencia});
}
export function configurarInventario(i,a,catalogo,id,d,fecha){
 const oferta=catalogo.find(p=>p.id===id);
 if(!oferta||oferta.tipo==="servicio"||typeof d.activo!=="boolean"||!skuValido(d.sku)||!entero(d.minimo))throw Error("Producto o configuración inválida.");
 if(i.productos.some(p=>p.sucursal===a.sucursal&&p.id!==id&&p.sku===d.sku))throw Error("SKU repetido en esta sucursal.");
 let p=buscar(i,a.sucursal,id);
 if(!p){if(i.productos.length>=300||!entero(d.inicial))throw Error("Existencia inicial inválida o límite alcanzado.");p={id,sucursal:a.sucursal,sku:d.sku,activo:d.activo,minimo:d.minimo,existencias:0};i.productos.push(p);registrar(i,p,a,"inicial",d.inicial,"Existencia inicial",fecha);}
 else{if(d.inicial!==undefined)throw Error("Utiliza un ajuste para cambiar existencias.");p.sku=d.sku;p.activo=d.activo;p.minimo=d.minimo;}
 return p;
}
export function movimientoInventario(i,a,id,tipo,cantidad,motivo,fecha){
 const p=buscar(i,a.sucursal,id);if(!p?.activo||!Object.hasOwn(motivosInventario,tipo)||!motivosInventario[tipo].includes(motivo)||!entero(cantidad)||tipo!=="ajuste"&&cantidad===0)throw Error("Movimiento inválido.");
 registrar(i,p,a,tipo,tipo==="ajuste"?cantidad-p.existencias:tipo==="entrada"?cantidad:-cantidad,motivo,fecha);return p;
}
export function consumoVenta(i,a,detalle){
 const cantidades=new Map();for(const l of detalle)cantidades.set(l.id,(cantidades.get(l.id)||0)+l.cantidad);
 const consumo=[];for(const [id,cantidad] of cantidades){const p=buscar(i,a.sucursal,id);if(!p?.activo)continue;if(p.existencias<cantidad)throw Error("Inventario insuficiente: "+id+". Disponible: "+p.existencias);consumo.push({id,cantidad});}return consumo;
}
export function registrarConsumo(i,a,consumo,folio,fecha,reversa=false){
 for(const l of consumo){const p=buscar(i,a.sucursal,l.id);if(!p)throw Error("Registro de inventario ausente.");registrar(i,p,a,reversa?"cancelacion":"venta",reversa?l.cantidad:-l.cantidad,reversa?"Cancelación de venta":"Venta POS",fecha,folio);}
}
