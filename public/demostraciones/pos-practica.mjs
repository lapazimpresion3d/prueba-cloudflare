import {tienePermiso} from "./permisos-practica.mjs";
import {guardarSubreceta,producirLote,desactivarReceta,resumenRentabilidad,recetasVacias,validarRecetas,crearInsumo,entradaInsumo,mermaInsumo,guardarReceta,consumoRecetas,registrarRecetas,consultarRecetas} from "./recetas-practica.mjs";
import {comprasVacias,validarCompras,guardarProveedor,crearOrden,recibirCompra,devolverCompra,cerrarCompra,pagarCompra,resumenCompra,sugerirCompras} from "./compras-practica.mjs";
import {enviarTraspaso,recibirTraspaso,cancelarTraspaso,consolidarInventario} from "./almacen-practica.mjs";
import {inventarioVacio,validarInventario,configurarInventario,movimientoInventario,consumoVenta,registrarConsumo} from "./inventario-practica.mjs";
// POS local de práctica. No transmite ventas ni usa proveedores financieros.
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {capacidades} from "./config.mjs";
import {normalizarOpciones,claveLinea} from "./menu-comal-practica.mjs";
import {aplicarCobro,referenciaRepetida,motivosAnulacion} from "./cobros-practica.mjs";
import {clientesDemo} from "./clientes-practica.mjs";
import {contextoEmpresa,almacenEmpresa} from "./empresa-practica.mjs";
const MAX=100000000,LIM=50,copy=x=>JSON.parse(JSON.stringify(x));
const supervisor=r=>["propietario","administrador","encargado"].includes(r);
const dinero=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX;
export const motivosCaja=Object.freeze({ingreso:["Cambio adicional","Reposición de fondo"],retiro:["Resguardo de efectivo","Gasto ficticio"]});
export function resumenTurno(t,ventas){
 const r={fondo:t.fondo,efectivo:0,transferencia:0,tarjeta_externa:0,ingresos:0,retiros:0,canceladas:0,ventas:0,sinCargo:0};
 for(const v of ventas.filter(v=>v.turno===t.id&&v.sucursal===t.sucursal)){
  if(v.estado==="cancelado"){r.canceladas++;continue;}
  r.ventas++;if(v.cobro)r[v.cobro.metodo]+=v.cobro.importeCentavos;else r.sinCargo++;
 }
 for(const m of t.movimientos)r[m.tipo==="ingreso"?"ingresos":"retiros"]+=m.importe;
 r.totalVentas=r.efectivo+r.transferencia+r.tarjeta_externa;
 r.esperado=r.fondo+r.efectivo+r.ingresos-r.retiros;return r;
}
export function admitePos(id,plan){return capacidades(obtenerEstablecimiento(id),plan).some(m=>m.id==="pos"&&m.estadoEfectivo==="disponible");}
export function resumirVenta(id,catalogo,lineas,descuento=0){
 if(!obtenerEstablecimiento(id)||!Array.isArray(catalogo)||!Array.isArray(lineas)||lineas.length>30||!Number.isSafeInteger(descuento)||descuento<0||descuento>100)throw Error("Venta inválida.");
 const vistos=new Set(),detalle=lineas.map(l=>{
  if(!l||!Number.isSafeInteger(l.cantidad)||l.cantidad<1||l.cantidad>20)throw Error("Cantidad inválida.");
  const p=catalogo.find(p=>p.id===l.id);
  if(!p||p.disponible===false||!["fisico","alimento","servicio"].includes(p.tipo)||!Number.isSafeInteger(p.precioCentavos)||p.precioCentavos<0||p.precioCentavos>MAX)throw Error("Producto o servicio no disponible.");
  const o=normalizarOpciones(id,p,catalogo,l.opciones),v={id:p.id,nombre:p.nombre,cantidad:l.cantidad,precioCentavos:o.precio,subtotal:o.precio*l.cantidad,...(o.seleccion?{opciones:o.seleccion,personalizacion:o.detalles}:{})};
  const k=claveLinea(v);if(vistos.has(k))throw Error("Partida duplicada.");vistos.add(k);return v;
 });
 const subtotal=detalle.reduce((n,l)=>n+l.subtotal,0);if(!Number.isSafeInteger(subtotal)||subtotal>MAX)throw Error("Importe supera límite de práctica.");
 const descuentoCentavos=Math.round(subtotal*descuento/100);
 return {detalle,subtotal,descuento,descuentoCentavos,total:subtotal-descuentoCentavos};
}
export function crearPosPractica(storage,id,plan,{empresaStorage=storage,ahora=Date.now,folio=()=>crypto.randomUUID()}={}){
 if(!admitePos(id,plan))throw Error("POS incluido solo en P3 y P4.");
 const c=contextoEmpresa(id,plan),empresa=almacenEmpresa(c,empresaStorage),key="lapaz:pos:practica:v1:"+id+":"+plan;
 function contexto(sucursal,empleado,supervisor=false){
  const d=empresa.leer(),rol=d.personal[empleado];
  if(!Number.isInteger(sucursal)||!d.activas.includes(sucursal)||!Number.isInteger(empleado)||!rol||d.asignaciones[empleado]!==null&&d.asignaciones[empleado]!==sucursal||supervisor&&!["propietario","administrador","encargado"].includes(rol))throw Error("Rol o sucursal de práctica no autorizado.");
  return {sucursal,empleado,rol};
 }
 function autorizar(s,e,p){const a=contexto(s,e);if(!tienePermiso(empresa.leer(),e,p))throw Error("El rol no tiene permiso: "+p);return a;}
 function permite(s,e,p){try{autorizar(s,e,p);return true;}catch{return false;}}
 // Un único registro de almacenamiento evita escrituras separadas de caja y ventas.
 function leerEstado(){
  if(!storage)throw Error("Almacenamiento no disponible.");
  const raw=storage.getItem(key);if(!raw)return {version:2,ventas:[],turnos:[],inventario:inventarioVacio(),compras:comprasVacias(),recetas:recetasVacias()};
  if(raw.length>2000000)throw Error("Historial de práctica demasiado grande.");
  const v=JSON.parse(raw),d=Array.isArray(v)?{version:2,ventas:v,turnos:[]}:v;
  if(!d||d.version!==2||!Array.isArray(d.ventas)||d.ventas.length>LIM||!Array.isArray(d.turnos)||d.turnos.length>50||d.ventas.some(x=>!x||typeof x.folio!=="string"||!Array.isArray(x.detalle)||!["vendido","cancelado"].includes(x.estado))||d.turnos.some(t=>!t||typeof t.id!=="string"||!dinero(t.fondo)||!Array.isArray(t.movimientos)||t.movimientos.length>100||!["abierto","cerrado"].includes(t.estado)))throw Error("Historial de práctica inválido.");
  d.inventario=validarInventario(d.inventario??inventarioVacio());d.compras=validarCompras(d.compras??comprasVacias());d.recetas=validarRecetas(d.recetas??recetasVacias());return copy(d);
 }
 function guardar(d){const raw=JSON.stringify(d);if(raw.length>2000000)throw Error("Límite de almacenamiento de práctica alcanzado.");storage.setItem(key,raw);}
 function abierto(d,s){return d.turnos.find(t=>t.sucursal===s&&t.estado==="abierto");}
 function turnoActor(d,a){const t=abierto(d,a.sucursal);if(!t)throw Error("Abre un turno de caja antes de registrar ventas.");if(t.empleado!==a.empleado&&!permite(a.sucursal,a.empleado,"caja.otros"))throw Error("El turno pertenece a otro empleado.");return t;}
 function abrir(sucursal,empleado,fondo){const a=autorizar(sucursal,empleado,"caja.abrir"),d=leerEstado();if(!dinero(fondo)||abierto(d,sucursal)||d.turnos.length>=50)throw Error("Fondo inválido, turno existente o límite alcanzado.");const id="CAJA-"+folio();if(!/^CAJA-[a-zA-Z0-9-]{1,80}$/.test(id)||d.turnos.some(t=>t.id===id))throw Error("Folio de turno inválido.");const t={...a,id,fondo,apertura:ahora(),estado:"abierto",movimientos:[]};d.turnos.unshift(t);guardar(d);return copy(t);}
 function mover(sucursal,empleado,tipo,importe,motivo){const a=autorizar(sucursal,empleado,"caja.movimientos"),d=leerEstado(),t=turnoActor(d,a);if(!dinero(importe)||importe===0||!Object.hasOwn(motivosCaja,tipo)||!motivosCaja[tipo].includes(motivo)||t.movimientos.length>=100)throw Error("Movimiento inválido.");if(tipo==="retiro"&&importe>resumenTurno(t,d.ventas).esperado)throw Error("Retiro superior al efectivo esperado.");t.movimientos.push({tipo,importe,motivo,fecha:ahora(),empleado,rol:a.rol});guardar(d);return copy(t);}
 function cerrar(sucursal,empleado,contado){const a=autorizar(sucursal,empleado,"caja.cerrar"),d=leerEstado(),t=turnoActor(d,a);if(!dinero(contado))throw Error("Efectivo contado inválido.");const r=resumenTurno(t,d.ventas);t.estado="cerrado";t.cierre={fecha:ahora(),empleado,rol:a.rol,contado,diferencia:contado-r.esperado,resumen:r};guardar(d);return copy(t);}
 function consultarCaja(sucursal,empleado){autorizar(sucursal,empleado,"caja.ver");const d=leerEstado();return d.turnos.filter(t=>t.sucursal===sucursal).map(t=>({...t,resumen:t.cierre?.resumen??resumenTurno(t,d.ventas)}));}
 function consultarInventario(sucursal,empleado){autorizar(sucursal,empleado,"inventario.ver");const i=leerEstado().inventario;return {productos:i.productos.filter(p=>p.sucursal===sucursal),movimientos:i.movimientos.filter(m=>m.sucursal===sucursal)};}
 function consultarAlmacen(sucursal,empleado){const a=autorizar(sucursal,empleado,"almacen.ver"),d=leerEstado(),empresaActual=empresa.leer(),global=["propietario","administrador"].includes(a.rol),alcance=global?Array.from({length:c.sucursales},(_,i)=>i+1):[sucursal];return {global,activas:empresaActual.activas,productos:d.inventario.productos.filter(p=>alcance.includes(p.sucursal)),movimientos:d.inventario.movimientos.filter(m=>alcance.includes(m.sucursal)),traspasos:d.inventario.traspasos.filter(t=>alcance.includes(t.origen)||alcance.includes(t.destino)),consolidado:global?consolidarInventario(d.inventario,alcance):[]};}
 function enviarStock(sucursal,empleado,destino,id,cantidad){const a=autorizar(sucursal,empleado,"almacen.enviar"),d=leerEstado();if(!empresa.leer().activas.includes(destino))throw Error("Destino inactivo.");const t=enviarTraspaso(d.inventario,a,destino,id,cantidad,"TR-"+folio(),ahora());guardar(d);return copy(t);}
 function recibirStock(sucursal,empleado,f,cantidad,motivo){const a=autorizar(sucursal,empleado,"almacen.recibir"),d=leerEstado(),t=recibirTraspaso(d.inventario,a,f,cantidad,motivo,ahora());guardar(d);return copy(t);}
 function cancelarStock(sucursal,empleado,f){const a=autorizar(sucursal,empleado,"almacen.cancelar"),d=leerEstado(),t=cancelarTraspaso(d.inventario,a,f,ahora());guardar(d);return copy(t);}
 function consultarCompras(sucursal,empleado){const a=autorizar(sucursal,empleado,"compras.ver"),d=leerEstado();return {proveedores:d.compras.proveedores,ordenes:d.compras.ordenes.filter(o=>o.sucursal===sucursal).map(o=>({...o,resumen:resumenCompra(o)})),sugerencias:sugerirCompras(d.compras,d.inventario,sucursal),insumos:plan==="p4"?d.recetas.insumos.filter(x=>x.sucursal===sucursal):[],editarProveedores:permite(sucursal,empleado,"compras.proveedor")};}
 function proveedor(sucursal,empleado,id,datos,catalogo){const a=autorizar(sucursal,empleado,"compras.proveedor"),d=leerEstado();if(!["propietario","administrador"].includes(a.rol))throw Error("Solo administración edita proveedores.");if(id&&!d.compras.proveedores.some(p=>p.id===id))throw Error("Proveedor desconocido.");const p=guardarProveedor(d.compras,id||"PROV-"+folio(),datos,[...catalogo.filter(x=>!x.id.startsWith("IN-")),...(plan==="p4"?d.recetas.insumos.map(x=>({id:x.id,tipo:"insumo"})):[])]);guardar(d);return copy(p);}
 function ordenar(sucursal,empleado,proveedor,lineas){const a=autorizar(sucursal,empleado,"compras.ordenar"),d=leerEstado(),o=crearOrden(d.compras,d.inventario,a,proveedor,lineas,"OC-"+folio(),ahora(),d.recetas);guardar(d);return copy(o);}
 function recibirOrden(sucursal,empleado,f,id,n){const a=autorizar(sucursal,empleado,"compras.recibir"),d=leerEstado(),o=recibirCompra(d.compras,d.inventario,a,f,id,n,ahora(),d.recetas);guardar(d);return copy(o);}
 function devolverOrden(sucursal,empleado,f,id,n){const a=autorizar(sucursal,empleado,"compras.devolver"),d=leerEstado(),o=devolverCompra(d.compras,d.inventario,a,f,id,n,ahora(),d.recetas);guardar(d);return copy(o);}
 function cerrarOrden(sucursal,empleado,f){const a=autorizar(sucursal,empleado,"compras.cerrar"),d=leerEstado(),o=cerrarCompra(d.compras,a,f,ahora());guardar(d);return copy(o);}
 function pagarOrden(sucursal,empleado,f,n,ref){const a=autorizar(sucursal,empleado,"compras.pagar"),d=leerEstado();if(!["propietario","administrador"].includes(a.rol))throw Error("Solo administración registra pagos ficticios.");const o=pagarCompra(d.compras,a,f,n,ref,ahora());guardar(d);return copy(o);}
 function accesoRecetas(s,e,p){if(plan!=="p4")throw Error("Recetas incluidas en P4.");return autorizar(s,e,p);}
 function verRecetas(s,e,catalogo){accesoRecetas(s,e,"recetas.ver");return consultarRecetas(leerEstado().recetas,s,catalogo);}
 function nuevoInsumo(s,e,datos){const a=accesoRecetas(s,e,"recetas.insumo"),d=leerEstado(),p=crearInsumo(d.recetas,a,"IN-"+folio(),datos,ahora());guardar(d);return copy(p);}
 function comprarInsumo(s,e,id,n,costo){const a=accesoRecetas(s,e,"recetas.entrada"),d=leerEstado(),p=entradaInsumo(d.recetas,a,id,n,costo,ahora());guardar(d);return copy(p);}
 function perderInsumo(s,e,id,n){const a=accesoRecetas(s,e,"recetas.merma"),d=leerEstado(),p=mermaInsumo(d.recetas,a,id,n,ahora());guardar(d);return copy(p);}
 function editarReceta(s,e,catalogo,productoId,datos){if(id==="taqueria-el-comal"&&productoId==="combo-el-comal")throw Error("El combo utiliza las recetas de sus componentes.");const a=accesoRecetas(s,e,"recetas.editar"),d=leerEstado();if(d.inventario.productos.some(p=>p.sucursal===s&&p.id===productoId&&p.activo))throw Error("Desactiva el control de producto terminado antes de usar receta.");const v=guardarReceta(d.recetas,a,catalogo,productoId,datos);guardar(d);return copy(v);}
 function editarSubreceta(s,e,id,datos){const a=accesoRecetas(s,e,"produccion.configurar"),d=leerEstado(),v=guardarSubreceta(d.recetas,a,id,datos);guardar(d);return copy(v);}
 function producir(s,e,id,datos){const a=accesoRecetas(s,e,"produccion.registrar"),d=leerEstado(),v=producirLote(d.recetas,a,id,datos,"LOTE-"+folio(),ahora());guardar(d);return copy(v);}
 function quitarReceta(s,e,id){const a=accesoRecetas(s,e,"recetas.quitar"),d=leerEstado();desactivarReceta(d.recetas,a,id);guardar(d);}
 function rentabilidad(s,e){accesoRecetas(s,e,"recetas.rentabilidad");return resumenRentabilidad(leerEstado().ventas.filter(v=>v.sucursal===s));}
 function configurarStock(sucursal,empleado,catalogo,id,config){const a=autorizar(sucursal,empleado,"inventario.configurar"),d=leerEstado(),p=(()=>{if(config.activo&&plan==="p4"&&c.negocio.id==="taqueria-el-comal"&&id==="combo-el-comal")throw Error("El combo consume sus componentes.");if(config.activo&&d.recetas.recetas.some(r=>r.sucursal===sucursal&&r.id===id))throw Error("El producto ya consume insumos mediante receta.");if(!config.activo&&d.compras.ordenes.some(o=>o.sucursal===sucursal&&o.estado==="abierta"&&o.lineas.some(l=>l.id===id&&l.recibido<l.cantidad)))throw Error("Hay compras pendientes para este producto.");if(!config.activo&&d.inventario.traspasos.some(t=>t.estado==="transito"&&t.id===id&&(t.origen===sucursal||t.destino===sucursal)))throw Error("Hay traspasos pendientes para este producto.");return configurarInventario(d.inventario,a,catalogo,id,config,ahora());})();guardar(d);return copy(p);}
 function moverStock(sucursal,empleado,id,tipo,cantidad,motivo){const a=autorizar(sucursal,empleado,"inventario.mover"),d=leerEstado(),p=movimientoInventario(d.inventario,a,id,tipo,cantidad,motivo,ahora());guardar(d);return copy(p);}
 function vender(catalogo,lineas,d){
  const actor=autorizar(d.sucursal,d.empleado,"ventas.cobrar");if(d.descuento>0)autorizar(d.sucursal,d.empleado,"ventas.descuento");const r=resumirVenta(id,catalogo,lineas,d.descuento??0);
  if(!r.detalle.length)throw Error("Agrega productos o servicios.");
  if(r.total!==d.totalEsperado)throw Error("El total cambió. Revisa la venta.");
  if(d.cliente&&!clientesDemo.some(x=>x.id===d.cliente))throw Error("Cliente ficticio inválido.");
  const dEstado=leerEstado(),turno=turnoActor(dEstado,actor),ventas=dEstado.ventas;if(ventas.length>=LIM)throw Error("Límite de 50 ventas de práctica.");
  const f="POS-"+folio();if(!/^POS-[a-zA-Z0-9-]{1,80}$/.test(f)||ventas.some(x=>x.folio===f))throw Error("Folio duplicado.");
  if(plan==="p4"&&id==="taqueria-el-comal"&&r.detalle.some(l=>l.id==="combo-el-comal")&&dEstado.inventario.productos.some(p=>p.sucursal===actor.sucursal&&p.id==="combo-el-comal"&&p.activo)&&dEstado.recetas.recetas.some(v=>v.sucursal===actor.sucursal&&["pastor","agua","refresco"].includes(v.id)))throw Error("Desactiva el inventario del combo antes de consumir recetas de sus componentes.");const consumo=consumoVenta(dEstado.inventario,actor,r.detalle);const insumos=consumoRecetas(dEstado.recetas,actor,r.detalle,{negocio:plan==="p4"?id:"",catalogo});
  let v={...r,...actor,consumoInventario:consumo,consumoInsumos:insumos.consumo,costoRecetasCentavos:insumos.costo,costoCompleto:insumos.completo,detalleRecetas:insumos.partidas,folio:f,turno:turno.id,creado:ahora(),cliente:d.cliente||"",estado:"recibido",revisionCobro:0};
  if(r.total>0){v=aplicarCobro(v,{accion:"registrar",revision:0,totalEsperado:r.total,metodo:d.metodo,recibidoCentavos:d.recibidoCentavos,referencia:d.referencia},ahora());if(referenciaRepetida(ventas,v,v.cobro))throw Error("Folio de cobro repetido.");}
  else if(d.recibidoCentavos!==0)throw Error("Venta sin cargo no admite cobro.");
  registrarConsumo(dEstado.inventario,actor,consumo,f,ahora());registrarRecetas(dEstado.recetas,actor,insumos.consumo,ahora(),f);
  v.estado="vendido";dEstado.ventas=[v,...ventas];guardar(dEstado);return copy(v);
 }
 function cancelar(f,sucursal,empleado,motivo){
  const actor=autorizar(sucursal,empleado,"ventas.cancelar"),dEstado=leerEstado(),ventas=dEstado.ventas,v=ventas.find(x=>x.folio===f&&x.sucursal===sucursal);
  if(!v||v.estado!=="vendido"||!motivosAnulacion.includes(motivo))throw Error("Cancelación inválida.");
  if(v.turno){const t=turnoActor(dEstado,actor);if(t.id!==v.turno)throw Error("No se modifica una venta de turno cerrado.");if(v.cobro?.metodo==="efectivo"&&v.total>resumenTurno(t,ventas).esperado)throw Error("Efectivo insuficiente para anular la venta.");}
  if(v.cobro)Object.assign(v,aplicarCobro(v,{accion:"anular",revision:v.revisionCobro,motivo},ahora()));
  registrarConsumo(dEstado.inventario,actor,v.consumoInventario??[],f,ahora(),true);registrarRecetas(dEstado.recetas,actor,v.consumoInsumos??[],ahora(),f,true);
  v.estado="cancelado";v.cancelacion={...actor,motivo,fecha:ahora()};guardar(dEstado);return copy(v);
 }
 return {contexto,permite,leer:s=>{autorizar(s.sucursal,s.empleado,"ventas.ver");return leerEstado().ventas.filter(v=>v.sucursal===s.sucursal);},vender,cancelar,abrir,mover,cerrar,consultarCaja,consultarInventario,configurarStock,moverStock,consultarAlmacen,enviarStock,recibirStock,cancelarStock,consultarCompras,proveedor,ordenar,recibirOrden,devolverOrden,cerrarOrden,pagarOrden,verRecetas,nuevoInsumo,comprarInsumo,perderInsumo,editarReceta,editarSubreceta,producir,quitarReceta,rentabilidad,empresa:()=>empresa.leer()};
}
