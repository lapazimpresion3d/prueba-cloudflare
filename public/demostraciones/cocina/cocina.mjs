import {guardiaOperacion,limitarRepositorio,permisoPedido} from "../guardia-operacion.mjs";
import {estadoCobro,nombresCobro,validarCambioPedido} from "../cobros-practica.mjs";
import {admiteCocina,admiteComandas,accionesCocina,comandasActivas,agruparComandas} from "../cocina-practica.mjs";
import {obtenerEstablecimiento} from "../establecimientos.mjs";
import {importe} from "../config.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
import {crearPedidosPractica,nombresEstado} from "../pedidos-practica.mjs";
import {crearPedidosRemotos,detectarPedidos} from "../pedidos-remotos.mjs";
const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan"),mesas=q.get("vista")==="mesas";
const el=(t,s,c)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;if(c)n.className=c;return n;};
if(!(mesas?admiteComandas(id,plan):admiteCocina(id,plan))){$("error").textContent="Esta vista no está incluida en el negocio o paquete.";$("error").hidden=false;}
else{
 let almacen;try{almacen=sessionStorage;}catch{}
 const guardia=guardiaOperacion(id,plan,q,localStorage),repo=limitarRepositorio(crearPedidosPractica(almacen,id,plan),guardia,{cambiar:permisoPedido}),remoto=crearPedidosRemotos(id,plan),links=enlacesDemo(id,plan),clave="lapaz:demo:pedidos:modo:"+id;
 let preferencia=null,servidor=false,configurado=null,ocupado=false,datos=[],valida=false,totalRemoto=null,ultima=null,firma=null,expira=null;
 try{preferencia=["local","servidor"].includes(q.get("origen"))?q.get("origen"):almacen?.getItem(clave);}catch{}
 servidor=preferencia==="servidor";if(guardia.restringida){preferencia="local";servidor=false;}
 const aviso=s=>{$("aviso").textContent=s;};
 const ruta=(vista)=>"/demostraciones/cocina/?"+new URLSearchParams({negocio:id,plan,...(vista?{vista:"mesas"}:{}),origen:servidor?"servidor":"local"});
 function guardarModo(){if(guardia.restringida)return;preferencia=servidor?"servidor":"local";try{almacen?.setItem(clave,preferencia);}catch{}}
 $("titulo").textContent=mesas?"Servicio y comandas por mesa":"Pantalla de cocina";
 $("negocio").textContent=obtenerEstablecimiento(id).nombre;
 $("intro").textContent=mesas?"Agrupa pedidos activos del salón. Marca cada pedido listo como entregado. Los pedidos asociados a una cuenta abierta pueden entregarse antes del cobro. Los independientes requieren cobro conciliado.":"Recibe comandas, consulta cantidades, ingredientes y extras, inicia preparación y marca listo. No contiene datos de contacto, cobros ni cancelaciones.";
 $("panel").href=links.administracion;$("cliente").href=links.negocio;
 $("alternar").hidden=!admiteComandas(id,plan);$("alternar").textContent=mesas?"Ir a cocina":"Ver comandas por mesa";
 if(id==="taqueria-el-comal"){$("filtro-mesa").hidden=false;$("mesa").replaceChildren(new Option("Todas",""),...["1","2","3","4","5","6"].map(m=>new Option("Mesa "+m+(m==="6"?" (histórica)":""),m)),new Option("Local sin mesa","sin-mesa"));}
 function controles(){
  $("origen").textContent=ocupado?"Consultando o actualizando…":servidor?(valida?"Agenda privada en servidor.":"No se pudo verificar el historial remoto."):(configurado===false?"Servidor no configurado. ":"")+"Práctica local de esta pestaña.";
  $("locales").textContent=String(repo.leer().length);$("remotos").textContent=totalRemoto===null?"—":String(totalRemoto);
  $("servidor").hidden=guardia.restringida;$("servidor").disabled=ocupado||configurado!==true;$("local").disabled=ocupado;$("actualizar").disabled=ocupado;
  $("pedidos").href="/demostraciones/pedidos/?"+new URLSearchParams({negocio:id,plan,origen:servidor?"servidor":"local"});$("alternar").href=ruta(!mesas);
  for(const b of $("comandas").querySelectorAll("button"))b.disabled=ocupado||!valida;
 }
 function render(){
  controles();
  $("ultima").textContent=valida&&ultima?"Última consulta: "+new Date(ultima).toLocaleTimeString("es-MX")+" · Actualización cada 20 segundos mientras la vista esté visible.":"Historial sin verificar.";
  const f=JSON.stringify([servidor,valida,datos,$("estado").value,$("mesa").value]);
  if(f===firma)return;firma=f;
  const todos=valida?comandasActivas(datos,{mesas}):[];
  $("resumen").replaceChildren(...["recibido","preparando","listo"].map(s=>{const n=el("div");n.append(el("strong",String(todos.filter(p=>p.estado===s).length)),el("span",nombresEstado[s]));return n;}));
  const lista=valida?comandasActivas(datos,{mesas,estado:$("estado").value,mesa:$("mesa").value}):[];
  $("comandas").replaceChildren(...agruparComandas(lista).map(g=>{
   const grupo=el("section",undefined,"grupo-comanda"),tarjetas=el("div",undefined,"tarjetas-comanda");
   grupo.append(el("h3",g.destino),el("p",g.pedidos.length+" pedidos · "+g.unidades+" unidades"+(mesas?" · Total activo: "+importe(g.total):""),"nota"),tarjetas);
   for(const p of g.pedidos){
    const card=el("article",undefined,"comanda");card.dataset.estado=p.estado;const estado=el("p",nombresEstado[p.estado],"estado-comanda");
    const lista=el("ul");for(const l of p.detalle){const li=el("li",l.cantidad+" × "+l.nombre);if(l.personalizacion?.length)for(const d of l.personalizacion)li.append(el("span",d));lista.append(li);}
    card.append(el("h4",g.destino),estado,el("p",p.folio,"folio"),el("p","Recibido: "+new Date(p.creado).toLocaleTimeString("es-MX")),lista);
    if(p.datosCliente?.nota&&p.datosCliente.nota!=="Sin instrucciones")card.append(el("p","Instrucciones: "+p.datosCliente.nota));
    if(mesas)card.append(el("p",nombresCobro[estadoCobro(p)]));
    for(const destino of accionesCocina(p.estado,mesas)){if(!guardia.permite(permisoPedido(destino)))continue;try{validarCambioPedido(p,destino);}catch(e){card.append(el("p",e.message,"nota"));continue;}const b=el("button",({preparando:"Iniciar preparación",listo:"Pedido listo",entregado:"Marcar entregado"})[destino]);b.type="button";b.addEventListener("click",()=>cambiar(p,destino));card.append(b);}
    tarjetas.append(card);
   }return grupo;
  }));
  if(!lista.length)$("comandas").append(el("p",valida?"No hay comandas activas con estos filtros.":"No se pudo consultar la lista. Actualiza o cambia de origen."));
  controles();
 }
 async function cargar(){
  if(servidor){const v=await remoto.leerEstado();if(expira!==null&&v.expira!==expira)throw Error("La sesión cambió; selecciona de nuevo el servidor.");expira=v.expira;datos=v.pedidos;totalRemoto=datos.length;}else datos=repo.leer();
  valida=true;ultima=Date.now();
 }
 async function operar(fn){if(ocupado)return;ocupado=true;controles();try{aviso("");await fn();}catch(e){valida=false;datos=[];if(servidor)totalRemoto=null;aviso(e.message);}finally{ocupado=false;render();}}
 async function detectar(){if(guardia.restringida){servidor=false;await operar(cargar);return;}await operar(async()=>{const v=await detectarPedidos(remoto,{preferencia,locales:repo.leer().length,encargado:true});configurado=v.configurado;servidor=v.servidor;totalRemoto=v.estado?.pedidos.length??null;expira=v.estado?.expira??null;await cargar();});}
 async function cambiar(p,destino){if(ocupado||!valida||!accionesCocina(p.estado,mesas).includes(destino))return;await operar(async()=>{if(servidor){const actual=await remoto.leerEstado();if(actual.expira!==expira)throw Error("La sesión cambió. Actualiza antes de continuar.");await remoto.cambiar(p.solicitud,p.estado,destino);}else repo.cambiar(p.folio,p.estado,destino);aviso("Pedido actualizado: "+nombresEstado[destino]+".");await cargar();});}
 $("servidor").addEventListener("click",()=>{if(guardia.restringida)return;return operar(async()=>{await remoto.conectar();servidor=true;expira=null;guardarModo();await cargar();aviso("Sesión privada activa.");});});
 $("local").addEventListener("click",()=>operar(async()=>{servidor=false;expira=null;guardarModo();await cargar();aviso("Práctica local activa.");}));
 $("actualizar").addEventListener("click",detectar);$("estado").addEventListener("change",render);$("mesa").addEventListener("change",render);
 const refrescar=()=>{if(!ocupado&&!document.hidden){if(!preferencia&&!servidor&&!repo.leer().length)detectar();else operar(cargar);}};
 window.addEventListener("focus",refrescar);window.addEventListener("pageshow",e=>{if(e.persisted)refrescar();});document.addEventListener("visibilitychange",refrescar);setInterval(refrescar,20000);
 $("contenido").hidden=false;detectar();
}
