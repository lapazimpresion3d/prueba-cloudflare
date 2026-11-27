import {admiteCuentas,cuentaIdValida} from "../public/demostraciones/cuentas-practica.mjs";
import {cuentasListas} from "./cuentas-demo.mjs";
import {aplicarCobro,validarCambioPedido} from "../public/demostraciones/cobros-practica.mjs";
import {datosPedidoDemo,seleccionPedido} from "../public/demostraciones/clientes-practica.mjs";
import {admitePedidos,resumirPedidoConfirmado,transicionesPedido} from "../public/demostraciones/pedidos-practica.mjs";
import {leerJsonLimitado} from "./seguridad.mjs";
const error=(json,m,status)=>json({error:m},status);
const ahora=()=>Math.floor(Date.now()/1000);
const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const huella=async x=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(x)))),b=>b.toString(16).padStart(2,"0")).join("");
const leerFila=f=>JSON.parse(f.datos_json);
export async function pedidosListos(db){
  try{return (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='demo_pedidos'").first())?.name==="demo_pedidos";}catch{return false;}
}
export async function atenderPedidosDemo(request,db,s,ctx,json){
  const id=ctx.establecimiento.id;
  if(!admitePedidos(id,ctx.plan.id))return error(json,"Pedidos no incluidos en este plan o giro.",403);
  if(!await pedidosListos(db))return error(json,"Guardado de pedidos pendiente de configuración.",503);
  const buscar=solicitud=>db.prepare("SELECT huella,estado,datos_json FROM demo_pedidos WHERE sesion_id=? AND establecimiento_id=? AND solicitud_id=?").bind(s.id,id,solicitud).first();
  if(request.method==="GET"){
    const filas=await db.prepare("SELECT datos_json FROM demo_pedidos WHERE sesion_id=? AND establecimiento_id=? AND EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) ORDER BY creado DESC, solicitud_id DESC LIMIT 30").bind(s.id,id,s.id,ahora()).all();
    const cuentas=id==="taqueria-el-comal"&&await cuentasListas(db)?(await db.prepare("SELECT cuenta_id,mesa,personas,abierto,cerrado FROM demo_cuentas WHERE sesion_id=? ORDER BY abierto DESC LIMIT 30").bind(s.id).all()).results:[];
    return json({establecimiento:id,pedidos:filas.results.map(leerFila),expira:s.expira,cuentas});
  }
  const datos=await leerJsonLimitado(request,12000);
  if(!uuid(datos?.solicitud))return error(json,"Identificador de solicitud inválido.",400);
  if(request.method==="POST"){
    if(!["original","personalizado"].includes(datos.catalogo)||!Array.isArray(datos.lineas)||!datos.lineas.length||datos.lineas.length>30||!Number.isSafeInteger(datos.totalEsperado)||datos.totalEsperado<0)return error(json,"Pedido inválido.",400);
    const lineas=datos.lineas.map(l=>({id:l?.id,cantidad:l?.cantidad,precioEsperado:l?.precioEsperado,...(l?.opciones!==undefined?{opciones:l.opciones}:{})}));
    if(lineas.some(l=>typeof l.id!=="string"||!/^[a-z0-9-]{1,80}$/.test(l.id)||!Number.isSafeInteger(l.cantidad)||l.cantidad<1||l.cantidad>20||!Number.isSafeInteger(l.precioEsperado)||l.precioEsperado<0))return error(json,"Líneas inválidas.",400);
    let seleccion,cliente;try{if(datos.datosCliente!==undefined){seleccion=seleccionPedido(datos.datosCliente,datos.modalidad,ctx.establecimiento.giro);cliente=datosPedidoDemo(seleccion,datos.modalidad,ctx.establecimiento.giro);}}catch(e){return error(json,e.message,400);}
    if(datos.horarioEntrega!==undefined&&(id!=="taqueria-el-comal"||datos.modalidad!=="domicilio"||!["actual","simulado"].includes(datos.horarioEntrega)))return error(json,"Modo de entrega inválido.",400);
    const cuenta=datos.cuenta;let captura;if(cuenta!==undefined){if(!admiteCuentas(id,ctx.plan.id)||!cuentaIdValida(cuenta)||datos.modalidad!=="local"||!cliente?.mesa||!["mesero","cliente"].includes(datos.captura))return error(json,"Comanda de cuenta inválida.",400);captura=datos.captura;if(!await cuentasListas(db))return error(json,"Cuentas no configuradas.",503);}
    const firma=await huella({...(cuenta?{cuenta,captura}:{}),...(seleccion?{datosCliente:seleccion}:{}),...(datos.horarioEntrega!==undefined?{horarioEntrega:datos.horarioEntrega}:{}),catalogo:datos.catalogo,lineas,modalidad:datos.modalidad,totalEsperado:datos.totalEsperado});
    const previo=await buscar(datos.solicitud);
    if(previo)return previo.huella===firma?json({pedido:leerFila(previo),repetido:true}):error(json,"Esta solicitud ya corresponde a otro pedido.",409);
    let catalogo=ctx.establecimiento.catalogo,revision=0;
    if(datos.catalogo==="personalizado"){
      const fila=await db.prepare("SELECT revision,datos_json FROM demo_catalogos WHERE sesion_id=? AND establecimiento_id=?").bind(s.id,id).first();
      if(!fila)return error(json,"Guarda primero el catálogo personalizado en el servidor.",409);
      catalogo=JSON.parse(fila.datos_json);revision=fila.revision;
    }
    let resumen;try{resumen=resumirPedidoConfirmado(id,catalogo,lineas,datos.modalidad,seleccion,datos.horarioEntrega??"actual");}catch(e){return error(json,e.message,400);}
    if(resumen.total!==datos.totalEsperado||resumen.detalle.some((l,i)=>l.precioCentavos!==lineas[i].precioEsperado))return error(json,"Los precios del catálogo guardado cambiaron. Revisa y recupera el catálogo antes de pedir.",409);
    const fecha=Date.now(),pedido={...resumen,...(cuenta?{cuenta,captura}:{}),...(cliente?{datosCliente:cliente}:{}),folio:"DEMO-"+datos.solicitud,solicitud:datos.solicitud,estado:"recibido",creado:fecha,historial:[{estado:"recibido",fecha}]};
    // El límite y la revisión del catálogo se verifican dentro del mismo INSERT atómico.
    const condicionCuenta=cuenta?" AND EXISTS (SELECT 1 FROM demo_cuentas WHERE sesion_id=? AND cuenta_id=? AND mesa=? AND cerrado IS NULL) ":"";
    const fila=await db.prepare("INSERT INTO demo_pedidos (sesion_id,establecimiento_id,solicitud_id,huella,estado,creado,datos_json) SELECT ?,?,?,?,'recibido',?,? WHERE EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) AND (SELECT count(*) FROM demo_pedidos WHERE sesion_id=? AND establecimiento_id=?)<30 AND (?=0 OR EXISTS (SELECT 1 FROM demo_catalogos WHERE sesion_id=? AND establecimiento_id=? AND revision=?))"+condicionCuenta+" ON CONFLICT(sesion_id,establecimiento_id,solicitud_id) DO NOTHING RETURNING datos_json").bind(s.id,id,datos.solicitud,firma,fecha,JSON.stringify(pedido),s.id,ahora(),s.id,id,revision,s.id,id,revision,...(cuenta?[s.id,cuenta,cliente.mesa]:[])).first();
    if(fila)return json({pedido:leerFila(fila),repetido:false},201);
    const repetido=await buscar(datos.solicitud);
    if(repetido)return repetido.huella===firma?json({pedido:leerFila(repetido),repetido:true}):error(json,"Esta solicitud ya corresponde a otro pedido.",409);
    return error(json,cuenta?"La cuenta no está abierta en esta mesa, la sesión expiró, el catálogo cambió o alcanzaste 30 pedidos. Regresa a cuentas y actualiza.":"La sesión expiró, el catálogo cambió o alcanzaste 30 pedidos. Actualiza antes de continuar.",409);
  }
  const fila=await buscar(datos.solicitud);
  if(!fila)return error(json,"Pedido no encontrado en esta práctica.",404);
  const previo=leerFila(fila),cuenta=previo.cuenta;
  if(cuenta&&!await cuentasListas(db))return error(json,"Cuentas no configuradas.",503);
  const abierta=cuenta?" AND EXISTS(SELECT 1 FROM demo_cuentas WHERE sesion_id=? AND cuenta_id=? AND cerrado IS NULL) ":"";
  const argsCuenta=cuenta?[s.id,cuenta]:[];
  if(datos.cobro!==undefined){
    let p;try{p=aplicarCobro(leerFila(fila),datos.cobro);}catch(e){return error(json,e.message,409);}
    const referencia=p.cobro?.referencia||"";
    const actual=await db.prepare("UPDATE demo_pedidos SET datos_json=? WHERE sesion_id=? AND establecimiento_id=? AND solicitud_id=? AND estado=? AND datos_json=? AND EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?) AND (?='' OR NOT EXISTS(SELECT 1 FROM demo_pedidos AS otro WHERE otro.sesion_id=? AND otro.establecimiento_id=? AND otro.solicitud_id<>? AND json_extract(otro.datos_json,'$.cobro.referencia')=?))"+abierta+" RETURNING datos_json").bind(JSON.stringify(p),s.id,id,datos.solicitud,fila.estado,fila.datos_json,s.id,ahora(),referencia,s.id,id,datos.solicitud,referencia,...argsCuenta).first();
    return actual?json({pedido:leerFila(actual)}):error(json,"El pedido cambió, la sesión caducó o el folio ya fue utilizado. Actualiza antes de continuar.",409);
  }
  if(fila.estado!==datos.esperado||!transicionesPedido(fila.estado).includes(datos.destino))return error(json,"El estado cambió o la transición no está permitida.",409);
  const p=leerFila(fila);try{validarCambioPedido(p,datos.destino);}catch(e){return error(json,e.message,409);}p.estado=datos.destino;p.historial.push({estado:p.estado,fecha:Date.now()});
  const actualizado=await db.prepare("UPDATE demo_pedidos SET estado=?,datos_json=? WHERE sesion_id=? AND establecimiento_id=? AND solicitud_id=? AND estado=? AND datos_json=? AND EXISTS (SELECT 1 FROM demo_sesiones WHERE id=? AND expira>?)"+abierta+" RETURNING datos_json").bind(p.estado,JSON.stringify(p),s.id,id,datos.solicitud,datos.esperado,fila.datos_json,s.id,ahora(),...argsCuenta).first();
  return actualizado?json({pedido:leerFila(actualizado)}):error(json,"El pedido cambió. Actualiza el listado.",409);
}
