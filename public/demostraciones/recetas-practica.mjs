// Insumos medidos en unidades base enteras (g, ml, pieza); valor en centavos.
const entero=(n,max=100000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const unidades={g:1,kg:1000,ml:1,l:1000,pza:1};
export function cantidadBase(n,u){if(!Object.hasOwn(unidades,u)||typeof n!=="number"||!Number.isFinite(n)||n<0)throw Error("Cantidad inválida.");const x=n*unidades[u],v=Math.round(x);if(Math.abs(x-v)>1e-7||!entero(v))throw Error("Usa cantidades enteras en g, ml o piezas.");return v;}
export const recetasVacias=()=>({insumos:[],recetas:[],movimientos:[],subrecetas:[],lotes:[]});
export function validarRecetas(r){if(!r||!Array.isArray(r.insumos)||r.insumos.length>150||!Array.isArray(r.recetas)||r.recetas.length>300||!Array.isArray(r.movimientos)||r.movimientos.length>4000||r.insumos.some(x=>!x||typeof x.id!=="string"||!["g","ml","pza"].includes(x.unidad)||!entero(x.stock)||!entero(x.valor))||new Set(r.insumos.map(x=>x.sucursal+":"+x.id)).size!==r.insumos.length)throw Error("Registro de insumos inválido.");r.subrecetas??=[];r.lotes??=[];if(!Array.isArray(r.subrecetas)||r.subrecetas.length>150||!Array.isArray(r.lotes)||r.lotes.length>300)throw Error("Historial de producción inválido.");return r;}
const ins=(r,s,id)=>r.insumos.find(x=>x.sucursal===s&&x.id===id);
const receta=(r,s,id)=>r.recetas.find(x=>x.sucursal===s&&x.id===id);
function mover(r,p,a,delta,valor,tipo,fecha,ref=""){if(r.movimientos.length>=4000||!entero(p.stock+delta)||!entero(p.valor+valor))throw Error("Existencias o valor insuficiente, o límite alcanzado.");if(p.stock+delta===0&&p.valor+valor!==0)throw Error("Valor residual inválido.");p.stock+=delta;p.valor+=valor;r.movimientos.unshift({id:p.id,sucursal:a.sucursal,empleado:a.empleado,delta,valor,tipo,fecha,ref,stock:p.stock});}
export function crearInsumo(r,a,id,d,fecha){if(!/^IN-[a-zA-Z0-9-]{1,80}$/.test(id)||ins(r,a.sucursal,id)||r.insumos.length>=150||typeof d.nombre!=="string"||!d.nombre.trim()||d.nombre.length>80||!["g","ml","pza"].includes(d.unidad)||!entero(d.stock)||!entero(d.valor)||!d.stock&&d.valor)throw Error("Insumo inválido.");const p={id,sucursal:a.sucursal,nombre:d.nombre.trim(),unidad:d.unidad,stock:0,valor:0};r.insumos.push(p);mover(r,p,a,d.stock,d.valor,"inicial",fecha);return p;}
export function entradaInsumo(r,a,id,n,costo,fecha,ref=""){const p=ins(r,a.sucursal,id);if(!p||!entero(n)||!n||!entero(costo))throw Error("Entrada inválida.");mover(r,p,a,n,costo,ref?"compra_orden":"compra_manual",fecha,ref);return p;}
const costoSalida=(p,n)=>{if(!entero(n)||n>p.stock)throw Error("Insumo insuficiente: "+p.nombre);return n===0?0:Math.round(p.valor*n/p.stock);};
export function mermaInsumo(r,a,id,n,fecha){const p=ins(r,a.sucursal,id);if(!p||!n)throw Error("Merma inválida.");mover(r,p,a,-n,-costoSalida(p,n),"merma",fecha);return p;}
export function guardarReceta(r,a,catalogo,id,d){
 if(!catalogo.some(p=>p.id===id)||!Array.isArray(d.componentes)||!d.componentes.length||d.componentes.length>30||!entero(d.rendimiento,1000)||!d.rendimiento||!entero(d.indirecto,100000000)||!entero(d.merma,99)||new Set(d.componentes.map(x=>x.id)).size!==d.componentes.length||d.componentes.some(x=>!ins(r,a.sucursal,x.id)||!entero(x.cantidad)||!x.cantidad))throw Error("Receta inválida.");
 const v={id,sucursal:a.sucursal,rendimiento:d.rendimiento,indirecto:d.indirecto,merma:d.merma,componentes:d.componentes.map(x=>({id:x.id,cantidad:x.cantidad}))},i=r.recetas.findIndex(x=>x.id===id&&x.sucursal===a.sucursal);if(i<0){if(r.recetas.length>=300)throw Error("Límite de recetas.");r.recetas.push(v);}else r.recetas[i]=v;return v;
}
export function cantidadesReceta(v,n=1){return v.componentes.map(x=>({id:x.id,cantidad:Math.ceil(x.cantidad*n*100/(v.rendimiento*(100-v.merma)))}));}
export function costoReceta(r,v){const componentes=cantidadesReceta(v).map(x=>{const p=ins(r,v.sucursal,x.id);return {...x,nombre:p.nombre,unidad:p.unidad,costo:p.stock?Math.round(p.valor*x.cantidad/p.stock):null};});const costo=componentes.some(x=>x.costo===null)?null:componentes.reduce((s,x)=>s+x.costo,Math.ceil(v.indirecto/v.rendimiento));return {componentes,costo};}
export function consumoRecetas(r,a,detalle){const m=new Map();let indirecto=0;for(const l of detalle){const v=receta(r,a.sucursal,l.id);if(!v)continue;for(const x of cantidadesReceta(v,l.cantidad))m.set(x.id,(m.get(x.id)||0)+x.cantidad);indirecto+=Math.ceil(v.indirecto*l.cantidad/v.rendimiento);}const consumo=[...m].map(([id,cantidad])=>{const p=ins(r,a.sucursal,id);return {id,cantidad,costo:costoSalida(p,cantidad)};});return {consumo,costo:consumo.reduce((s,x)=>s+x.costo,indirecto)};}
export function registrarRecetas(r,a,consumo,fecha,ref,reversa=false){for(const x of consumo){const p=ins(r,a.sucursal,x.id);if(!p)throw Error("Insumo ausente.");mover(r,p,a,reversa?x.cantidad:-x.cantidad,reversa?x.costo:-x.costo,reversa?"cancelacion":"venta",fecha,ref);}}
export function consultarRecetas(r,s,catalogo){return {insumos:r.insumos.filter(x=>x.sucursal===s),recetas:r.recetas.filter(x=>x.sucursal===s).map(v=>{const c=costoReceta(r,v),precio=catalogo.find(p=>p.id===v.id)?.precioCentavos??null;return {...v,detalleCosto:c.componentes,costo:c.costo,precio,margen:c.costo===null||!precio?null:(precio-c.costo)/precio*100};}),movimientos:r.movimientos.filter(x=>x.sucursal===s),subrecetas:(r.subrecetas??[]).filter(x=>x.sucursal===s),lotes:(r.lotes??[]).filter(x=>x.sucursal===s)};}

export function devolverInsumoCompra(r,a,id,n,fecha,ref){const p=ins(r,a.sucursal,id);if(!p||!n)throw Error("Insumo inválido.");mover(r,p,a,-n,-costoSalida(p,n),"devolucion_compra",fecha,ref);return p;}
export function desactivarReceta(r,a,id){const i=r.recetas.findIndex(v=>v.id===id&&v.sucursal===a.sucursal);if(i<0)throw Error("Receta inexistente.");r.recetas.splice(i,1);}
export function resumenRentabilidad(ventas){const validas=ventas.filter(v=>v.estado==="vendido"),completas=validas.filter(v=>v.costoCompleto===true);return {ventas:validas.length,conCosto:completas.length,ingresos:completas.reduce((s,v)=>s+v.total,0),costo:completas.reduce((s,v)=>s+v.costoRecetasCentavos,0),margen:completas.reduce((s,v)=>s+v.total-v.costoRecetasCentavos,0)};}

// Una preparación es un insumo inventariable. No se expanden sus materias primas al vender.
export function guardarSubreceta(r,a,id,d){
 const salida=ins(r,a.sucursal,id);
 if(!salida||!entero(d.previsto)||!d.previsto||!entero(d.indirecto)||!Array.isArray(d.componentes)||!d.componentes.length||d.componentes.length>30||new Set(d.componentes.map(x=>x.id)).size!==d.componentes.length||d.componentes.some(x=>x.id===id||!ins(r,a.sucursal,x.id)||!entero(x.cantidad)||!x.cantidad))throw Error("Preparación inválida.");
 r.subrecetas??=[];const v={id,sucursal:a.sucursal,previsto:d.previsto,indirecto:d.indirecto,componentes:d.componentes.map(x=>({id:x.id,cantidad:x.cantidad}))};
 const lista=r.subrecetas.filter(x=>x.sucursal===a.sucursal&&x.id!==id).concat(v),map=new Map(lista.map(x=>[x.id,x]));
 function visita(k,camino=new Set()){if(camino.has(k))throw Error("Las preparaciones no pueden depender circularmente entre sí.");const next=new Set(camino);next.add(k);for(const x of map.get(k)?.componentes??[])if(map.has(x.id))visita(x.id,next);}
 visita(id);const i=r.subrecetas.findIndex(x=>x.sucursal===a.sucursal&&x.id===id);if(i<0){if(r.subrecetas.length>=150)throw Error("Límite de preparaciones.");r.subrecetas.push(v);}else r.subrecetas[i]=v;return v;
}
export function producirLote(r,a,id,d,folio,fecha){
 const v=r.subrecetas?.find(x=>x.sucursal===a.sucursal&&x.id===id),salida=ins(r,a.sucursal,id);
 if(!v||!salida||!/^LOTE-[a-zA-Z0-9-]{1,80}$/.test(folio)||!entero(d.repeticiones,100)||!d.repeticiones||!entero(d.real)||!d.real)throw Error("Cantidad producida o preparación inválida.");
 r.lotes??=[];if(r.lotes.length>=300||r.lotes.some(x=>x.folio===folio))throw Error("Límite o folio de lote repetido.");
 const previsto=v.previsto*d.repeticiones,indirecto=v.indirecto*d.repeticiones;
 if(!entero(previsto)||!entero(indirecto))throw Error("Lote demasiado grande.");
 const consumo=v.componentes.map(x=>{const p=ins(r,a.sucursal,x.id),cantidad=x.cantidad*d.repeticiones;return {id:x.id,nombre:p.nombre,unidad:p.unidad,cantidad,costo:costoSalida(p,cantidad)};});
 const costo=consumo.reduce((s,x)=>s+x.costo,indirecto);
 if(!entero(costo)||!entero(salida.stock+d.real)||!entero(salida.valor+costo)||r.movimientos.length+consumo.length+1>4000)throw Error("Límite de existencias, valor o movimientos.");
 // Todas las validaciones preceden a la modificación; POS guarda una única copia.
 for(const x of consumo)mover(r,ins(r,a.sucursal,x.id),a,-x.cantidad,-x.costo,"produccion_consumo",fecha,folio);
 mover(r,salida,a,d.real,costo,"produccion_entrada",fecha,folio);
 const lote={folio,id,nombre:salida.nombre,unidad:salida.unidad,sucursal:a.sucursal,empleado:a.empleado,rol:a.rol,fecha,repeticiones:d.repeticiones,previsto,real:d.real,merma:Math.max(0,previsto-d.real),indirecto,costo,consumo};r.lotes.unshift(lote);return lote;
}
