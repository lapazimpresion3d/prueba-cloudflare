import {importe} from "./config.mjs";
import {admitePedidos,modalidadesPedido,ofertaPedible,resumirCarrito,crearPedidosPractica,nombresEstado} from "./pedidos-practica.mjs";
const $=id=>document.getElementById(id);
function nodo(tag,texto,clase){const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(clase)n.className=clase;return n;}
function boton(texto,accion){const b=nodo("button",texto,"boton-pedido");b.type="button";b.addEventListener("click",accion);return b;}
export function iniciarCarrito(datos,plan,practica){
  if(!admitePedidos(datos.id,plan))return null;
  let almacen;try{almacen=sessionStorage;}catch{}
  const repo=crearPedidosPractica(almacen,datos.id,plan);
  const clave="lapaz:demo:carrito:v1:"+datos.id+(practica?":personalizado":":original");
  const modos=modalidadesPedido(datos.id);
  let lineas=[],enviando=false;
  try{
    const v=JSON.parse(almacen?.getItem(clave)||"null");
    if(Array.isArray(v)&&v.length<=30){
      const ids=new Set();
      lineas=v.filter(l=>l&&typeof l.id==="string"&&!ids.has(l.id)&&Number.isSafeInteger(l.cantidad)&&l.cantidad>=1&&l.cantidad<=20&&ofertaPedible(datos.catalogo.find(p=>p.id===l.id))&&(ids.add(l.id),true));
    }
  }catch{}
  $("seccion-carrito").hidden=false;$("nav-carrito").hidden=false;$("nav-seguimiento").hidden=false;$("seccion-seguimiento").hidden=false;
  $("modalidad-pedido").replaceChildren(...modos.map(m=>new Option(m.nombre+(m.cargo?" · "+importe(m.cargo):""),m.id)));
  const aviso=m=>{$("aviso-carrito").textContent=m;};
  function persistir(){try{almacen?.setItem(clave,JSON.stringify(lineas));}catch{}}
  function cambiar(id,delta){
    const copia=lineas.map(x=>({...x})),i=copia.findIndex(l=>l.id===id);
    if(i<0){if(delta<=0)return;copia.push({id,cantidad:delta});}
    else{copia[i].cantidad+=delta;if(copia[i].cantidad<=0)copia.splice(i,1);}
    try{resumirCarrito(datos.id,datos.catalogo,copia,$("modalidad-pedido").value);lineas=copia;persistir();render();aviso("Carrito actualizado.");}
    catch(e){aviso(e.message);}
  }
  function render(){
    let r;
    try{r=resumirCarrito(datos.id,datos.catalogo,lineas,$("modalidad-pedido").value);}
    catch(e){$("enviar-pedido").disabled=true;aviso(e.message);return;}
    $("lineas-carrito").replaceChildren(...r.detalle.map(l=>{
      const fila=nodo("div",undefined,"linea-carrito"),info=nodo("div");
      info.append(nodo("strong",l.nombre),nodo("p",importe(l.precioCentavos)+" × "+l.cantidad+" · "+importe(l.subtotal),"nota"));
      const controles=nodo("div",undefined,"controles-cantidad");
      const menos=boton("−",()=>cambiar(l.id,-1)),mas=boton("+",()=>cambiar(l.id,1)),quitar=boton("Quitar",()=>cambiar(l.id,-l.cantidad));
      menos.setAttribute("aria-label","Quitar una unidad de "+l.nombre);mas.setAttribute("aria-label","Agregar una unidad de "+l.nombre);mas.disabled=l.cantidad>=20;
      controles.append(menos,nodo("span",String(l.cantidad)),mas,quitar);fila.append(info,controles);return fila;
    }));
    $("carrito-vacio").hidden=!!r.detalle.length;
    $("pedido-subtotal").textContent=importe(r.subtotal);$("pedido-cargo").textContent=importe(r.cargo);$("pedido-total").textContent=importe(r.total);
    $("nav-carrito").textContent="Carrito ("+r.detalle.reduce((n,l)=>n+l.cantidad,0)+")";
    $("enviar-pedido").disabled=enviando||!r.detalle.length;
    $("vaciar-carrito").disabled=!r.detalle.length;
  }
  function seguimiento(){
    const pedidos=repo.leer();
    $("sin-pedidos").hidden=pedidos.length>0;
    $("lista-seguimiento").replaceChildren(...pedidos.map(p=>{
      const c=nodo("article",undefined,"pedido-resumen");
      c.append(nodo("strong",p.folio),nodo("p",nombresEstado[p.estado],"estado-pedido"),nodo("p",p.detalle.map(l=>l.cantidad+" × "+l.nombre).join(" · ")),nodo("p","Total: "+importe(p.total)));
      return c;
    }));
  }
  $("modalidad-pedido").addEventListener("change",()=>{aviso("");render();});
  $("vaciar-carrito").addEventListener("click",()=>{lineas=[];persistir();aviso("Carrito vacío.");render();});
  $("enviar-pedido").addEventListener("click",()=>{
    if(enviando)return;enviando=true;render();
    try{
      const p=repo.crear(datos.catalogo,lineas,$("modalidad-pedido").value);
      lineas=[];persistir();seguimiento();aviso("Pedido de práctica creado. "+p.folio+" · No se envió a un negocio real.");
      $("seccion-seguimiento").scrollIntoView({block:"start"});
    }catch(e){aviso(e.message);}
    finally{enviando=false;render();}
  });
  $("actualizar-seguimiento").addEventListener("click",seguimiento);
  window.addEventListener("pageshow",seguimiento);
  render();seguimiento();
  return {agregar:p=>{if(ofertaPedible(p))cambiar(p.id,1);},puedeAgregar:ofertaPedible};
}
