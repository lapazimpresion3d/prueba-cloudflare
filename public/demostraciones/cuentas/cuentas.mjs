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
 let ocupado=false,configurado=false,expira=null,cuentas=[],pedidos=[],valida=false,pendiente=null;
 const clave="lapaz:demo:cuenta:pendiente";
 try{pendiente=JSON.parse(sessionStorage.getItem(clave)||"null");}catch{}
 const aviso=s=>{$("aviso").textContent=s;};
 $("panel").href=links.administracion;
 $("cocina").href="/demostraciones/cocina/?"+query+"&origen=servidor";
 $("servicio").href=$("cocina").href+"&vista=mesas";
 $("cobros").href="/demostraciones/pedidos/?"+query+"&origen=servidor";
 async function api(url,method="GET",body){
  const r=await fetch(url,{method,credentials:"same-origin",cache:"no-store",...(body===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});
  const v=await r.json();if(!r.ok)throw Object.assign(Error(v.error||"No se pudo completar la operación."),{status:r.status});return v;
 }
 function controles(){
  $("estado").textContent=ocupado?"Consultando…":!configurado?"Falta configurar demo_cuentas o demo_pedidos en D1.":!valida?"Activa la sesión de servidor o actualiza.":"Sesión privada de servidor activa.";
  $("activar").disabled=ocupado||!configurado||valida;$("actualizar").disabled=ocupado;
  for(const b of $("mesas").querySelectorAll("button"))b.disabled=ocupado||!valida||b.dataset.bloqueado==="1";
 }
 function tarjeta(c){
  const card=el("article",undefined,"cuenta-mesa"),s=consumoCuenta(c,pedidos),abierta=c.cerrado===null;
  card.dataset.abierta=String(abierta);
  card.append(el("h3","Mesa "+c.mesa+" · "+(abierta?"Ocupada":"Cerrada")),el("p",c.personas+" personas · "+new Date(c.abierto).toLocaleString("es-MX")),el("p","Cuenta: "+c.cuenta_id,"nota"),el("strong","Consumo: "+importe(s.total),"importe"),el("p","Cobrado: "+importe(s.cobrado)+" · Pendiente: "+importe(s.pendiente)),el("p",s.porEntregar+" comandas por entregar"));
  const detalle=el("details"),lista=el("ul");detalle.append(el("summary",s.todos.length+" comandas"),lista);
  for(const p of s.todos){const item=el("li",nombresEstado[p.estado]+" · "+importe(p.total)+" · "+nombresCobro[estadoCobro(p)]);const partes=el("ul");for(const l of p.detalle)partes.append(el("li",l.cantidad+" × "+textoLinea(l)));item.append(partes);lista.append(item);}
  card.append(detalle);
  if(abierta){
   for(const [texto,origen] of [["Capturar comanda como mesero","mesero"],["Abrir menú del cliente para esta visita","cliente"]]){const a=el("a",texto);a.href=enlaceComanda(c,plan,origen);card.append(a);}
   const b=el("button","Cerrar cuenta y liberar mesa","principal");b.dataset.bloqueado=s.puedeCerrar?"0":"1";b.disabled=!s.puedeCerrar;b.addEventListener("click",()=>{if(ocupado||!valida||!s.puedeCerrar||!confirm("¿Cerrar esta visita y liberar la mesa?"))return;operar(async()=>{await api(ruta,"PATCH",{cuenta:c.cuenta_id,accion:"cerrar"});aviso("Cuenta cerrada. Mesa liberada.");await cargar();});});card.append(b);
   if(!s.puedeCerrar)card.append(el("p","Entrega y concilia todas las comandas desde servicio y cobros antes de cerrar.","nota"));
  }else card.append(el("p","Cerrada: "+new Date(c.cerrado).toLocaleString("es-MX")));
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
  expira=a.expira;cuentas=a.cuentas;pedidos=p.pedidos;valida=true;
  if(pendiente&&(pendiente.expira!==expira||cuentas.some(c=>c.cuenta_id===pendiente.datos.cuenta))){sessionStorage.removeItem(clave);pendiente=null;}
 }
 async function operar(fn){if(ocupado)return;ocupado=true;controles();try{await fn();}catch(e){valida=false;aviso(e.message+" Actualiza para recuperar el estado.");}finally{ocupado=false;render();}}
 async function detectar(){await operar(async()=>{const ctx=await api("/api/demo/contexto?"+query);configurado=ctx.cuentasConfiguradas===true;valida=false;if(configurado){try{await cargar();}catch(e){if(e.status!==401)throw e;}}});}
 $("activar").addEventListener("click",()=>operar(async()=>{await api("/api/demo/sesion","POST");await cargar();aviso("Sesión de práctica activa.");}));
 $("actualizar").addEventListener("click",detectar);window.addEventListener("focus",detectar);window.addEventListener("pageshow",e=>{if(e.persisted)detectar();});
 setInterval(()=>{if(!document.hidden&&!ocupado)detectar();},20000);
 $("contenido").hidden=false;detectar();
}
