import {importe} from "./config.mjs";
import {admitePedidos,modalidadesPedido,ofertaPedible,resumirCarrito,crearPedidosPractica,nombresEstado} from "./pedidos-practica.mjs";
import {crearPedidosRemotos,prepararSolicitudPedido,detectarPedidos} from "./pedidos-remotos.mjs";
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
  let lineas=[],enviando=false,servidor=false,conectando=false,pendiente=null,consultando=0,preferencia=null,comprobando=true,configurado=null,expira=null,totalRemoto=null;
  try{preferencia=almacen?.getItem(claveModo);servidor=preferencia==="servidor";const p=JSON.parse(almacen?.getItem(clavePendiente)||"null");if(p?.datos?.solicitud&&Array.isArray(p.datos.lineas)){pendiente=p;servidor=true;}else if(p?.solicitud&&Array.isArray(p.lineas)){pendiente={datos:p,expira:null};servidor=true;}}catch{}
  function guardarPendiente(p){if(!almacen)throw Error("No se puede conservar el identificador del pedido. Habilita el almacenamiento de la pestaña.");if(p)almacen.setItem(clavePendiente,JSON.stringify(p));else almacen.removeItem(clavePendiente);pendiente=p;}
  function guardarModo(){preferencia=servidor?"servidor":"local";try{almacen?.setItem(claveModo,preferencia);}catch{}}
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
  let temporizadorAviso;
  const temporizadoresBoton=new WeakMap();
  function notificar(m,error=false){
    const caja=$("aviso-flotante-carrito");
    clearTimeout(temporizadorAviso);
    caja.hidden=false;caja.dataset.tipo=error?"error":"correcto";
    $("texto-aviso-flotante").textContent=m;
    $("anuncio-carrito").textContent=m;
    caja.classList.remove("entrada-carrito");void caja.offsetWidth;caja.classList.add("entrada-carrito");
    temporizadorAviso=setTimeout(()=>{caja.hidden=true;},error?5000:2400);
  }
  function confirmarBoton(b,cantidad){
    if(!b)return;
    clearTimeout(temporizadoresBoton.get(b));
    b.textContent="✓ Agregado ("+cantidad+")";b.classList.add("agregado");
    temporizadoresBoton.set(b,setTimeout(()=>{b.textContent="Agregar al carrito";b.classList.remove("agregado");temporizadoresBoton.delete(b);},1300));
  }
  $("carrito-flotante").hidden=false;
  document.body.classList.add("con-carrito-flotante");
  $("cerrar-aviso-carrito").addEventListener("click",()=>{clearTimeout(temporizadorAviso);$("aviso-flotante-carrito").hidden=true;});
  function persistir(){try{almacen?.setItem(clave,JSON.stringify(lineas));return !!almacen;}catch{return false;}}
  function cambiar(id,delta){
    if(enviando||pendiente){const mensaje="Primero confirma o reintenta el pedido pendiente.";aviso(mensaje);return {ok:false,mensaje};}
    const copia=lineas.map(x=>({...x})),i=copia.findIndex(l=>l.id===id);
    if(i<0){if(delta<=0)return {ok:false,mensaje:"El producto ya no está en el carrito."};copia.push({id,cantidad:delta});}
    else{copia[i].cantidad+=delta;if(copia[i].cantidad<=0)copia.splice(i,1);}
    try{resumirCarrito(datos.id,datos.catalogo,copia,$("modalidad-pedido").value);lineas=copia;const guardado=persistir();render();aviso(guardado?"Carrito actualizado.":"Carrito temporal: el navegador no conserva la copia.");return {ok:true,guardado,cantidad:lineas.find(l=>l.id===id)?.cantidad||0};}
    catch(e){aviso(e.message);return {ok:false,mensaje:e.message};}
  }
  function render(){
    let r;
    try{r=resumirCarrito(datos.id,datos.catalogo,lineas,$("modalidad-pedido").value);}
    catch(e){aviso(e.message);r={detalle:[],subtotal:0,cargo:0,total:0};}
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
    const cantidad=r.detalle.reduce((n,l)=>n+l.cantidad,0);
    $("nav-carrito").textContent="Carrito ("+cantidad+")";
    $("cantidad-carrito-flotante").textContent=String(cantidad);
    $("subtotal-carrito-flotante").textContent=importe(r.subtotal);
    $("carrito-flotante").setAttribute("aria-label","Ver carrito, "+cantidad+" productos, subtotal "+importe(r.subtotal));
    $("enviar-pedido").disabled=comprobando||enviando||conectando||(!pendiente&&!r.detalle.length)||(servidor&&configurado!==true)||(!servidor&&configurado===null&&preferencia!=="local");
    $("enviar-pedido").textContent=pendiente?"Reintentar pedido pendiente":"Crear pedido de práctica";
    $("vaciar-carrito").disabled=enviando||!!pendiente||!r.detalle.length;
    $("modalidad-pedido").disabled=enviando||!!pendiente;
    if(pendiente){const op=modos.find(m=>m.id===pendiente.datos.modalidad);if(op)$("modalidad-pedido").value=op.id;}
    $("modo-pedidos").textContent=servidor?"Práctica en servidor · sesión privada":"Práctica local · esta pestaña";
    $("activar-pedidos").disabled=comprobando||enviando||conectando||!!pendiente||configurado===false;
    $("pedidos-locales").disabled=comprobando||enviando||conectando||!!pendiente||(!servidor&&preferencia==="local");
    $("estado-origen-pedidos").textContent=comprobando?"Comprobando sesión…":configurado===false?"Servidor no configurado.":configurado===null?"No se pudo comprobar el servidor.":servidor?(expira===null?"El primer pedido activará una sesión privada.":"Pedidos en sesión privada."):"Pedidos locales de esta pestaña.";
    $("conteo-local-pedidos").textContent=String(repo.leer().length);$("conteo-remoto-pedidos").textContent=totalRemoto===null?"—":String(totalRemoto);
    $("descartar-pedido").hidden=!pendiente;$("descartar-pedido").disabled=comprobando||enviando||conectando;
    $("abrir-pedidos").href="/demostraciones/pedidos/?"+new URLSearchParams({negocio:datos.id,plan,origen:servidor?"servidor":"local"});
    $("nota-seguimiento").textContent="Aquí el cliente consulta el estado de sus pedidos."+(servidor?" Actualiza para consultar cambios.":" La práctica local permanece en esta pestaña.");
  }
  async function seguimiento(){
    const n=++consultando,modo=servidor;
    let pedidos;try{if(modo&&configurado!==true)throw Error("No se ha comprobado la agenda de pedidos del servidor.");if(modo&&expira===null&&!pendiente&&preferencia!=="servidor")pedidos=[];else if(modo){const v=await remoto.leerEstado();if(n!==consultando||!servidor)return;expira=v.expira;totalRemoto=v.pedidos.length;pedidos=v.pedidos;}else pedidos=repo.leer();}catch(e){if(n===consultando){totalRemoto=null;render();$("lista-seguimiento").replaceChildren();$("sin-pedidos").hidden=true;$("aviso-seguimiento").textContent=e.message+" Activa la práctica en servidor o actualiza."; }return;}
    if(n!==consultando||modo!==servidor)return;
    $("aviso-seguimiento").textContent="";
    $("sin-pedidos").hidden=pedidos.length>0;render();
    $("lista-seguimiento").replaceChildren(...pedidos.map(p=>{
      const c=nodo("article",undefined,"pedido-resumen");
      c.append(nodo("strong",p.folio),nodo("p",nombresEstado[p.estado],"estado-pedido"),nodo("p",p.detalle.map(l=>l.cantidad+" × "+l.nombre).join(" · ")),nodo("p","Total: "+importe(p.total)));
      return c;
    }));
  }
  $("modalidad-pedido").addEventListener("change",()=>{aviso("");render();});
  $("vaciar-carrito").addEventListener("click",()=>{if(enviando||pendiente)return;lineas=[];persistir();aviso("Carrito vacío.");render();});
  $("activar-pedidos").addEventListener("click",async()=>{if(comprobando||enviando||conectando||pendiente)return;conectando=true;render();try{await remoto.conectar();const v=await remoto.leerEstado();expira=v.expira;configurado=true;servidor=true;guardarModo();aviso("Sesión en servidor activada. Los pedidos locales no se importan.");await seguimiento();}catch(e){aviso(e.message);}finally{conectando=false;render();}});
  $("pedidos-locales").addEventListener("click",()=>{if(comprobando||enviando||pendiente||conectando)return;servidor=false;guardarModo();aviso("Práctica local activa.");render();seguimiento();});
  $("enviar-pedido").addEventListener("click",async()=>{
    if(comprobando||enviando||conectando||servidor&&configurado!==true||!servidor&&configurado===null&&preferencia!=="local")return;enviando=true;render();
    try{
      let p;
      if(servidor){
        if(pendiente&&pendiente.expira===null)throw Error("Reintento anterior sin sesión identificada. Consulta el historial antes de descartarlo.");
        if(!pendiente&&expira===null)await remoto.conectar();
        const v=await remoto.leerEstado();expira=v.expira;totalRemoto=v.pedidos.length;
        if(pendiente&&pendiente.expira!==expira)throw Error("La sesión del pedido pendiente caducó. No se reenviará a otra sesión.");
        if(!pendiente){const resumen=resumirCarrito(datos.id,datos.catalogo,lineas,$("modalidad-pedido").value);if(!resumen.detalle.length)throw Error("Agrega al menos un producto.");guardarPendiente({expira,datos:prepararSolicitudPedido(resumen,practica,crypto.randomUUID())});}guardarModo();
        const resultado=await remoto.crear(pendiente.datos);p=resultado.pedido;
        if(!p||p.solicitud!==pendiente.datos.solicitud)throw Error("No se pudo confirmar el pedido. Reintenta con el mismo identificador.");
        guardarPendiente(null);
      }else{p=repo.crear(datos.catalogo,lineas,$("modalidad-pedido").value);guardarModo();}
      lineas=[];persistir();await seguimiento();aviso("Pedido de práctica "+(servidor?"guardado en servidor":"creado localmente")+". "+p.folio+" · No se envió a un negocio real.");
      $("seccion-seguimiento").scrollIntoView({block:"start"});
    }catch(e){
      // Un 5xx o fallo de red no confirma el resultado: conservar la misma solicitud.
      if(pendiente&&[400,403,409,413,415].includes(e.status)){try{guardarPendiente(null);}catch{}}
      aviso(e.message+(pendiente?" Reintenta el mismo pedido; no se creará uno nuevo.":""));
    }finally{enviando=false;render();}
  });
  async function detectar(){
    if(enviando||conectando)return;
    const n=++consultando;comprobando=true;render();
    try{const v=await detectarPedidos(remoto,{preferencia,locales:repo.leer().length,personalizado:practica,pendiente:!!pendiente});if(n!==consultando)return;configurado=v.configurado;servidor=v.servidor;expira=v.estado?.expira??null;totalRemoto=v.estado?.pedidos.length??null;}
    catch(e){if(n!==consultando)return;configurado=null;totalRemoto=null;aviso(e.message);}
    finally{if(n===consultando){comprobando=false;render();await seguimiento();}}
  }
  $("descartar-pedido").addEventListener("click",()=>{if(!pendiente||comprobando||enviando||conectando)return;if(!confirm("¿Descartar el reintento? Un pedido que ya llegó al servidor seguirá registrado. Consulta el historial antes de crear otro."))return;try{guardarPendiente(null);detectar();}catch(e){aviso(e.message);}});
  $("actualizar-seguimiento").addEventListener("click",()=>{if(!comprobando)detectar();});
  window.addEventListener("pageshow",e=>{if(e.persisted&&!comprobando)detectar();});
  window.addEventListener("focus",()=>{if(!comprobando)detectar();});
  render();detectar();
  if(pendiente)aviso("Hay un pedido pendiente de confirmación. Reintenta para recuperar el resultado sin duplicarlo.");
  return {agregar:(p,b)=>{
    if(!ofertaPedible(p)){notificar("Este producto no está disponible.",true);return false;}
    const resultado=cambiar(p.id,1);
    if(!resultado.ok){notificar(resultado.mensaje,true);return false;}
    confirmarBoton(b,resultado.cantidad);
    notificar(p.nombre+" agregado al carrito"+(resultado.guardado?".":". Copia temporal en memoria."));
    const enlace=$("carrito-flotante");enlace.classList.remove("pulso-carrito");void enlace.offsetWidth;enlace.classList.add("pulso-carrito");
    return true;
  },puedeAgregar:ofertaPedible};
}
