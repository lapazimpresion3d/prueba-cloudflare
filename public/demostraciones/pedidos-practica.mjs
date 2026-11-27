// Flujo de práctica exclusivamente local. No accede a /api/pedidos ni a datos reales.
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {planes} from "./config.mjs";
const MAX_PEDIDOS=30,MAX_LINEAS=30,MAX_CANTIDAD=20,MAX_TOTAL=100000000;
const PREFIJO="lapaz:demo:pedidos:v1:";
const estados=["recibido","preparando","listo","entregado","cancelado"];
const transiciones={recibido:["preparando","cancelado"],preparando:["listo","cancelado"],listo:["entregado","cancelado"],entregado:[],cancelado:[]};
export const nombresEstado={recibido:"Recibido",preparando:"En preparación",listo:"Listo para entregar",entregado:"Entregado",cancelado:"Cancelado"};
const copiar=x=>JSON.parse(JSON.stringify(x));
export function admitePedidos(id,plan){
  const e=obtenerEstablecimiento(id);
  return !!e&&["cafeteria","restaurante","tienda"].includes(e.giro)&&planes.findIndex(p=>p.id===plan)>=1;
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
    if(!l||typeof l.id!=="string"||vistos.has(l.id)||!Number.isSafeInteger(l.cantidad)||l.cantidad<1||l.cantidad>MAX_CANTIDAD)throw Error("Cantidad o producto inválido.");
    vistos.add(l.id);
    const p=catalogo.find(x=>x.id===l.id);
    if(!ofertaPedible(p))throw Error("Hay productos que ya no están disponibles. Revisa el carrito.");
    return {id:p.id,nombre:p.nombre,cantidad:l.cantidad,precioCentavos:p.precioCentavos,subtotal:p.precioCentavos*l.cantidad};
  });
  const subtotal=detalle.reduce((sum,p)=>sum+p.subtotal,0),cargo=detalle.length?modo.cargo:0,total=subtotal+cargo;
  if(!Number.isSafeInteger(total)||total>MAX_TOTAL)throw Error("El pedido supera el límite de práctica.");
  return {detalle,modalidad:modo.id,subtotal,cargo,total};
}
export function transicionesPedido(estado){return Object.hasOwn(transiciones,estado)?[...transiciones[estado]]:[];}
export function crearPedidosPractica(almacen,id,plan,{ahora=()=>Date.now(),folio=()=>crypto.randomUUID()}={}){
  if(!admitePedidos(id,plan))throw Error("Los pedidos no están incluidos en esta demostración.");
  const clave=PREFIJO+id;
  let memoria={version:1,establecimiento:id,pedidos:[]};
  function leer(){
    try{
      const raw=almacen?.getItem(clave);
      if(raw&&raw.length<=400000){
        const v=JSON.parse(raw);
        if(v.version===1&&v.establecimiento===id&&Array.isArray(v.pedidos)&&v.pedidos.length<=MAX_PEDIDOS&&v.pedidos.every(p=>p&&typeof p.folio==="string"&&estados.includes(p.estado)&&Array.isArray(p.detalle)&&p.detalle.length<=MAX_LINEAS&&Number.isSafeInteger(p.total)&&p.total>=0))memoria=v;
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
  function crear(catalogo,lineas,modalidad){
    const resumen=resumirCarrito(id,catalogo,lineas,modalidad);
    if(!resumen.detalle.length)throw Error("Agrega al menos un producto.");
    const pedidos=leer();
    if(pedidos.length>=MAX_PEDIDOS)throw Error("Límite de 30 pedidos de práctica. Restablece el historial desde el panel.");
    const f="DEMO-"+folio();
    if(pedidos.some(p=>p.folio===f))throw Error("No se pudo asignar un folio. Intenta de nuevo.");
    const p={...resumen,folio:f,estado:"recibido",creado:ahora(),historial:[{estado:"recibido",fecha:ahora()}]};
    guardar([p,...pedidos]);return copiar(p);
  }
  function cambiar(folio,estadoEsperado,destino){
    const pedidos=leer(),p=pedidos.find(x=>x.folio===folio);
    if(!p||p.estado!==estadoEsperado||!transicionesPedido(p.estado).includes(destino))throw Error("El estado cambió o la transición no está permitida.");
    p.estado=destino;p.historial.push({estado:destino,fecha:ahora()});guardar(pedidos);return copiar(p);
  }
  return {leer,crear,cambiar,restaurar:()=>guardar([])};
}
