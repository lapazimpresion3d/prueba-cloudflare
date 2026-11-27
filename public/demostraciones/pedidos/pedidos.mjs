import {importe} from "../config.mjs";
import {obtenerEstablecimiento} from "../establecimientos.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
import {admitePedidos,crearPedidosPractica,modalidadesPedido,nombresEstado,transicionesPedido} from "../pedidos-practica.mjs";
import {crearPedidosRemotos,detectarPedidos} from "../pedidos-remotos.mjs";
const $=id=>document.getElementById(id);
const el=(tag,texto,clase)=>{const e=document.createElement(tag);if(texto!==undefined)e.textContent=texto;if(clase)e.className=clase;return e;};
const q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan");
const negocio=obtenerEstablecimiento(id);
if(!negocio||!admitePedidos(id,plan)){
  $("error").textContent="Este negocio o plan no admite pedidos de práctica."; $("error").hidden=false;
}else{
  let almacen;try{almacen=sessionStorage;}catch{}
  const repo=crearPedidosPractica(almacen,id,plan),links=enlacesDemo(id,plan),remoto=crearPedidosRemotos(id,plan),claveModo="lapaz:demo:pedidos:modo:"+id;
  let servidor=false,ocupado=false,generacion=0,preferencia=null,comprobando=false,configurado=null,totalRemoto=null;
  try{preferencia=["local","servidor"].includes(q.get("origen"))?q.get("origen"):almacen?.getItem(claveModo);servidor=preferencia==="servidor";}catch{}
  function guardarModo(){preferencia=servidor?"servidor":"local";try{almacen?.setItem(claveModo,preferencia);}catch{}}
  function controles(){ $("modo-pedidos").textContent=servidor?"Práctica en servidor":"Práctica local";$("activar-pedidos").disabled=comprobando||ocupado||configurado===false;$("pedidos-locales").disabled=comprobando||ocupado||!servidor;$("estado-origen").textContent=comprobando?"Comprobando sesión…":configurado===false?"Servidor no configurado.":configurado===null?"No se pudo comprobar el servidor.":servidor?"Sesión privada en servidor.":"Solo pedidos locales de esta pestaña.";$("cantidad-local").textContent=String(repo.leer().length);$("cantidad-remota").textContent=totalRemoto===null?"—":String(totalRemoto);$("restaurar").hidden=servidor; }
  $("nombre").textContent=negocio.nombre;$("volver-panel").href=links.administracion;$("ver-cliente").href=links.negocio;$("ver-practica").href=enlacesDemo(id,plan,true).negocio;
  const aviso=s=>{$("aviso").textContent=s;};
  async function render(){
    const n=++generacion,modo=servidor;controles();
    let pedidos;try{pedidos=modo?await remoto.leer():repo.leer();}catch(e){if(n===generacion){totalRemoto=null;controles();$("pedidos").replaceChildren();$("resumen").replaceChildren();aviso(e.message+" Activa la práctica en servidor o actualiza.");}return;}
    if(n!==generacion||modo!==servidor)return;if(modo)totalRemoto=pedidos.length;controles();
    const estado=$("filtro").value,modos=modalidadesPedido(id);
    $("resumen").replaceChildren(...Object.entries(nombresEstado).map(([k,n])=>{const c=el("div",undefined,"contador-pedido");c.append(el("strong",String(pedidos.filter(p=>p.estado===k).length)),el("span",n));return c;}));
    const lista=pedidos.filter(p=>!estado||p.estado===estado);
    $("pedidos").replaceChildren(...lista.map(p=>{
      const card=el("article",undefined,"pedido-admin"),head=el("div",undefined,"encabezado");
      head.append(el("strong",p.folio),el("span",nombresEstado[p.estado],"etiqueta disponible"));
      const detalle=el("ul");for(const l of p.detalle)detalle.append(el("li",l.cantidad+" × "+l.nombre+" · "+importe(l.subtotal)));
      card.append(head,el("p",modos.find(m=>m.id===p.modalidad)?.nombre||"Modalidad de ejemplo"),detalle,el("p","Subtotal: "+importe(p.subtotal)+" · Entrega: "+importe(p.cargo)),el("strong","Total: "+importe(p.total)));
      const acciones=el("div",undefined,"acciones-demo");
      const etiquetas={preparando:"Iniciar preparación",listo:"Marcar listo",entregado:"Entregar",cancelado:"Cancelar"};
      for(const destino of transicionesPedido(p.estado)){
        const b=el("button",etiquetas[destino]);b.type="button";b.addEventListener("click",async()=>{
          if(comprobando||ocupado||modo!==servidor)return;
          if(destino==="cancelado"&&!confirm("¿Cancelar este pedido de práctica?"))return;
          ocupado=true;controles();try{if(modo)await remoto.cambiar(p.solicitud,p.estado,destino);else repo.cambiar(p.folio,p.estado,destino);aviso("Estado actualizado: "+nombresEstado[destino]+".");}catch(e){aviso(e.message);}finally{ocupado=false;await render();}
        });acciones.append(b);
      }
      card.append(acciones);
      const historial=el("details"),sum=el("summary","Historial de estados"),log=el("ul");
      for(const h of p.historial)log.append(el("li",nombresEstado[h.estado]+" · "+new Date(h.fecha).toLocaleString("es-MX")));
      historial.append(sum,log);card.append(historial);return card;
    }));
    if(!lista.length)$("pedidos").append(el("p","No hay pedidos con este filtro.","nota"));
    $("restaurar").disabled=!pedidos.length;
  }
  $("activar-pedidos").addEventListener("click",async()=>{if(comprobando||ocupado)return;ocupado=true;controles();try{await remoto.conectar();configurado=true;servidor=true;guardarModo();aviso("Práctica en servidor activada.");}catch(e){aviso(e.message);}finally{ocupado=false;await render();}});
  $("pedidos-locales").addEventListener("click",()=>{if(comprobando||ocupado)return;servidor=false;guardarModo();aviso("Práctica local activa.");render();});
  async function detectar(){if(ocupado||comprobando)return;comprobando=true;controles();try{const v=await detectarPedidos(remoto,{preferencia,locales:repo.leer().length,encargado:true});configurado=v.configurado;servidor=v.servidor;totalRemoto=v.estado?.pedidos.length??null;}catch(e){configurado=null;totalRemoto=null;aviso(e.message);}finally{comprobando=false;await render();}}
  $("filtro").addEventListener("change",()=>{if(!ocupado&&!comprobando)render();});$("actualizar").addEventListener("click",detectar);
  $("restaurar").addEventListener("click",()=>{if(comprobando||servidor||ocupado)return;if(!confirm("¿Eliminar todos los pedidos de práctica de "+negocio.nombre+" de esta pestaña?"))return;try{repo.restaurar();aviso("Historial restablecido.");}catch(e){aviso(e.message);}render();});
  window.addEventListener("pageshow",e=>{if(e.persisted)detectar();});window.addEventListener("focus",detectar);document.title="Pedidos · "+negocio.nombre;detectar();$("contenido-pedidos").hidden=false;
}
