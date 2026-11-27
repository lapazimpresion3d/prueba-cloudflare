import {normalizarOpciones,claveLinea} from "./menu-comal-practica.mjs";
import {datosPedidoDemo} from "./clientes-practica.mjs";
// Flujo de práctica exclusivamente local. No accede a /api/pedidos ni a datos reales.
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {capacidades} from "./config.mjs";
const MAX_PEDIDOS=30,MAX_LINEAS=30,MAX_CANTIDAD=20,MAX_TOTAL=100000000;
const PREFIJO="lapaz:demo:pedidos:v1:";
const estados=["recibido","preparando","listo","entregado","cancelado"];
const transiciones={recibido:["preparando","cancelado"],preparando:["listo","cancelado"],listo:["entregado","cancelado"],entregado:[],cancelado:[]};
export const nombresEstado={recibido:"Recibido",preparando:"En preparación",listo:"Listo para entregar",entregado:"Entregado",cancelado:"Cancelado"};
const copiar=x=>JSON.parse(JSON.stringify(x));
export function admitePedidos(id,plan){
  const e=obtenerEstablecimiento(id);
  return !!e&&capacidades(e,plan).some(m=>m.id==="pedidos"&&m.estadoEfectivo==="disponible");
}
export function modalidadesPedido(id){
  const e=obtenerEstablecimiento(id);
  if(!e)return [];
  if(e.giro==="tienda")return [{id:"recoger",nombre:"Recoger en tienda",cargo:0},{id:"domicilio",nombre:"Entrega a domicilio (ejemplo)",cargo:4000}];
  if(["cafeteria","restaurante"].includes(e.giro))return [{id:"local",nombre:"Consumir en el local",cargo:0},{id:"recoger",nombre:"Recoger en mostrador",cargo:0},{id:"domicilio",nombre:"Entrega a domicilio (ejemplo)",cargo:3500}];
  return [];
}
export function ofertaPedible(p){return !!p&&["alimento","fisico"].includes(p.tipo)&&p.disponible!==false&&Number.isSafeInteger(p.precioCentavos)&&p.precioCentavos>=0&&p.precioCentavos<=MAX_TOTAL;}
export function resumirCarrito(id,catalogo,lineas,modalidad){
  if(!Array.isArray(lineas)||lineas.length>MAX_LINEAS||!Array.isArray(catalogo))throw Error("Carrito inválido.");
  const modo=modalidadesPedido(id).find(m=>m.id===modalidad);
  if(!modo)throw Error("Elige una modalidad disponible.");
  const vistos=new Set();
  const detalle=lineas.map(l=>{
    if(!l||typeof l.id!=="string"||!Number.isSafeInteger(l.cantidad)||l.cantidad<1||l.cantidad>MAX_CANTIDAD)throw Error("Cantidad o producto inválido.");
    const p=catalogo.find(x=>x.id===l.id);
    if(!ofertaPedible(p))throw Error("Hay productos que ya no están disponibles. Revisa el carrito.");
    const o=normalizarOpciones(id,p,catalogo,l.opciones);
    const linea={id:p.id,nombre:p.nombre,cantidad:l.cantidad,precioCentavos:o.precio,subtotal:o.precio*l.cantidad,...(o.seleccion?{opciones:o.seleccion,personalizacion:o.detalles}:{})};
    const clave=claveLinea(linea);if(vistos.has(clave))throw Error("Partida repetida.");vistos.add(clave);return linea;
  });
  const subtotal=detalle.reduce((sum,p)=>sum+p.subtotal,0),cargo=detalle.length?modo.cargo:0,total=subtotal+cargo;
  if(!Number.isSafeInteger(total)||total>MAX_TOTAL)throw Error("El pedido supera el límite de práctica.");
  return {detalle,modalidad:modo.id,subtotal,cargo,total};
}
export function transicionesPedido(estado){return Object.hasOwn(transiciones,estado)?[...transiciones[estado]]:[];}
function pedidoValido(p,id){
  if(!p||typeof p.folio!=="string"||!/^DEMO-[a-zA-Z0-9-]{1,80}$/.test(p.folio)||!estados.includes(p.estado)||!Number.isSafeInteger(p.creado)||!Array.isArray(p.detalle)||!p.detalle.length||p.detalle.length>MAX_LINEAS||!Array.isArray(p.historial)||!p.historial.length||p.historial.length>5)return false;
  if(!p.detalle.every(l=>l&&typeof l.id==="string"&&typeof l.nombre==="string"&&l.nombre.length<=100&&Number.isSafeInteger(l.cantidad)&&l.cantidad>=1&&l.cantidad<=MAX_CANTIDAD&&Number.isSafeInteger(l.precioCentavos)&&l.precioCentavos>=0&&l.precioCentavos<=MAX_TOTAL&&l.subtotal===l.cantidad*l.precioCentavos))return false;
  if(new Set(p.detalle.map(claveLinea)).size!==p.detalle.length)return false;
  const modo=modalidadesPedido(id).find(m=>m.id===p.modalidad);
  if(!modo||p.cargo!==modo.cargo||p.subtotal!==p.detalle.reduce((sum,l)=>sum+l.subtotal,0)||p.total!==p.subtotal+p.cargo||!Number.isSafeInteger(p.total)||p.total>MAX_TOTAL)return false;
  return p.historial.every((h,i)=>h&&Number.isSafeInteger(h.fecha)&&(i===0?h.estado==="recibido":transicionesPedido(p.historial[i-1].estado).includes(h.estado)))&&p.historial.at(-1).estado===p.estado;
}
export function crearPedidosPractica(almacen,id,plan,{ahora=()=>Date.now(),folio=()=>crypto.randomUUID()}={}){
  if(!admitePedidos(id,plan))throw Error("Los pedidos no están incluidos en esta demostración.");
  const clave=PREFIJO+id;
  let memoria={version:1,establecimiento:id,pedidos:[]};
  function leer(){
    try{
      const raw=almacen?.getItem(clave);
      if(raw&&raw.length<=400000){
        const v=JSON.parse(raw);
        if(v.version===1&&v.establecimiento===id&&Array.isArray(v.pedidos)&&v.pedidos.length<=MAX_PEDIDOS&&new Set(v.pedidos.map(p=>p?.folio)).size===v.pedidos.length&&v.pedidos.every(p=>pedidoValido(p,id)))memoria=v;
      }
    }catch{}
    return copiar(memoria.pedidos);
  }
  function guardar(pedidos){
    const v={version:1,establecimiento:id,pedidos};
    try{if(!almacen)throw Error("sin almacenamiento");almacen.setItem(clave,JSON.stringify(v));}
    catch{throw Error("El navegador no permite guardar esta práctica. No se creó ni cambió el pedido.");}
    memoria=v;
  }
  function crear(catalogo,lineas,modalidad,datosCliente){
    const resumen=resumirCarrito(id,catalogo,lineas,modalidad);
    if(!resumen.detalle.length)throw Error("Agrega al menos un producto.");
    const pedidos=leer();
    if(pedidos.length>=MAX_PEDIDOS)throw Error("Límite de 30 pedidos de práctica. Restablece el historial desde el panel.");
    const f="DEMO-"+folio();
    if(!/^DEMO-[a-zA-Z0-9-]{1,80}$/.test(f)||pedidos.some(p=>p.folio===f))throw Error("No se pudo asignar un folio. Intenta de nuevo.");
    const p={...resumen,...(datosCliente===undefined?{}:{datosCliente:datosPedidoDemo(datosCliente,modalidad,obtenerEstablecimiento(id).giro)}),folio:f,estado:"recibido",creado:ahora(),historial:[{estado:"recibido",fecha:ahora()}]};
    guardar([p,...pedidos]);return copiar(p);
  }
  function cambiar(folio,estadoEsperado,destino){
    const pedidos=leer(),p=pedidos.find(x=>x.folio===folio);
    if(!p||p.estado!==estadoEsperado||!transicionesPedido(p.estado).includes(destino))throw Error("El estado cambió o la transición no está permitida.");
    p.estado=destino;p.historial.push({estado:destino,fecha:ahora()});guardar(pedidos);return copiar(p);
  }
  return {leer,crear,cambiar,restaurar:()=>guardar([])};
}
