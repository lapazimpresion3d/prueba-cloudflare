import {importe} from "./config.mjs";
import {admitePedidos,modalidadesPedido,ofertaPedible,resumirCarrito,crearPedidosPractica,nombresEstado} from "./pedidos-practica.mjs";
import {crearPedidosRemotos,prepararSolicitudPedido} from "./pedidos-remotos.mjs";
const $=id=>document.getElementById(id);
function nodo(tag,texto,clase){const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(clase)n.className=clase;return n;}
function boton(texto,accion){const b=nodo("button",texto,"boton-pedido");b.type="button";b.addEventListener("click",accion);return b;}
export function iniciarCarrito(datos,plan,practica){
  if(!admitePedidos(datos.id,plan))return null;
  let almacen;try{almacen=sessionStorage;}catch{}
  const repo=crearPedidosPractica(almacen,datos.id,plan);
  const clave="lapaz:demo:carrito:v1:"+datos.id+(practica?":personalizado":":original");
  const modos=modalidadesPedido(datos.id);
  const remoto=crearPedidosRemotos(datos.id,plan),claveModo="lapaz:demo:pedidos:modo:"+datos.id,clavePendiente=clave+":pendiente";
  let lineas=[],enviando=false,servidor=false,conectando=false,pendiente=null,consultando=0;
  try{servidor=almacen?.getItem(claveModo)==="servidor";const p=JSON.parse(almacen?.getItem(clavePendiente)||"null");if(p&&typeof p.solicitud==="string"&&Array.isArray(p.lineas)){pendiente=p;servidor=true;}}catch{}
  function guardarPendiente(p){if(!almacen)throw Error("No se puede conservar el identificador del pedido. Habilita el almacenamiento de la pestaña.");if(p)almacen.setItem(clavePendiente,JSON.stringify(p));else almacen.removeItem(clavePendiente);pendiente=p;}
  function guardarModo(){try{almacen?.setItem(claveModo,servidor?"servidor":"local");}catch{}}
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
  function persistir(){try{almacen?.setItem(clave,JSON.stringify(lineas));return !!almacen;}catch{return false;}}
  function cambiar(id,delta){
    if(enviando||pendiente){aviso("Primero confirma o reintenta el pedido pendiente.");return;}
    const copia=lineas.map(x=>({...x})),i=copia.findIndex(l=>l.id===id);
    if(i<0){if(delta<=0)return;copia.push({id,cantidad:delta});}
    else{copia[i].cantidad+=delta;if(copia[i].cantidad<=0)copia.splice(i,1);}
    try{resumirCarrito(datos.id,datos.catalogo,copia,$("modalidad-pedido").value);lineas=copia;const guardado=persistir();render();aviso(guardado?"Carrito actualizado.":"Carrito temporal: el navegador no conserva la copia.");}
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
    $("enviar-pedido").disabled=enviando||conectando||(!pendiente&&!r.detalle.length);
    $("enviar-pedido").textContent=pendiente?"Reintentar pedido pendiente":"Crear pedido de práctica";
    $("vaciar-carrito").disabled=enviando||!!pendiente||!r.detalle.length;
    $("modalidad-pedido").disabled=enviando||!!pendiente;
    $("modo-pedidos").textContent=servidor?"Práctica en servidor · sesión privada":"Práctica local · esta pestaña";
    $("activar-pedidos").disabled=enviando||conectando;
    $("pedidos-locales").disabled=!servidor||enviando||conectando||!!pendiente;
    $("nota-seguimiento").textContent=servidor?"Consulta desde otra pestaña del mismo navegador y dirección, activando la misma práctica en servidor. Usa Actualizar estado.":"Abre el panel en esta misma pestaña para cambiar el estado y vuelve aquí.";
  }
  async function seguimiento(){
    const n=++consultando,modo=servidor;
    let pedidos;try{pedidos=modo?await remoto.leer():repo.leer();}catch(e){if(n===consultando){$("lista-seguimiento").replaceChildren();$("sin-pedidos").hidden=true;$("aviso-seguimiento").textContent=e.message+" Activa la práctica en servidor o actualiza."; }return;}
    if(n!==consultando||modo!==servidor)return;
    $("aviso-seguimiento").textContent="";
    $("sin-pedidos").hidden=pedidos.length>0;
    $("lista-seguimiento").replaceChildren(...pedidos.map(p=>{
      const c=nodo("article",undefined,"pedido-resumen");
      c.append(nodo("strong",p.folio),nodo("p",nombresEstado[p.estado],"estado-pedido"),nodo("p",p.detalle.map(l=>l.cantidad+" × "+l.nombre).join(" · ")),nodo("p","Total: "+importe(p.total)));
      return c;
    }));
  }
  $("modalidad-pedido").addEventListener("change",()=>{aviso("");render();});
  $("vaciar-carrito").addEventListener("click",()=>{if(enviando||pendiente)return;lineas=[];persistir();aviso("Carrito vacío.");render();});
  $("activar-pedidos").addEventListener("click",async()=>{if(enviando||conectando)return;conectando=true;render();try{await remoto.conectar();servidor=true;guardarModo();aviso("Sesión en servidor activada. Los pedidos locales no se importan.");await seguimiento();}catch(e){aviso(e.message);}finally{conectando=false;render();}});
  $("pedidos-locales").addEventListener("click",()=>{if(enviando||pendiente||conectando)return;servidor=false;guardarModo();aviso("Práctica local activa.");render();seguimiento();});
  $("enviar-pedido").addEventListener("click",async()=>{
    if(enviando||conectando)return;enviando=true;render();
    try{
      let p;
      if(servidor){
        if(!pendiente){const resumen=resumirCarrito(datos.id,datos.catalogo,lineas,$("modalidad-pedido").value);if(!resumen.detalle.length)throw Error("Agrega al menos un producto.");guardarPendiente(prepararSolicitudPedido(resumen,practica,crypto.randomUUID()));}
        const resultado=await remoto.crear(pendiente);p=resultado.pedido;
        if(!p||p.solicitud!==pendiente.solicitud)throw Error("No se pudo confirmar el pedido. Reintenta con el mismo identificador.");
        guardarPendiente(null);
      }else p=repo.crear(datos.catalogo,lineas,$("modalidad-pedido").value);
      lineas=[];persistir();await seguimiento();aviso("Pedido de práctica "+(servidor?"guardado en servidor":"creado localmente")+". "+p.folio+" · No se envió a un negocio real.");
      $("seccion-seguimiento").scrollIntoView({block:"start"});
    }catch(e){
      // Una respuesta explícita 400/403/409/413/415/503 implica rechazo sin nueva escritura.
      if(pendiente&&[400,403,409,413,415,503].includes(e.status)){try{guardarPendiente(null);}catch{}}
      aviso(e.message+(pendiente?" Reintenta el mismo pedido; no se creará uno nuevo.":""));
    }finally{enviando=false;render();}
  });
  $("actualizar-seguimiento").addEventListener("click",seguimiento);
  window.addEventListener("pageshow",seguimiento);
  render();seguimiento();
  if(pendiente)aviso("Hay un pedido pendiente de confirmación. Reintenta para recuperar el resultado sin duplicarlo.");
  return {agregar:p=>{if(ofertaPedible(p))cambiar(p.id,1);},puedeAgregar:ofertaPedible};
}
