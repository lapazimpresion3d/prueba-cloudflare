import {estadoOperacion,diarioOperacion} from "../recuperacion-pagos.mjs";
import {panelPagosMultiples} from "./pagos-ui.mjs";
import {versionCuenta} from "../cobro-cuenta.mjs";
import {centavosCobro,motivosAnulacion,metodosCobroDemo} from "../cobros-practica.mjs";
import {admiteCuentas,consumoCuenta,enlaceComanda} from "../cuentas-practica.mjs";
import {mesasComal} from "../mesas-practica.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
import {importe} from "../config.mjs";
import {nombresEstado} from "../pedidos-practica.mjs";
import {nombresCobro,estadoCobro} from "../cobros-practica.mjs";
import {textoLinea} from "../menu-comal-practica.mjs";
const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan");
const el=(t,s,c)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;if(c)n.className=c;return n;};
if(!admiteCuentas(id,plan)){$("error").textContent="Cuentas de mesa no incluidas en este negocio o paquete.";$("error").hidden=false;}
else{
 const query=new URLSearchParams({negocio:id,plan}),ruta="/api/demo/cuentas?"+query,links=enlacesDemo(id,plan);
 let pagosPorCuenta=new Map();
 let ocupado=false,configurado=false,expira=null,cuentas=[],pedidos=[],valida=false,pendiente=null,objetivo=null;
 const clave="lapaz:demo:cuenta:pendiente";
 try{pendiente=JSON.parse(sessionStorage.getItem(clave)||"null");}catch{}
 const diario=diarioOperacion(sessionStorage,"lapaz:demo:operacion:"+id);
 const aviso=s=>{$("aviso").textContent=s;};
 $("panel").href=links.administracion;
 $("terminales-link").href="../terminales/?"+query;
 $("cocina").href="/demostraciones/cocina/?"+query+"&origen=servidor";
 $("servicio").href=$("cocina").href+"&vista=mesas";
 $("cobros").href="/demostraciones/pedidos/?"+query+"&origen=servidor";
 async function api(url,method="GET",body){
  const r=await fetch(url,{method,credentials:"same-origin",cache:"no-store",...(body===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});
  const v=await r.json();if(!r.ok)throw Object.assign(Error(v.error||"No se pudo completar la operación."),{status:r.status});return v;
 }
 async function mutacion(cuenta,method,d){
  if(diario.leer())throw Error("Hay una operación pendiente de verificar. Actualiza primero.");
  const p={cuenta,method,datos:d,expira};
  diario.guardar(p);
  try{await api("/api/demo/pagos-multiples?"+query+"&cuenta="+encodeURIComponent(cuenta),method,d);}
  catch(e){throw Error("Operación sin confirmar. Actualiza para consultar su identificador. "+e.message);}
  diario.limpiar();
 }
 async function recuperar(){
  const p=diario.leer();if(!p)return;
  if(p.expira!==expira){diario.limpiar();aviso("La operación pendiente pertenecía a una sesión anterior; no se reenviará.");return;}
  const url="/api/demo/pagos-multiples?"+query+"&cuenta="+encodeURIComponent(p.cuenta);
  const datos=await api(url),estado=estadoOperacion(p,datos);
  if(estado==="confirmada"){diario.limpiar();aviso("Operación anterior confirmada en el servidor.");return;}
  if(estado==="conflicto"){diario.limpiar();aviso("La cuenta cambió. Operación anterior no registrada; revisa los importes.");return;}
  if(estado==="reintentar"){
   if(!confirm("La operación anterior no aparece registrada. ¿Reintentar con el mismo identificador?")){
    throw Error("Operación pendiente. Actualiza para verificarla antes de continuar.");
   }
   try{await api(url,p.method,p.datos);diario.limpiar();aviso("Operación recuperada.");}
   catch(e){if([400,403,409,413,415].includes(e.status)){diario.limpiar();aviso("Reintento rechazado: "+e.message);return;}throw e;}
  }else throw Error("No se pudo verificar la operación pendiente.");
 }
 function controles(){
  $("estado").textContent=ocupado?"Consultando…":!configurado?"Falta configurar demo_cuentas o demo_pedidos en D1.":!valida?"Activa la sesión de servidor o actualiza.":"Sesión privada de servidor activa.";
  $("activar").disabled=ocupado||!configurado||valida;$("actualizar").disabled=ocupado;
  for(const b of document.querySelectorAll("#mesas button,#historial button"))b.disabled=ocupado||!valida||b.dataset.bloqueado==="1";
 }
 const dialogo=$("dialogo-cuenta");
 $("motivo-cuenta").replaceChildren(new Option("Selecciona motivo",""),...motivosAnulacion.map(x=>new Option(x,x)));
 function actualizarImporte(){if(!objetivo)return;const efectivo=$("metodo-cuenta").value==="efectivo";$("campo-folio-cuenta").hidden=efectivo;try{const recibido=centavosCobro($("recibido-cuenta").value),dif=recibido-objetivo.total;$("cambio-cuenta").textContent=efectivo?(dif>=0?"Cambio: "+importe(dif):"Faltan: "+importe(-dif)):dif===0?"Importe exacto":"El importe debe ser exacto.";}catch(e){$("cambio-cuenta").textContent=e.message;}}
 $("recibido-cuenta").addEventListener("input",actualizarImporte);$("metodo-cuenta").addEventListener("change",actualizarImporte);
 function abrirDialogo(c,s,grupo=null){
  if(ocupado||!valida||dialogo.open)return;
  objetivo={cuenta:c.cuenta_id,version:versionCuenta(s.todos),expira,operacion:crypto.randomUUID(),total:grupo?grupo.total:s.pendiente,grupo:grupo?.id||null};
  $("titulo-cobro-cuenta").textContent=grupo?"Anular cobro completo":"Cobrar saldo de Mesa "+c.mesa;
  $("saldo-cuenta").textContent="Importe: "+importe(objetivo.total);
  $("campos-cuenta").hidden=!!grupo;$("campo-motivo-cuenta").hidden=!grupo;
  $("metodo-cuenta").value="efectivo";$("recibido-cuenta").value=(objetivo.total/100).toFixed(2);$("folio-cuenta").value="";$("motivo-cuenta").value="";$("error-cuenta").textContent="";
  $("confirmar-cuenta").textContent=grupo?"Anular registro (no reembolso)":"Confirmar cobro simulado";actualizarImporte();dialogo.showModal();
 }
 $("volver-cuenta").addEventListener("click",()=>{if(!ocupado)dialogo.close();});
 dialogo.addEventListener("cancel",e=>{if(ocupado)e.preventDefault();});dialogo.addEventListener("close",()=>{objetivo=null;});
 $("form-cuenta").addEventListener("submit",async e=>{
  e.preventDefault();const o=objetivo;if(!o||ocupado||!valida||o.expira!==expira)return;
  let d;try{d={cuenta:o.cuenta,version:o.version,operacion:o.operacion,...(o.grupo?{accion:"anular_cobro",grupo:o.grupo,motivo:$("motivo-cuenta").value}:{accion:"cobrar",totalEsperado:o.total,metodo:$("metodo-cuenta").value,recibidoCentavos:centavosCobro($("recibido-cuenta").value),referencia:$("folio-cuenta").value.trim()})};}catch(e){$("error-cuenta").textContent=e.message;return;}
  ocupado=true;controles();$("confirmar-cuenta").disabled=$("volver-cuenta").disabled=true;
  try{const estado=await api(ruta);if(estado.expira!==o.expira)throw Error("La sesión cambió.");await api(ruta,"PATCH",d);dialogo.close();aviso(o.grupo?"Registro grupal anulado.":"Cobro de mesa registrado.");await cargar();}
  catch(e){valida=false;$("error-cuenta").textContent=e.message+" Cierra el diálogo y actualiza antes de reintentar.";aviso("Consulta el resultado antes de realizar otro cobro.");}
  finally{ocupado=false;$("confirmar-cuenta").disabled=!valida;$("volver-cuenta").disabled=false;render();}
 });
 function tarjeta(c){
  const card=el("article",undefined,"cuenta-mesa"),s=consumoCuenta(c,pedidos),abierta=c.cerrado===null;
  const pm=pagosPorCuenta.get(c.cuenta_id),multiple=pm?.datos?.plan.revision>0;
  card.dataset.abierta=String(abierta);
  card.append(el("h3","Mesa "+c.mesa+" · "+(abierta?"Ocupada":"Cerrada")),el("p",c.personas+" personas · "+new Date(c.abierto).toLocaleString("es-MX")),el("p","Cuenta: "+c.cuenta_id,"nota"),el("strong","Consumo: "+importe(s.total),"importe"),el("p",multiple?"Cobrado: "+importe(pm.datos.resumen.abonadoCentavos)+" · Pendiente: "+importe(pm.datos.resumen.saldoCentavos):pm?.error?"Saldo por verificar":"Cobrado: "+importe(s.cobrado)+" · Pendiente: "+importe(s.pendiente)),el("p",s.porEntregar+" comandas por entregar"));
  const detalle=el("details"),lista=el("ul");detalle.append(el("summary",s.todos.length+" comandas"),lista);
  for(const p of s.todos){const item=el("li",nombresEstado[p.estado]+" · "+importe(p.total)+" · "+(multiple?"Conciliación por cuenta":nombresCobro[estadoCobro(p)]));const partes=el("ul");for(const l of p.detalle)partes.append(el("li",l.cantidad+" × "+textoLinea(l)));item.append(partes);lista.append(item);}
  card.append(detalle);
  const grupos=new Map();for(const p of s.todos)if(p.cobro?.grupo)grupos.set(p.cobro.grupo.id,{...p.cobro.grupo,metodo:p.cobro.metodo,referencia:p.cobro.referencia});
  for(const g of grupos.values()){card.append(el("p","Cobro agrupado: "+importe(g.total)+" · "+metodosCobroDemo[g.metodo]+(g.referencia?" · "+g.referencia:"")+" · Recibido "+importe(g.recibido)+" · Cambio "+importe(g.cambio)));if(abierta){const b=el("button","Anular cobro agrupado");b.addEventListener("click",()=>abrirDialogo(c,s,g));card.append(b);}}
  if(pm?.datos){const url="/api/demo/pagos-multiples?"+query+"&cuenta="+encodeURIComponent(c.cuenta_id);
   card.append(panelPagosMultiples(c,pm.datos,{enviar:d=>operar(async()=>{await mutacion(c.cuenta_id,"POST",d);aviso("Abono de prueba registrado.");await cargar();}),anular:d=>operar(async()=>{await mutacion(c.cuenta_id,"PATCH",d);aviso("Registro anulado; saldo actualizado. No implica devolución.");await cargar();}),reasignar:d=>operar(async()=>{await mutacion(c.cuenta_id,"PATCH",d);aviso("Asignaciones actualizadas.");await cargar();}),cerrar:revision=>operar(async()=>{await mutacion(c.cuenta_id,"PATCH",{accion:"cerrar",revision});aviso("Cuenta cerrada. Mesa liberada.");await cargar();})}));
  }else if(pm?.error)card.append(el("p",pm.error,"nota"));
  if(abierta&&!multiple&&!pm?.error){
   for(const [texto,origen] of [["Capturar comanda como mesero","mesero"],["Abrir menú del cliente para esta visita","cliente"]]){const a=el("a",texto);a.href=enlaceComanda(c,plan,origen);card.append(a);}
   if(s.pendiente>0){const pagar=el("button","Cobrar saldo completo","principal");pagar.dataset.bloqueado=s.porEntregar?"1":"0";pagar.disabled=!!s.porEntregar;pagar.addEventListener("click",()=>{if(!s.porEntregar)abrirDialogo(c,s);});card.append(pagar);}
   const b=el("button","Cerrar cuenta y liberar mesa","principal");b.dataset.bloqueado=s.puedeCerrar?"0":"1";b.disabled=!s.puedeCerrar;b.addEventListener("click",()=>{if(ocupado||!valida||!s.puedeCerrar||!confirm("¿Cerrar esta visita y liberar la mesa?"))return;operar(async()=>{await api(ruta,"PATCH",{cuenta:c.cuenta_id,accion:"cerrar"});aviso("Cuenta cerrada. Mesa liberada.");await cargar();});});card.append(b);
   if(!s.puedeCerrar)card.append(el("p","Entrega todas las comandas y cobra el saldo antes de cerrar.","nota"));
  }else if(!abierta)card.append(el("p","Cerrada: "+new Date(c.cerrado).toLocaleString("es-MX")));
  return card;
 }
 function render(){
  $("mesas").replaceChildren();$("historial").replaceChildren();
  if(valida){
   for(const m of mesasComal){
    const abierta=cuentas.find(c=>c.mesa===m.id&&c.cerrado===null);
    if(abierta){$("mesas").append(tarjeta(abierta));continue;}
    const card=el("article",undefined,"cuenta-mesa"),select=el("select"),label=el("label","Personas"),b=el("button","Abrir cuenta","principal");
    select.replaceChildren(...Array.from({length:m.capacidad},(_,i)=>new Option(String(i+1),String(i+1))));label.append(select);card.append(el("h3",m.nombre+" · Libre"),el("p","Capacidad: "+m.capacidad),label,b);
    b.addEventListener("click",()=>{if(ocupado||!valida)return;operar(async()=>{
      if(pendiente&&pendiente.expira!==expira)throw Error("La solicitud anterior pertenece a otra sesión. Actualiza.");
      if(pendiente&&(pendiente.datos.mesa!==m.id||pendiente.datos.personas!==Number(select.value)))throw Error("Reintenta primero la apertura pendiente de Mesa "+pendiente.datos.mesa+".");
      if(!pendiente){pendiente={expira,datos:{cuenta:crypto.randomUUID(),mesa:m.id,personas:Number(select.value)}};sessionStorage.setItem(clave,JSON.stringify(pendiente));}
      try{await api(ruta,"POST",pendiente.datos);sessionStorage.removeItem(clave);pendiente=null;aviso("Cuenta abierta.");}
      catch(e){if([400,403,409].includes(e.status)){sessionStorage.removeItem(clave);pendiente=null;}throw e;}
      await cargar();
    });});$("mesas").append(card);
   }
   for(const c of cuentas.filter(c=>c.cerrado!==null))$("historial").append(tarjeta(c));
   if(!$("historial").children.length)$("historial").append(el("p","Todavía no hay cuentas cerradas."));
  }
  controles();
 }
 async function cargar(){
  const a=await api(ruta),p=await api("/api/demo/pedidos?"+query);
  if(a.expira!==p.expira||!Array.isArray(a.cuentas)||!Array.isArray(p.pedidos))throw Error("No se pudo verificar la misma sesión.");
  expira=a.expira;
  if(diario.leer()){await recuperar();return cargar();}
  cuentas=a.cuentas;pedidos=p.pedidos;
  const nuevos=new Map();
  await Promise.all(cuentas.filter(c=>{const s=consumoCuenta(c,pedidos);return !s.todos.some(p=>p.cobro)&&!s.porEntregar&&(s.total>0||c.cerrado!==null);}).map(async c=>{
   try{const datos=await api("/api/demo/pagos-multiples?"+query+"&cuenta="+encodeURIComponent(c.cuenta_id));nuevos.set(c.cuenta_id,{datos});}
   catch(e){if(e.status===503&&e.message==="Falta configurar las migraciones de pagos múltiples."&&!p.multiples?.some(m=>m.cuenta===c.cuenta_id))return;if(c.cerrado!==null&&e.status===409)return;nuevos.set(c.cuenta_id,{error:"Pagos múltiples: "+e.message+" Actualiza para verificar."});}
  }));
  pagosPorCuenta=nuevos;valida=true;
  if(pendiente&&(pendiente.expira!==expira||cuentas.some(c=>c.cuenta_id===pendiente.datos.cuenta))){sessionStorage.removeItem(clave);pendiente=null;}
 }
 async function operar(fn){if(ocupado)return;ocupado=true;controles();try{await fn();}catch(e){valida=false;aviso(e.message+" Actualiza para recuperar el estado.");}finally{ocupado=false;render();}}
 async function detectar(){if(dialogo.open||document.activeElement?.closest(".pagos-multiples"))return;await operar(async()=>{const ctx=await api("/api/demo/contexto?"+query);configurado=ctx.cuentasConfiguradas===true;valida=false;if(configurado){try{await cargar();}catch(e){if(e.status!==401)throw e;}}});}
 $("activar").addEventListener("click",()=>operar(async()=>{await api("/api/demo/sesion","POST");await cargar();aviso("Sesión de práctica activa.");}));
 $("actualizar").addEventListener("click",()=>{document.activeElement?.blur();detectar();});window.addEventListener("focus",detectar);window.addEventListener("pageshow",e=>{if(e.persisted)detectar();});
 setInterval(()=>{if(!document.hidden&&!ocupado)detectar();},20000);
 $("contenido").hidden=false;detectar();
}
