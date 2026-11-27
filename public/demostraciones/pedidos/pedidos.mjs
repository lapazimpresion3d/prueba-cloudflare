import {estadoCobro,nombresCobro,revisionCobro,metodosCobroDemo,motivosAnulacion,centavosCobro,resumenCobros,validarCambioPedido} from "../cobros-practica.mjs";
import {zonasEntregaDemo,horarioEntregaDemo} from "../entrega-practica.mjs";
import {admiteCocina,admiteComandas} from "../cocina-practica.mjs";
import {textoLinea} from "../menu-comal-practica.mjs";
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
  let servidor=false,ocupado=false,generacion=0,preferencia=null,comprobando=false,configurado=null,totalRemoto=null,expiraActual=null,objetivoCobro=null;
  try{preferencia=["local","servidor"].includes(q.get("origen"))?q.get("origen"):almacen?.getItem(claveModo);servidor=preferencia==="servidor";}catch{}
  function guardarModo(){preferencia=servidor?"servidor":"local";try{almacen?.setItem(claveModo,preferencia);}catch{}}
  function controles(){ $("ir-cuentas").hidden=!(id==="taqueria-el-comal"&&["p3","p4"].includes(plan));$("ir-cuentas").href="/demostraciones/cuentas/?"+new URLSearchParams({negocio:id,plan}); for(const [k,permitido,vista] of [["ir-cocina",admiteCocina(id,plan),false],["ir-comandas",admiteComandas(id,plan),true]]){$(k).hidden=!permitido;$(k).href="/demostraciones/cocina/?"+new URLSearchParams({negocio:id,plan,...(vista?{vista:"mesas"}:{}),origen:servidor?"servidor":"local"});} $("modo-pedidos").textContent=servidor?"Práctica en servidor":"Práctica local";$("activar-pedidos").disabled=comprobando||ocupado||configurado===false;$("pedidos-locales").disabled=comprobando||ocupado||!servidor;$("estado-origen").textContent=comprobando?"Comprobando sesión…":configurado===false?"Servidor no configurado.":configurado===null?"No se pudo comprobar el servidor.":servidor?"Sesión privada en servidor.":"Solo pedidos locales de esta pestaña.";$("cantidad-local").textContent=String(repo.leer().length);$("cantidad-remota").textContent=totalRemoto===null?"—":String(totalRemoto);$("restaurar").hidden=servidor; }
  $("nombre").textContent=negocio.nombre;$("volver-panel").href=links.administracion;$("ver-cliente").href=links.negocio;$("ver-practica").href=enlacesDemo(id,plan,true).negocio;
  if(id==="taqueria-el-comal"){$("filtro-mesa-campo").hidden=false;$("filtro-mesa").replaceChildren(new Option("Todas",""),...["1","2","3","4","5","6"].map(m=>new Option("Mesa "+m+(m==="6"?" (histórica)":""),m)));}
  if(id==="taqueria-el-comal"){$("reglas-entrega-empresa").hidden=false;$("horario-entrega-empresa").textContent=horarioEntregaDemo;$("zonas-entrega-empresa").replaceChildren(...zonasEntregaDemo.map(z=>el("li",z.nombre+" · Envío "+importe(z.envioCentavos)+" · Mínimo "+importe(z.minimoCentavos))));}
  const aviso=s=>{$("aviso").textContent=s;};
  const dialogo=$("dialogo-cobro");
  $("motivo-cobro").replaceChildren(new Option("Selecciona motivo",""),...motivosAnulacion.map(x=>new Option(x,x)));
  function actualizarCobro(){
    const o=objetivoCobro;if(!o)return;
    const transferencia=$("metodo-cobro").value!=="efectivo";
    $("campo-referencia-cobro").hidden=!transferencia;
    try{const v=centavosCobro($("recibido-cobro").value);$("cambio-cobro").textContent=transferencia?(v===o.p.total?"Importe exacto":"Debe coincidir con el total"):v>=o.p.total?"Cambio: "+importe(v-o.p.total):"Faltan: "+importe(o.p.total-v);}catch(e){$("cambio-cobro").textContent=e.message;}
  }
  $("metodo-cobro").addEventListener("change",actualizarCobro);$("recibido-cobro").addEventListener("input",actualizarCobro);
  function abrirCobro(p,accion,modo){
    if(ocupado||comprobando||modo!==servidor)return;
    objetivoCobro={p,accion,modo,expira:expiraActual};const anular=accion==="anular";
    $("titulo-dialogo-cobro").textContent=anular?"Anular registro de cobro":"Registrar cobro confirmado";
    $("pedido-cobro").textContent=p.folio+" · Total "+importe(p.total);
    $("campos-cobro").hidden=anular;$("campo-motivo-cobro").hidden=!anular;
    $("metodo-cobro").value=p.datosCliente?.pago?.id==="transferencia"?"transferencia":"efectivo";
    $("recibido-cobro").value=(p.total/100).toFixed(2);$("referencia-cobro").value="";$("motivo-cobro").value="";
    $("error-cobro").textContent="";$("confirmar-cobro").textContent=anular?"Anular registro (no reembolso)":"Confirmar cobro simulado";actualizarCobro();dialogo.showModal();
  }
  $("cerrar-cobro").addEventListener("click",()=>{if(!ocupado)dialogo.close();});
  dialogo.addEventListener("cancel",e=>{if(ocupado)e.preventDefault();});dialogo.addEventListener("close",()=>{objetivoCobro=null;});
  $("form-cobro").addEventListener("submit",async e=>{
    e.preventDefault();const o=objetivoCobro;if(!o||ocupado||comprobando||o.modo!==servidor)return;
    let d;try{d={accion:o.accion,revision:revisionCobro(o.p),...(o.accion==="anular"?{motivo:$("motivo-cobro").value}:{totalEsperado:o.p.total,metodo:$("metodo-cobro").value,recibidoCentavos:centavosCobro($("recibido-cobro").value),referencia:$("referencia-cobro").value.trim()})};}catch(e){$("error-cobro").textContent=e.message;return;}
    ocupado=true;$("confirmar-cobro").disabled=$("cerrar-cobro").disabled=true;
    try{if(o.modo){const actual=await remoto.leerEstado();if(actual.expira!==o.expira)throw Error("La sesión cambió. Cierra y actualiza.");await remoto.cobrar(o.p.solicitud,d);}else repo.cobrar(o.p.folio,d);dialogo.close();aviso(o.accion==="anular"?"Registro anulado. No se devuelve dinero.":"Cobro confirmado de práctica.");}
    catch(e){$("error-cobro").textContent=e.message;}finally{ocupado=false;$("confirmar-cobro").disabled=$("cerrar-cobro").disabled=false;if(!dialogo.open)await render();}
  });
  async function render(){
    const n=++generacion,modo=servidor;controles();
    let pedidos,cuentas=[],multiples=[];try{if(modo){const v=await remoto.leerEstado();pedidos=v.pedidos;cuentas=v.cuentas||[];multiples=v.multiples||[];expiraActual=v.expira;}else{pedidos=repo.leer();expiraActual=null;}}catch(e){if(n===generacion){totalRemoto=null;controles();$("pedidos").replaceChildren();$("resumen").replaceChildren();$("resumen-cobros").replaceChildren();aviso(e.message+" Activa la práctica en servidor o actualiza.");}return;}
    if(n!==generacion||modo!==servidor)return;if(modo)totalRemoto=pedidos.length;controles();
    const estado=$("filtro").value,modos=modalidadesPedido(id);
    $("resumen").replaceChildren(...Object.entries(nombresEstado).map(([k,n])=>{const c=el("div",undefined,"contador-pedido");c.append(el("strong",String(pedidos.filter(p=>p.estado===k).length)),el("span",n));return c;}));
    const porCuenta=new Map(multiples.map(m=>[m.cuenta,m]));
    const estadoFin=p=>porCuenta.has(p.cuenta)&&p.estado!=="cancelado"?(porCuenta.get(p.cuenta).resumen.liquidada?"cobrado":"pendiente"):estadoCobro(p);
    const rc=resumenCobros(pedidos.filter(p=>!porCuenta.has(p.cuenta)));
    for(const m of multiples){rc.cobrado+=m.resumen.abonadoCentavos;rc.pendiente+=m.resumen.saldoCentavos;if(m.resumen.saldoCentavos>0)rc.cantidadPendiente++;for(const v of m.movimientos)rc[v.metodo]+=v.consumoCentavos;}
    $("resumen-cobros").replaceChildren(...[["Cobrado",importe(rc.cobrado)],["Efectivo",importe(rc.efectivo)],["Transferencia",importe(rc.transferencia)],["Tarjeta externa",importe(rc.tarjeta_externa)],["Pendiente ("+rc.cantidadPendiente+")",importe(rc.pendiente)],["Históricos sin registro",String(rc.historicos)]].map(([n,v])=>{const c=el("div",undefined,"contador-pedido");c.append(el("strong",v),el("span",n));return c;}));
    const mesa=$("filtro-mesa").value,pago=$("filtro-cobro").value;const lista=pedidos.filter(p=>(!estado||p.estado===estado)&&(!mesa||p.datosCliente?.mesa===mesa)&&(!pago||estadoFin(p)===pago));
    $("pedidos").replaceChildren(...lista.map(p=>{
      const card=el("article",undefined,"pedido-admin"),head=el("div",undefined,"encabezado");
      head.append(el("strong",p.folio),el("span",nombresEstado[p.estado],"etiqueta disponible"));
      const detalle=el("ul");for(const l of p.detalle)detalle.append(el("li",l.cantidad+" × "+textoLinea(l)+" · "+importe(l.subtotal)));
      card.append(head,el("p",modos.find(m=>m.id===p.modalidad)?.nombre||"Modalidad de ejemplo"),detalle,el("p","Subtotal: "+importe(p.subtotal)+" · Entrega: "+importe(p.cargo)),el("strong","Total: "+importe(p.total)));
      if(p.datosCliente?.cliente){const d=p.datosCliente;card.append(el("p","Cliente: "+d.cliente.nombre),el("p","Teléfono: "+d.cliente.telefono),el("p","Pago previsto: "+d.pago.nombre),el("p","Instrucciones: "+d.nota));if(d.mesa)card.append(el("p","Mesa "+d.mesa));if(d.entrega)card.append(el("p","Entrega: "+d.entrega.calle+" · "+d.entrega.colonia+" · "+d.entrega.referencias));if(p.entrega)card.append(el("p","Tarifa de zona: "+importe(p.entrega.envioCentavos)+" · Mínimo: "+importe(p.entrega.minimoCentavos)+(p.entrega.horario==="simulado"?" · Horario simulado":"")));}else card.append(el("p","Pedido anterior sin datos de cliente.","nota"));
      const cobro=el("section",undefined,"bloque-cobro"),ec=estadoFin(p);cobro.dataset.estado=ec;cobro.append(el("h3",nombresCobro[ec]));
      if(p.cobro){const v=p.cobro;cobro.append(el("p",metodosCobroDemo[v.metodo]+" · "+importe(v.importeCentavos)),el("p",v.metodo==="efectivo"?"Recibido: "+importe(v.recibidoCentavos)+" · Cambio: "+importe(v.cambioCentavos):"Comprobante de prueba: "+v.referencia));}
      if(!porCuenta.has(p.cuenta)&&!p.cobro?.grupo&&p.estado!=="cancelado"&&(p.estado!=="entregado"||p.cuenta)&&p.total>0&&(!p.cuenta||cuentas.some(c=>c.cuenta_id===p.cuenta&&c.cerrado===null))){const b=el("button",p.cobro?"Anular registro de cobro":"Registrar cobro");b.type="button";b.addEventListener("click",()=>abrirCobro(p,p.cobro?"anular":"registrar",modo));cobro.append(b);}
      if(p.cobro?.grupo)cobro.append(el("p","Asignación de cobro de mesa. Anula el grupo desde cuentas de mesa.","nota"));
      if(p.historialCobros?.length){const det=el("details"),log=el("ul");for(const v of p.historialCobros)log.append(el("li",(v.accion==="registrar"?"Registrado":"Anulado: "+v.motivo)+" · "+metodosCobroDemo[v.cobro.metodo]+" · "+importe(v.cobro.importeCentavos)+(v.cobro.referencia?" · "+v.cobro.referencia:"")+" · "+new Date(v.fecha).toLocaleString("es-MX")));det.append(el("summary","Historial de cobros"),log);cobro.append(det);}
      if(porCuenta.has(p.cuenta))cobro.append(el("p","Cobro por cuenta de mesa; consulta el saldo y los abonos desde Cuentas.","nota"));
      if(p.cuenta)cobro.append(el("p","Cuenta de mesa: "+p.cuenta+" · "+(p.captura==="mesero"?"Captura de mesero":"Pedido del cliente"),"nota"));
      card.append(cobro);
      const acciones=el("div",undefined,"acciones-demo");
      const etiquetas={preparando:"Iniciar preparación",listo:"Marcar listo",entregado:"Entregar",cancelado:"Cancelar"};
      for(const destino of transicionesPedido(p.estado)){
        const b=el("button",etiquetas[destino]);b.type="button";try{validarCambioPedido(p,destino);}catch(e){b.disabled=true;b.title=e.message;acciones.append(el("p",e.message,"nota"));}b.addEventListener("click",async()=>{
          if(comprobando||ocupado||modo!==servidor||dialogo.open||b.disabled)return;
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
  async function detectar(){if(ocupado||comprobando||dialogo.open)return;comprobando=true;controles();try{const v=await detectarPedidos(remoto,{preferencia,locales:repo.leer().length,encargado:true});configurado=v.configurado;servidor=v.servidor;totalRemoto=v.estado?.pedidos.length??null;}catch(e){configurado=null;totalRemoto=null;aviso(e.message);}finally{comprobando=false;await render();}}
  $("filtro-cobro").addEventListener("change",()=>{if(!ocupado&&!comprobando&&!dialogo.open)render();});$("filtro").addEventListener("change",()=>{if(!ocupado&&!comprobando)render();});$("filtro-mesa").addEventListener("change",()=>{if(!ocupado&&!comprobando)render();});$("actualizar").addEventListener("click",detectar);
  $("restaurar").addEventListener("click",()=>{if(comprobando||servidor||ocupado)return;if(!confirm("¿Eliminar todos los pedidos de práctica de "+negocio.nombre+" de esta pestaña?"))return;try{repo.restaurar();aviso("Historial restablecido.");}catch(e){aviso(e.message);}render();});
  window.addEventListener("pageshow",e=>{if(e.persisted)detectar();});window.addEventListener("focus",detectar);setInterval(()=>{if(!document.hidden&&!ocupado&&!comprobando)detectar();},20000);document.title="Empresa · Administración de pedidos · "+negocio.nombre;detectar();$("contenido-pedidos").hidden=false;
}
