import {estadoCobro,nombresCobro} from "./cobros-practica.mjs";
import {zonasEntregaDemo,horarioEntregaDemo} from "./entrega-practica.mjs";
import {nuevosListos} from "./cocina-practica.mjs";
import {normalizarOpciones,claveLinea,textoLinea} from "./menu-comal-practica.mjs";
import {clientesDemo,direccionesDemo,notasPedidoDemo,pagosDemo,mesasDemo,seleccionPedido} from "./clientes-practica.mjs";
import {importe} from "./config.mjs";
import {admitePedidos,modalidadesPedido,ofertaPedible,resumirCarrito,resumirPedidoConfirmado,crearPedidosPractica,nombresEstado} from "./pedidos-practica.mjs";
import {crearPedidosRemotos,prepararSolicitudPedido,detectarPedidos} from "./pedidos-remotos.mjs";
const $=id=>document.getElementById(id);
function nodo(tag,texto,clase){const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(clase)n.className=clase;return n;}
function boton(texto,accion){const b=nodo("button",texto,"boton-pedido");b.type="button";b.addEventListener("click",accion);return b;}
export function iniciarCarrito(datos,plan,practica,mesa=null){
  if(!admitePedidos(datos.id,plan))return null;
  let almacen;try{almacen=sessionStorage;}catch{}
  const repo=crearPedidosPractica(almacen,datos.id,plan);
  const clave="lapaz:demo:carrito:v1:"+datos.id+(practica?":personalizado":":original")+(mesa?":mesa:"+mesa:"");
  const modos=modalidadesPedido(datos.id).filter(m=>!mesa||m.id==="local");
  const remoto=crearPedidosRemotos(datos.id,plan),claveModo="lapaz:demo:pedidos:modo:"+datos.id,clavePendiente=clave+":pendiente";
  let lineas=[],enviando=false,servidor=false,conectando=false,pendiente=null,consultando=0,preferencia=null,comprobando=true,configurado=null,expira=null,totalRemoto=null;
  try{preferencia=almacen?.getItem(claveModo);servidor=preferencia==="servidor";const p=JSON.parse(almacen?.getItem(clavePendiente)||"null");if(p?.datos?.solicitud&&Array.isArray(p.datos.lineas)){pendiente=p;servidor=true;}else if(p?.solicitud&&Array.isArray(p.lineas)){pendiente={datos:p,expira:null};servidor=true;}}catch{}
  function guardarPendiente(p){if(!almacen)throw Error("No se puede conservar el identificador del pedido. Habilita el almacenamiento de la pestaña.");if(p)almacen.setItem(clavePendiente,JSON.stringify(p));else almacen.removeItem(clavePendiente);pendiente=p;}
  function guardarModo(){preferencia=servidor?"servidor":"local";try{almacen?.setItem(claveModo,preferencia);}catch{}}
  try{
    const v=JSON.parse(almacen?.getItem(clave)||"null");
    if(Array.isArray(v)&&v.length<=30){
      const ids=new Set();
      for(const l of v){try{const p=datos.catalogo.find(p=>p.id===l?.id);if(!ofertaPedible(p)||!Number.isSafeInteger(l.cantidad)||l.cantidad<1||l.cantidad>20)continue;const o=normalizarOpciones(datos.id,p,datos.catalogo,l.opciones);const linea={id:l.id,cantidad:l.cantidad,...(o.seleccion?{opciones:o.seleccion}:{})};const k=claveLinea(linea);if(!ids.has(k)){ids.add(k);lineas.push(linea);}}catch{}}
    }
  }catch{}
  $("seccion-carrito").hidden=false;$("nav-carrito").hidden=false;$("nav-seguimiento").hidden=false;$("seccion-seguimiento").hidden=false;
  $("modalidad-pedido").replaceChildren(...modos.map(m=>new Option(m.nombre+(m.cargo?" · "+importe(m.cargo):""),m.id)));
  const aviso=m=>{$("aviso-carrito").textContent=m;};
  const elegir=(id,items,placeholder)=>$(id).replaceChildren(...(placeholder?[new Option(placeholder,"")]:[]),...items.map(x=>new Option(x.nombre,x.id)));
  elegir("cliente-pedido",clientesDemo,"Selecciona un cliente");
  elegir("pago-pedido",pagosDemo,"Selecciona forma de pago");
  elegir("nota-pedido",notasPedidoDemo);
  elegir("mesa-pedido",mesasDemo.filter(id=>!mesa||id===mesa).map(id=>({id,nombre:"Mesa "+id})),mesa?null:"Selecciona una mesa");
  if(mesa){$("modalidad-pedido").value="local";$("mesa-pedido").value=mesa;}
  const porZona=datos.id==="taqueria-el-comal";
  const modoHorario=()=>$("simular-entrega").checked?"simulado":"actual";
  $("reglas-entrega-demo").hidden=!porZona;
  $("horario-entrega-demo").textContent="Entregas: "+horarioEntregaDemo+". Tarifas ficticias de práctica.";
  elegir("colonia-pedido",[...zonasEntregaDemo.map(z=>({id:z.id,nombre:z.nombre+" · "+importe(z.envioCentavos)})),{id:"fuera",nombre:"Mi colonia no aparece"}],"Selecciona colonia");
  function direccionesDisponibles(){
    const anterior=$("direccion-pedido").value,z=zonasEntregaDemo.find(z=>z.id===$("colonia-pedido").value);
    const lista=porZona?direccionesDemo.filter(x=>x.id===z?.direccion):direccionesDemo.filter(x=>x.id!=="domicilio-3");
    elegir("direccion-pedido",lista.map(x=>({id:x.id,nombre:x.calle+" · "+x.colonia})),"Selecciona dirección");
    if(lista.some(x=>x.id===anterior))$("direccion-pedido").value=anterior;
    else if(porZona&&lista.length===1)$("direccion-pedido").value=lista[0].id;
  }
  direccionesDisponibles();
  function resumenVista(items=lineas){return resumirCarrito(datos.id,datos.catalogo,items,$("modalidad-pedido").value,{direccion:$("direccion-pedido").value,horario:modoHorario()});}
  function resumenConfirmado(d){return resumirPedidoConfirmado(datos.id,datos.catalogo,lineas,$("modalidad-pedido").value,d,modoHorario());}
  $("colonia-pedido").addEventListener("change",()=>{direccionesDisponibles();render();});
  $("simular-entrega").addEventListener("change",render);
  $("recoger-sin-cobertura").addEventListener("click",()=>{$("modalidad-pedido").value="recoger";render();});
  function datosCliente(){return seleccionPedido({cliente:$("cliente-pedido").value,pago:$("pago-pedido").value,nota:$("nota-pedido").value,mesa:(mesa||$("mesa-pedido").value),direccion:$("direccion-pedido").value},$("modalidad-pedido").value,datos.giro);}
  function mostrarDatos(){
   const cliente=clientesDemo.find(x=>x.id===$("cliente-pedido").value),dir=direccionesDemo.find(x=>x.id===$("direccion-pedido").value);
   $("telefono-pedido").value=cliente?.telefono||"";
   $("detalle-direccion").textContent=dir?dir.colonia+" · "+dir.referencias:"";
   $("colonia-pedido").disabled=$("simular-entrega").disabled=enviando||!!pendiente;
   $("recoger-sin-cobertura").disabled=enviando||!!pendiente;
   $("campo-mesa").hidden=!(datos.giro==="restaurante"&&$("modalidad-pedido").value==="local");
   $("campos-entrega").hidden=$("modalidad-pedido").value!=="domicilio";
   for(const k of ["cliente-pedido","pago-pedido","nota-pedido","mesa-pedido","direccion-pedido"])$(k).disabled=enviando||!!pendiente||!!mesa&&k==="mesa-pedido";
  }
  for(const k of ["cliente-pedido","pago-pedido","nota-pedido","mesa-pedido","direccion-pedido"])$(k).addEventListener("change",()=>{mostrarDatos();if(k==="direccion-pedido")render();});
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
  function cambiar(id,delta,opciones){
    if(enviando||pendiente){const mensaje="Primero confirma o reintenta el pedido pendiente.";aviso(mensaje);return {ok:false,mensaje};}
    const clave=claveLinea({id,opciones});const copia=lineas.map(x=>({...x})),i=copia.findIndex(l=>claveLinea(l)===clave);
    if(i<0){if(delta<=0)return {ok:false,mensaje:"El producto ya no está en el carrito."};copia.push({id,cantidad:delta,...(opciones?{opciones}:{})});}
    else{copia[i].cantidad+=delta;if(copia[i].cantidad<=0)copia.splice(i,1);}
    try{resumenVista(copia);lineas=copia;const guardado=persistir();render();aviso(guardado?"Carrito actualizado.":"Carrito temporal: el navegador no conserva la copia.");return {ok:true,guardado,cantidad:lineas.find(l=>claveLinea(l)===clave)?.cantidad||0};}
    catch(e){aviso(e.message);return {ok:false,mensaje:e.message};}
  }
  function render(){
    if(pendiente){const d=pendiente.datos.datosCliente;if(d&&porZona){$("colonia-pedido").value=zonasEntregaDemo.find(z=>z.direccion===d.direccion)?.id||"";direccionesDisponibles();$("simular-entrega").checked=pendiente.datos.horarioEntrega==="simulado";}const op=modos.find(m=>m.id===pendiente.datos.modalidad);if(op)$("modalidad-pedido").value=op.id;if(d){for(const [k,v] of [["cliente-pedido",d.cliente],["pago-pedido",d.pago],["nota-pedido",d.nota],["mesa-pedido",d.mesa],["direccion-pedido",d.direccion]])$(k).value=v||"";}}
    let r;
    try{r=resumenVista();}
    catch(e){aviso(e.message);r={detalle:[],subtotal:0,cargo:0,total:0};}
    $("lineas-carrito").replaceChildren(...r.detalle.map(l=>{
      const fila=nodo("div",undefined,"linea-carrito"),info=nodo("div");
      info.append(nodo("strong",textoLinea(l)),nodo("p",importe(l.precioCentavos)+" × "+l.cantidad+" · "+importe(l.subtotal),"nota"));
      const controles=nodo("div",undefined,"controles-cantidad");
      const menos=boton("−",()=>cambiar(l.id,-1,l.opciones)),mas=boton("+",()=>cambiar(l.id,1,l.opciones)),quitar=boton("Quitar",()=>cambiar(l.id,-l.cantidad,l.opciones));
      menos.setAttribute("aria-label","Quitar una unidad de "+l.nombre);mas.setAttribute("aria-label","Agregar una unidad de "+l.nombre);mas.disabled=l.cantidad>=20;
      controles.append(menos,nodo("span",String(l.cantidad)),mas,quitar);fila.append(info,controles);return fila;
    }));
    $("carrito-vacio").hidden=!!r.detalle.length;
    const cot=r.cotizacion,fuera=porZona&&$("colonia-pedido").value==="fuera";
    $("cotizacion-entrega-demo").textContent=cot?(fuera?"Colonia fuera de cobertura. Puedes recoger en mostrador.":cot.zona?("Envío: "+importe(cot.envioCentavos)+" · Mínimo: "+importe(cot.minimoCentavos)+(cot.faltante?" · Faltan "+importe(cot.faltante):" · Mínimo alcanzado")+(cot.abierto?(cot.horario==="simulado"?" · Horario abierto simulado":" · Servicio abierto"):" · Fuera de horario")):cot.error):"";
    $("recoger-sin-cobertura").hidden=!cot||(!fuera&&(!cot.zona||cot.abierto));
    $("pedido-subtotal").textContent=importe(r.subtotal);$("pedido-cargo").textContent=cot&&!cot.zona?"Por cotizar":importe(r.cargo);$("pedido-total").textContent=cot&&!cot.zona?"Por cotizar":importe(r.total);
    const cantidad=r.detalle.reduce((n,l)=>n+l.cantidad,0);
    $("nav-carrito").textContent="Carrito ("+cantidad+")";
    $("cantidad-carrito-flotante").textContent=String(cantidad);
    $("subtotal-carrito-flotante").textContent=importe(r.subtotal);
    $("carrito-flotante").setAttribute("aria-label","Ver carrito, "+cantidad+" productos, subtotal "+importe(r.subtotal));
    $("enviar-pedido").disabled=comprobando||enviando||conectando||(!pendiente&&(!r.detalle.length||!!cot?.error||fuera&&!!cot))||(servidor&&configurado!==true)||(!servidor&&configurado===null&&preferencia!=="local");
    $("enviar-pedido").textContent=pendiente?"Reintentar pedido pendiente":"Revisar pedido";
    $("vaciar-carrito").disabled=enviando||!!pendiente||!r.detalle.length;
    $("modalidad-pedido").disabled=enviando||!!pendiente||!!mesa;
    mostrarDatos();
    $("modo-pedidos").textContent=servidor?"Práctica en servidor · sesión privada":"Práctica local · esta pestaña";
    $("activar-pedidos").disabled=comprobando||enviando||conectando||!!pendiente||configurado===false;
    $("pedidos-locales").disabled=comprobando||enviando||conectando||!!pendiente||(!servidor&&preferencia==="local");
    $("estado-origen-pedidos").textContent=comprobando?"Comprobando sesión…":configurado===false?"Servidor no configurado.":configurado===null?"No se pudo comprobar el servidor.":servidor?(expira===null?"El primer pedido activará una sesión privada.":"Pedidos en sesión privada."):"Pedidos locales de esta pestaña.";
    $("conteo-local-pedidos").textContent=String(repo.leer().length);$("conteo-remoto-pedidos").textContent=totalRemoto===null?"—":String(totalRemoto);
    $("descartar-pedido").hidden=!pendiente;$("descartar-pedido").disabled=comprobando||enviando||conectando;
    $("abrir-pedidos").href="/demostraciones/pedidos/?"+new URLSearchParams({negocio:datos.id,plan,origen:servidor?"servidor":"local"});
    $("nota-seguimiento").textContent="Aquí el cliente consulta el estado de sus pedidos."+(servidor?" Actualización cada 20 segundos en esta página visible.":" La práctica local permanece en esta pestaña.")+(mesa?" Se muestran solo los pedidos de Mesa "+mesa+". Los contadores de origen corresponden al negocio completo.":"");
  }
  let estadosVistos=new Map(),origenVisto=null,consultaAutomatica=false;
  async function seguimiento(){
    const n=++consultando,modo=servidor;
    let pedidos;try{if(modo&&configurado!==true)throw Error("No se ha comprobado la agenda de pedidos del servidor.");if(modo&&expira===null&&!pendiente&&preferencia!=="servidor")pedidos=[];else if(modo){const v=await remoto.leerEstado();if(n!==consultando||!servidor)return;expira=v.expira;totalRemoto=v.pedidos.length;pedidos=v.pedidos;}else pedidos=repo.leer();}catch(e){if(n===consultando){totalRemoto=null;render();$("lista-seguimiento").replaceChildren();$("sin-pedidos").hidden=true;$("aviso-seguimiento").textContent=e.message+" Activa la práctica en servidor o actualiza."; }return;}
    if(n!==consultando||modo!==servidor)return;
    const origen=modo?"servidor:"+expira:"local";
    const visibles=mesa?pedidos.filter(p=>p.modalidad==="local"&&p.datosCliente?.mesa===mesa):pedidos;
    const listos=origenVisto===origen?nuevosListos(estadosVistos,visibles):[];
    origenVisto=origen;estadosVistos=new Map(visibles.map(p=>[p.folio,p.estado]));
    $("aviso-seguimiento").textContent="";
    $("sin-pedidos").hidden=visibles.length>0;render();
    if(listos.length)notificar(listos.length===1?"¡Tu pedido está listo!":"¡Tienes "+listos.length+" pedidos listos!");
    $("lista-seguimiento").replaceChildren(...visibles.map(p=>{
      const c=nodo("article",undefined,"pedido-resumen");
      c.append(nodo("strong",p.folio),nodo("p",nombresEstado[p.estado],"estado-pedido"+(p.estado==="listo"?" pedido-listo":"")),nodo("p",p.detalle.map(l=>l.cantidad+" × "+textoLinea(l)).join(" · ")),nodo("p","Total: "+importe(p.total)));
      if(p.datosCliente?.cliente){const d=p.datosCliente;c.append(nodo("p","Cliente: "+d.cliente.nombre),nodo("p","Pago previsto: "+d.pago.nombre+(d.mesa?" · Mesa "+d.mesa:"")));if(d.entrega)c.append(nodo("p","Entrega: "+d.entrega.calle+" · "+d.entrega.colonia));if(p.entrega)c.append(nodo("p","Envío: "+importe(p.entrega.envioCentavos)+(p.entrega.horario==="simulado"?" · Horario simulado":"")));}
      c.append(nodo("p",nombresCobro[estadoCobro(p)]+(p.cobro?" · "+importe(p.cobro.importeCentavos):"")+" (práctica)"));
      return c;
    }));
  }
  $("modalidad-pedido").addEventListener("change",()=>{aviso("");render();});
  $("vaciar-carrito").addEventListener("click",()=>{if(enviando||pendiente)return;lineas=[];persistir();aviso("Carrito vacío.");render();});
  $("activar-pedidos").addEventListener("click",async()=>{if(comprobando||enviando||conectando||pendiente)return;conectando=true;render();try{await remoto.conectar();const v=await remoto.leerEstado();expira=v.expira;configurado=true;servidor=true;guardarModo();aviso("Sesión en servidor activada. Los pedidos locales no se importan.");await seguimiento();}catch(e){aviso(e.message);}finally{conectando=false;render();}});
  $("pedidos-locales").addEventListener("click",()=>{if(comprobando||enviando||pendiente||conectando)return;servidor=false;guardarModo();aviso("Práctica local activa.");render();seguimiento();});
  let revision=null;
  const dialogo=$("revision-pedido-demo");
  $("editar-revision-demo").addEventListener("click",()=>{revision=null;dialogo.close();});
  dialogo.addEventListener("close",()=>{revision=null;});
  $("enviar-pedido").addEventListener("click",async()=>{
    if(pendiente){await enviar();return;}
    if(comprobando||enviando||conectando)return;
    try{
     const d=datosCliente(),r=resumenConfirmado(d);
     if(!r.detalle.length)throw Error("Agrega al menos un producto.");
     const cliente=clientesDemo.find(x=>x.id===d.cliente),dir=direccionesDemo.find(x=>x.id===d.direccion),pago=pagosDemo.find(x=>x.id===d.pago),nota=notasPedidoDemo.find(x=>x.id===d.nota);
     const detalle=r.detalle.map(l=>nodo("p",l.cantidad+" × "+textoLinea(l)+" · "+importe(l.subtotal)));
     $("detalle-revision-demo").replaceChildren(nodo("p","Cliente: "+cliente.nombre),nodo("p","Teléfono: "+cliente.telefono),nodo("p","Modalidad: "+modos.find(m=>m.id===r.modalidad).nombre+(d.mesa?" · Mesa "+d.mesa:"")), ...(dir?[nodo("p","Entrega: "+dir.calle+" · "+dir.colonia)]:[]),nodo("p","Pago previsto: "+pago.nombre),nodo("p","Instrucciones: "+nota.nombre),...detalle,nodo("p","Subtotal: "+importe(r.subtotal)),nodo("p","Entrega: "+importe(r.cargo)+(r.entrega?" · "+r.entrega.colonia+(r.entrega.horario==="simulado"?" (horario simulado)":""):"")),nodo("strong","Total: "+importe(r.total)));
     revision=JSON.stringify({r,d});dialogo.showModal();
    }catch(e){aviso(e.message);notificar(e.message,true);}
  });
  $("confirmar-revision-demo").addEventListener("click",async()=>{
   try{const d=datosCliente(),r=resumenConfirmado(d);if(!revision||revision!==JSON.stringify({r,d}))throw Error("El pedido cambió. Revísalo de nuevo.");revision=null;dialogo.close();await enviar();}
   catch(e){revision=null;dialogo.close();aviso(e.message);notificar(e.message,true);}
  });
  async function enviar(){
    if(comprobando||enviando||conectando||servidor&&configurado!==true||!servidor&&configurado===null&&preferencia!=="local")return;enviando=true;render();
    try{
      let p;const clienteNuevo=pendiente?null:datosCliente();
      if(servidor){
        if(pendiente&&pendiente.expira===null)throw Error("Reintento anterior sin sesión identificada. Consulta el historial antes de descartarlo.");
        if(!pendiente&&expira===null)await remoto.conectar();
        const v=await remoto.leerEstado();expira=v.expira;totalRemoto=v.pedidos.length;
        if(pendiente&&pendiente.expira!==expira)throw Error("La sesión del pedido pendiente caducó. No se reenviará a otra sesión.");
        if(!pendiente){const resumen=resumenConfirmado(clienteNuevo);if(!resumen.detalle.length)throw Error("Agrega al menos un producto.");guardarPendiente({expira,datos:prepararSolicitudPedido(resumen,practica,crypto.randomUUID(),clienteNuevo)});}guardarModo();
        const resultado=await remoto.crear(pendiente.datos);p=resultado.pedido;
        if(!p||p.solicitud!==pendiente.datos.solicitud)throw Error("No se pudo confirmar el pedido. Reintenta con el mismo identificador.");
        guardarPendiente(null);
      }else{p=repo.crear(datos.catalogo,lineas,$("modalidad-pedido").value,clienteNuevo,modoHorario());guardarModo();}
      lineas=[];persistir();await seguimiento();aviso("Pedido de práctica "+(servidor?"guardado en servidor":"creado localmente")+". "+p.folio+" · No se envió a un negocio real.");
      $("seccion-seguimiento").scrollIntoView({block:"start"});
    }catch(e){
      // Un 5xx o fallo de red no confirma el resultado: conservar la misma solicitud.
      if(pendiente&&[400,403,409,413,415].includes(e.status)){try{guardarPendiente(null);}catch{}}
      aviso(e.message+(pendiente?" Reintenta el mismo pedido; no se creará uno nuevo.":""));
    }finally{enviando=false;render();}
  }
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
  setInterval(async()=>{if(document.hidden||comprobando||enviando||conectando||consultaAutomatica||pendiente||$("revision-pedido-demo").open||servidor&&expira===null)return;consultaAutomatica=true;try{await seguimiento();}finally{consultaAutomatica=false;}},20000);
  render();detectar();
  if(pendiente)aviso("Hay un pedido pendiente de confirmación. Reintenta para recuperar el resultado sin duplicarlo.");
  return {agregar:(p,b,opciones)=>{
    if(!ofertaPedible(p)){notificar("Este producto no está disponible.",true);return false;}
    let o;try{o=normalizarOpciones(datos.id,p,datos.catalogo,opciones);}catch(e){notificar(e.message,true);return false;}
    const resultado=cambiar(p.id,1,o.seleccion);
    if(!resultado.ok){notificar(resultado.mensaje,true);return false;}
    confirmarBoton(b,resultado.cantidad);
    notificar(p.nombre+" agregado al carrito"+(resultado.guardado?".":". Copia temporal en memoria."));
    const enlace=$("carrito-flotante");enlace.classList.remove("pulso-carrito");void enlace.offsetWidth;enlace.classList.add("pulso-carrito");
    return true;
  },puedeAgregar:ofertaPedible};
}
