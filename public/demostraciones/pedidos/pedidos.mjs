import {importe} from "../config.mjs";
import {obtenerEstablecimiento} from "../establecimientos.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
import {admitePedidos,crearPedidosPractica,modalidadesPedido,nombresEstado,transicionesPedido} from "../pedidos-practica.mjs";
const $=id=>document.getElementById(id);
const el=(tag,texto,clase)=>{const e=document.createElement(tag);if(texto!==undefined)e.textContent=texto;if(clase)e.className=clase;return e;};
const q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan");
const negocio=obtenerEstablecimiento(id);
if(!negocio||!admitePedidos(id,plan)){
  $("error").textContent="Este negocio o plan no admite pedidos de práctica."; $("error").hidden=false;
}else{
  let almacen;try{almacen=sessionStorage;}catch{}
  const repo=crearPedidosPractica(almacen,id,plan),links=enlacesDemo(id,plan);
  $("nombre").textContent=negocio.nombre;$("volver-panel").href=links.administracion;$("ver-cliente").href=links.negocio;$("ver-practica").href=enlacesDemo(id,plan,true).negocio;
  const aviso=s=>{$("aviso").textContent=s;};
  function render(){
    const pedidos=repo.leer(),estado=$("filtro").value,modos=modalidadesPedido(id);
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
        const b=el("button",etiquetas[destino]);b.type="button";b.addEventListener("click",()=>{
          if(destino==="cancelado"&&!confirm("¿Cancelar este pedido de práctica?"))return;
          try{repo.cambiar(p.folio,p.estado,destino);aviso("Estado actualizado: "+nombresEstado[destino]+".");}catch(e){aviso(e.message);}render();
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
  $("filtro").addEventListener("change",render);$("actualizar").addEventListener("click",render);
  $("restaurar").addEventListener("click",()=>{if(!confirm("¿Eliminar todos los pedidos de práctica de "+negocio.nombre+" de esta pestaña?"))return;try{repo.restaurar();aviso("Historial restablecido.");}catch(e){aviso(e.message);}render();});
  window.addEventListener("pageshow",render);document.title="Pedidos · "+negocio.nombre;render();$("contenido-pedidos").hidden=false;
}
