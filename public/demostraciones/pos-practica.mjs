import {leerDirectorio} from "./directorio-clientes.mjs";
import {fidelizacionVacia,validarFidelizacion,guardarPrograma,guardarPromocion,saldoPuntos,calcularBeneficio,comprobarReversion} from "./fidelizacion-practica.mjs";
import {admiteCotizaciones,validarCotizaciones,crearCotizacion,cambiarCotizacion,abrirOrden,avanzarOrden,anticipoCotizacion,anularAnticipo,buscarCotizacion,marcarVenta,saldoCotizacion} from "./cotizaciones-practica.mjs";
import {tienePermiso} from "./permisos-practica.mjs";
import {enviarInsumo,recibirInsumo,cancelarInsumo,consolidarInsumos,guardarSubreceta,producirLote,desactivarReceta,resumenRentabilidad,recetasVacias,validarRecetas,crearInsumo,entradaInsumo,mermaInsumo,guardarReceta,consumoRecetas,registrarRecetas,consultarRecetas} from "./recetas-practica.mjs";
import {comprasVacias,validarCompras,guardarProveedor,crearOrden,recibirCompra,devolverCompra,cerrarCompra,pagarCompra,resumenCompra,sugerirCompras} from "./compras-practica.mjs";
import {enviarTraspaso,recibirTraspaso,cancelarTraspaso,consolidarInventario} from "./almacen-practica.mjs";
import {valorarStock,inventarioVacio,validarInventario,configurarInventario,movimientoInventario,consumoVenta,registrarConsumo} from "./inventario-practica.mjs";
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
  const raw=storage.getItem(key);if(!raw)return {version:2,ventas:[],turnos:[],inventario:inventarioVacio(),compras:comprasVacias(),recetas:recetasVacias(),cotizaciones:[],fidelizacion:fidelizacionVacia()};
  if(raw.length>2000000)throw Error("Historial de práctica demasiado grande.");
  const v=JSON.parse(raw),d=Array.isArray(v)?{version:2,ventas:v,turnos:[]}:v;
  if(!d||d.version!==2||!Array.isArray(d.ventas)||d.ventas.length>LIM||!Array.isArray(d.turnos)||d.turnos.length>50||d.ventas.some(x=>!x||typeof x.folio!=="string"||!Array.isArray(x.detalle)||!["vendido","cancelado"].includes(x.estado))||d.turnos.some(t=>!t||typeof t.id!=="string"||!dinero(t.fondo)||!Array.isArray(t.movimientos)||t.movimientos.length>100||!["abierto","cerrado"].includes(t.estado)))throw Error("Historial de práctica inválido.");
  d.inventario=validarInventario(d.inventario??inventarioVacio());d.compras=validarCompras(d.compras??comprasVacias());d.recetas=validarRecetas(d.recetas??recetasVacias());d.cotizaciones=validarCotizaciones(d.cotizaciones??[]);d.fidelizacion=validarFidelizacion(d.fidelizacion??fidelizacionVacia());return copy(d);
 }
 function guardar(d){const raw=JSON.stringify(d);if(raw.length>2000000)throw Error("Límite de almacenamiento de práctica alcanzado.");storage.setItem(key,raw);}
 function abierto(d,s){return d.turnos.find(t=>t.sucursal===s&&t.estado==="abierto");}
 function turnoActor(d,a){const t=abierto(d,a.sucursal);if(!t)throw Error("Abre un turno de caja antes de registrar ventas.");if(t.empleado!==a.empleado&&!permite(a.sucursal,a.empleado,"caja.otros"))throw Error("El turno pertenece a otro empleado.");return t;}
 function abrir(sucursal,empleado,fondo){const a=autorizar(sucursal,empleado,"caja.abrir"),d=leerEstado();if(!dinero(fondo)||abierto(d,sucursal)||d.turnos.length>=50)throw Error("Fondo inválido, turno existente o límite alcanzado.");const id="CAJA-"+folio();if(!/^CAJA-[a-zA-Z0-9-]{1,80}$/.test(id)||d.turnos.some(t=>t.id===id))throw Error("Folio de turno inválido.");const t={...a,id,fondo,apertura:ahora(),estado:"abierto",movimientos:[]};d.turnos.unshift(t);guardar(d);return copy(t);}
 function mover(sucursal,empleado,tipo,importe,motivo){const a=autorizar(sucursal,empleado,"caja.movimientos"),d=leerEstado(),t=turnoActor(d,a);if(!dinero(importe)||importe===0||!Object.hasOwn(motivosCaja,tipo)||!motivosCaja[tipo].includes(motivo)||t.movimientos.length>=100)throw Error("Movimiento inválido.");if(tipo==="retiro"&&importe>resumenTurno(t,d.ventas).esperado)throw Error("Retiro superior al efectivo esperado.");t.movimientos.push({tipo,importe,motivo,fecha:ahora(),empleado,rol:a.rol});guardar(d);return copy(t);}
 function cerrar(sucursal,empleado,contado){const a=autorizar(sucursal,empleado,"caja.cerrar"),d=leerEstado(),t=turnoActor(d,a);if(!dinero(contado))throw Error("Efectivo contado inválido.");const r=resumenTurno(t,d.ventas);t.estado="cerrado";t.cierre={fecha:ahora(),empleado,rol:a.rol,contado,diferencia:contado-r.esperado,resumen:r};guardar(d);return copy(t);}
 function consultarCaja(sucursal,empleado){autorizar(sucursal,empleado,"caja.ver");const d=leerEstado();return d.turnos.filter(t=>t.sucursal===sucursal).map(t=>({...t,resumen:t.cierre?.resumen??resumenTurno(t,d.ventas)}));}
 function consultarInventario(sucursal,empleado){autorizar(sucursal,empleado,"inventario.ver");const i=leerEstado().inventario;return {productos:i.productos.filter(p=>p.sucursal===sucursal),movimientos:i.movimientos.filter(m=>m.sucursal===sucursal)};}
 function consultarAlmacen(sucursal,empleado){const a=autorizar(sucursal,empleado,"almacen.ver"),d=leerEstado(),empresaActual=empresa.leer(),global=["propietario","administrador"].includes(a.rol),alcance=global?Array.from({length:c.sucursales},(_,i)=>i+1):[sucursal];return {global,activas:empresaActual.activas,productos:d.inventario.productos.filter(p=>alcance.includes(p.sucursal)),movimientos:d.inventario.movimientos.filter(m=>alcance.includes(m.sucursal)),traspasos:d.inventario.traspasos.filter(t=>alcance.includes(t.origen)||alcance.includes(t.destino)),consolidado:global?consolidarInventario(d.inventario,alcance):[],insumos:plan==="p4"?d.recetas.insumos.filter(p=>alcance.includes(p.sucursal)):[],traspasosInsumos:plan==="p4"?(d.recetas.traspasos??[]).filter(t=>alcance.includes(t.origen)||alcance.includes(t.destino)):[],consolidadoInsumos:plan==="p4"&&global?consolidarInsumos(d.recetas,alcance):[]};}
 function enviarStock(sucursal,empleado,destino,id,cantidad){const a=autorizar(sucursal,empleado,"almacen.enviar"),d=leerEstado();if(!empresa.leer().activas.includes(destino))throw Error("Destino inactivo.");const t=enviarTraspaso(d.inventario,a,destino,id,cantidad,"TR-"+folio(),ahora());guardar(d);return copy(t);}
 function recibirStock(sucursal,empleado,f,cantidad,motivo){const a=autorizar(sucursal,empleado,"almacen.recibir"),d=leerEstado(),t=recibirTraspaso(d.inventario,a,f,cantidad,motivo,ahora());guardar(d);return copy(t);}
 function cancelarStock(sucursal,empleado,f){const a=autorizar(sucursal,empleado,"almacen.cancelar"),d=leerEstado(),t=cancelarTraspaso(d.inventario,a,f,ahora());guardar(d);return copy(t);}
 function enviarPreparacion(s,e,destino,id,n){const a=accesoRecetas(s,e,"almacen.enviar"),d=leerEstado();if(!empresa.leer().activas.includes(destino))throw Error("Destino inactivo.");const t=enviarInsumo(d.recetas,a,destino,id,n,"TI-"+folio(),ahora());guardar(d);return copy(t);}
 function recibirPreparacion(s,e,f,n,motivo){const a=accesoRecetas(s,e,"almacen.recibir"),d=leerEstado(),t=recibirInsumo(d.recetas,a,f,n,motivo,ahora());guardar(d);return copy(t);}
 function cancelarPreparacion(s,e,f){const a=accesoRecetas(s,e,"almacen.cancelar"),d=leerEstado(),t=cancelarInsumo(d.recetas,a,f,ahora());guardar(d);return copy(t);}
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
 function moverStock(sucursal,empleado,id,tipo,cantidad,motivo,costoUnitario=null){const a=autorizar(sucursal,empleado,"inventario.mover"),d=leerEstado(),p=movimientoInventario(d.inventario,a,id,tipo,cantidad,motivo,ahora(),costoUnitario);guardar(d);return copy(p);}
 function valorarMercancia(s,e,id,costo){const a=autorizar(s,e,"inventario.valorar"),d=leerEstado(),p=valorarStock(d.inventario,a,id,costo,ahora());guardar(d);return copy(p);}
 function resumenComercial(s,e){autorizar(s,e,"inventario.rentabilidad");const d=leerEstado(),ventas=d.ventas.filter(v=>v.sucursal===s&&v.estado==="vendido"),completas=ventas.filter(v=>v.costoComercialCompleto===true),ingresos=completas.reduce((n,v)=>n+v.total,0),costo=completas.reduce((n,v)=>n+v.costoComercialCentavos,0);return {ventas:ventas.length,completas:completas.length,ingresos,costo,margen:ingresos-costo,debajoCosto:completas.filter(v=>v.total<v.costoComercialCentavos).length};}
 function accesoCot(s,e,p){if(!admiteCotizaciones(id,plan))throw Error("Cotizaciones no incluidas.");return autorizar(s,e,p);}
 function verCotizaciones(s,e){accesoCot(s,e,"cotizaciones.ver");return leerEstado().cotizaciones.filter(x=>x.sucursal===s);}
 function cotizar(s,e,catalogo,lineas,datos){const a=accesoCot(s,e,"cotizaciones.crear"),d=leerEstado();if(datos.descuento>0)autorizar(s,e,"ventas.descuento");const x=crearCotizacion(d.cotizaciones,a,datos,resumirVenta(id,catalogo,lineas,datos.descuento??0),"COT-"+folio(),ahora(),leerDirectorio(storage,id));guardar(d);return copy(x);}
 function operarCot(s,e,p,fn){const a=accesoCot(s,e,p),d=leerEstado(),x=fn(d.cotizaciones,a,ahora());guardar(d);return copy(x);}
 function estadoCotizacion(s,e,f,estado){return operarCot(s,e,"cotizaciones.estado",(l,a,t)=>cambiarCotizacion(l,a,f,estado,t));}
 function ordenServicio(s,e,f){return operarCot(s,e,"cotizaciones.orden",(l,a,t)=>abrirOrden(l,a,f,"OS-"+folio(),t));}
 function estadoOrden(s,e,f,estado){return operarCot(s,e,"cotizaciones.orden",(l,a,t)=>avanzarOrden(l,a,f,estado,t));}
 function anticipo(s,e,f,n,ref){return operarCot(s,e,"cotizaciones.anticipos",(l,a,t)=>anticipoCotizacion(l,a,f,n,ref,t));}
 function quitarAnticipo(s,e,f,ref){return operarCot(s,e,"cotizaciones.anticipos",(l,a,t)=>anularAnticipo(l,a,f,ref,t));}
 function venderOrden(s,e,f,catalogo,pago){const a=accesoCot(s,e,"cotizaciones.convertir"),d=leerEstado(),x=buscarCotizacion(d.cotizaciones,a,f);if(x.orden?.estado!=="terminada"||saldoCotizacion(x)!==x.total)throw Error("Termina la orden y concilia los anticipos antes de cobrar.");const cat=x.detalle.map(l=>{const p=catalogo.find(p=>p.id===l.id);if(!p)throw Error("Artículo retirado del catálogo.");return {...p,nombre:l.nombre,precioCentavos:l.precioCentavos};});return vender(cat,x.detalle.map(l=>({id:l.id,cantidad:l.cantidad})),{...pago,sucursal:s,empleado:e,cliente:x.cliente,descuento:x.descuento,totalEsperado:x.total},f);}
 function historialCliente(s,e){const a=autorizar(s,e,"clientes.ver"),d=leerEstado(),global=["propietario","administrador"].includes(a.rol);return {ventas:permite(s,e,"ventas.ver")?d.ventas.filter(x=>global||x.sucursal===s):[],cotizaciones:permite(s,e,"cotizaciones.ver")?d.cotizaciones.filter(x=>global||x.sucursal===s):[],global};}
 function accesoFidel(s,e,p){if(plan!=="p4")throw Error("Beneficios incluidos en P4.");return autorizar(s,e,p);}
 function consultarBeneficios(s,e){accesoFidel(s,e,"fidelizacion.ver");const d=leerEstado();return {...d.fidelizacion,clientes:leerDirectorio(storage,id).map(c=>({...c,puntos:saldoPuntos(d.ventas,c.id)}))};}
 function programaBeneficios(s,e,datos){accesoFidel(s,e,"fidelizacion.configurar");const d=leerEstado(),p=guardarPrograma(d.fidelizacion,datos);guardar(d);return copy(p);}
 function promocion(s,e,datos,catalogo=[]){accesoFidel(s,e,"fidelizacion.configurar");const d=leerEstado(),p=guardarPromocion(d.fidelizacion,datos,catalogo);guardar(d);return copy(p);}
 function previsualizarBeneficio(catalogo,lineas,d){autorizar(d.sucursal,d.empleado,"ventas.cobrar");const r=resumirVenta(id,catalogo,lineas,d.descuento??0);if(plan!=="p4"){if(d.codigo||d.puntos)throw Error("Beneficios incluidos en P4.");return r;}const x=leerEstado();const v=calcularBeneficio(x.fidelizacion,x.ventas,r,d,ahora(),leerDirectorio(storage,id),catalogo);if(v.beneficio.rebaja>0&&permite(d.sucursal,d.empleado,"inventario.rentabilidad")){try{const a=autorizar(d.sucursal,d.empleado,"ventas.cobrar"),m=consumoVenta(x.inventario,a,v.detalle),i=consumoRecetas(x.recetas,a,v.detalle,{negocio:id,catalogo});const conocido=m.reduce((n,y)=>n+(y.costo??0),0)+i.costo;v.avisoCosto=v.total<conocido?"El total es inferior al costo conocido de la venta.":"";}catch{v.avisoCosto="No se pudo comprobar el costo de la promoción.";}}return v;}
 function vender(catalogo,lineas,d,cotizacion=null){
  const actor=autorizar(d.sucursal,d.empleado,"ventas.cobrar");if(d.descuento>0)autorizar(d.sucursal,d.empleado,"ventas.descuento");const r=cotizacion?resumirVenta(id,catalogo,lineas,d.descuento??0):previsualizarBeneficio(catalogo,lineas,d);
  if(!r.detalle.length)throw Error("Agrega productos o servicios.");
  if(r.total!==d.totalEsperado)throw Error("El total cambió. Revisa la venta.");
  if(d.cliente&&!leerDirectorio(storage,id).some(x=>x.id===d.cliente&&(x.activo||cotizacion)))throw Error("Cliente ficticio inválido.");
  const dEstado=leerEstado(),turno=turnoActor(dEstado,actor),ventas=dEstado.ventas;if(ventas.length>=LIM)throw Error("Límite de 50 ventas de práctica.");
  const f="POS-"+folio();if(!/^POS-[a-zA-Z0-9-]{1,80}$/.test(f)||ventas.some(x=>x.folio===f))throw Error("Folio duplicado.");
  if(plan==="p4"&&id==="taqueria-el-comal"&&r.detalle.some(l=>l.id==="combo-el-comal")&&dEstado.inventario.productos.some(p=>p.sucursal===actor.sucursal&&p.id==="combo-el-comal"&&p.activo)&&dEstado.recetas.recetas.some(v=>v.sucursal===actor.sucursal&&["pastor","agua","refresco"].includes(v.id)))throw Error("Desactiva el inventario del combo antes de consumir recetas de sus componentes.");const consumo=consumoVenta(dEstado.inventario,actor,r.detalle);const insumos=consumoRecetas(dEstado.recetas,actor,r.detalle,{negocio:plan==="p4"?id:"",catalogo});
  const idsReceta=new Set(dEstado.recetas.recetas.filter(v=>v.sucursal===actor.sucursal).map(v=>v.id)),costosMercancia=consumo.reduce((n,x)=>n+(x.costo??0),0),completoComercial=r.detalle.every(l=>idsReceta.has(l.id)?insumos.completo||(!l.opciones?.extras?.length&&!l.opciones?.omitir?.length&&!l.opciones?.variante):consumo.some(x=>x.id===l.id&&x.costo!==null))&&!(r.detalle.some(l=>l.opciones?.extras?.length||l.opciones?.omitir?.length||l.opciones?.variante)&&!insumos.completo);let v={...r,...actor,costoMercanciaCentavos:costosMercancia,costoComercialCentavos:costosMercancia+insumos.costo,costoComercialCompleto:insumos.completo||completoComercial,consumoInventario:consumo,consumoInsumos:insumos.consumo,costoRecetasCentavos:insumos.costo,costoCompleto:insumos.completo,detalleRecetas:insumos.partidas,folio:f,turno:turno.id,creado:ahora(),cliente:d.cliente||"",estado:"recibido",revisionCobro:0};
  if(r.total>0){v=aplicarCobro(v,{accion:"registrar",revision:0,totalEsperado:r.total,metodo:d.metodo,recibidoCentavos:d.recibidoCentavos,referencia:d.referencia},ahora());if(referenciaRepetida(ventas,v,v.cobro))throw Error("Folio de cobro repetido.");}
  else if(d.recibidoCentavos!==0)throw Error("Venta sin cargo no admite cobro.");
  registrarConsumo(dEstado.inventario,actor,consumo,f,ahora());registrarRecetas(dEstado.recetas,actor,insumos.consumo,ahora(),f);
  v.estado="vendido";if(cotizacion){accesoCot(d.sucursal,d.empleado,"cotizaciones.convertir");marcarVenta(dEstado.cotizaciones,actor,cotizacion,f,ahora());v.cotizacion=cotizacion;}dEstado.ventas=[v,...ventas];guardar(dEstado);return copy(v);
 }
 function cancelar(f,sucursal,empleado,motivo){
  const actor=autorizar(sucursal,empleado,"ventas.cancelar"),dEstado=leerEstado(),ventas=dEstado.ventas,v=ventas.find(x=>x.folio===f&&x.sucursal===sucursal);
  if(v?.estado==="vendido")comprobarReversion(ventas,v);if(v?.cotizacion)throw Error("La reversión de ventas de órdenes requiere conciliación especializada.");if(!v||v.estado!=="vendido"||!motivosAnulacion.includes(motivo))throw Error("Cancelación inválida.");
  if(v.turno){const t=turnoActor(dEstado,actor);if(t.id!==v.turno)throw Error("No se modifica una venta de turno cerrado.");if(v.cobro?.metodo==="efectivo"&&v.total>resumenTurno(t,ventas).esperado)throw Error("Efectivo insuficiente para anular la venta.");}
  if(v.cobro)Object.assign(v,aplicarCobro(v,{accion:"anular",revision:v.revisionCobro,motivo},ahora()));
  registrarConsumo(dEstado.inventario,actor,v.consumoInventario??[],f,ahora(),true);registrarRecetas(dEstado.recetas,actor,v.consumoInsumos??[],ahora(),f,true);
  v.estado="cancelado";v.cancelacion={...actor,motivo,fecha:ahora()};guardar(dEstado);return copy(v);
 }
 return {contexto,permite,leer:s=>{autorizar(s.sucursal,s.empleado,"ventas.ver");return leerEstado().ventas.filter(v=>v.sucursal===s.sucursal);},vender:(catalogo,lineas,d)=>vender(catalogo,lineas,d),historialCliente,consultarBeneficios,programaBeneficios,promocion,previsualizarBeneficio,verCotizaciones,cotizar,estadoCotizacion,ordenServicio,estadoOrden,anticipo,quitarAnticipo,venderOrden,cancelar,abrir,mover,cerrar,consultarCaja,consultarInventario,configurarStock,moverStock,valorarMercancia,resumenComercial,consultarAlmacen,enviarStock,recibirStock,cancelarStock,enviarPreparacion,recibirPreparacion,cancelarPreparacion,consultarCompras,proveedor,ordenar,recibirOrden,devolverOrden,cerrarOrden,pagarOrden,verRecetas,nuevoInsumo,comprarInsumo,perderInsumo,editarReceta,editarSubreceta,producir,quitarReceta,rentabilidad,empresa:()=>empresa.leer()};
}
