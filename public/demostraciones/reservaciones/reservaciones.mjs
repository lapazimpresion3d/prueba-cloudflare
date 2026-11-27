import {guardiaOperacion,limitarRepositorio,permisoAgenda} from "../guardia-operacion.mjs";
import {admiteMesas,mesasComal,horariosMesa,validarReserva,crearReservasLocales,estadosReserva,transicionesReserva,relojLocal,sumarDias,horaCita,enlaceMesa} from "../mesas-practica.mjs";
import {clientesDemo,notasCitaDemo} from "../clientes-practica.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
import {qrMesa} from "./qr-preview.mjs";
const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan"),admin=q.get("vista")==="empresa";
const el=(t,s)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;return n;};
const aviso=s=>{$("aviso").textContent=s;};
if(!admiteMesas(id,plan)){$("error").textContent="Reservaciones no disponibles para este negocio o paquete.";$("error").hidden=false;}
else{
 const clave="lapaz:demo:reservas:modo",clavePendiente="lapaz:demo:reservas:pendiente",base="/demostraciones/reservaciones/?"+new URLSearchParams({negocio:id,plan}),apiq=new URLSearchParams({negocio:id,plan});
 let almacen;try{almacen=sessionStorage;}catch{}
 const guardia=guardiaOperacion(id,plan,admin?q:new URLSearchParams(),localStorage),repo=limitarRepositorio(crearReservasLocales(almacen),guardia,{cambiar:d=>permisoAgenda("mesas",d)});
 let preferencia=null,pendiente=null,servidor=false,configurado=null,expira=null,remotas=[],validas=false,totalRemoto=null,bloqueado=false,slots=[];
 try{preferencia=["local","servidor"].includes(q.get("origen"))?q.get("origen"):almacen?.getItem(clave);pendiente=JSON.parse(almacen?.getItem(clavePendiente)||"null");if(pendiente&&!pendiente.datos?.solicitud)pendiente=null;}catch{}
 servidor=!!pendiente||preferencia==="servidor";if(guardia.restringida){servidor=false;preferencia="local";pendiente=null;$("remoto").hidden=true;}
 function locales(){return repo.leer();}
 function copiaLocal(){try{return locales();}catch(e){aviso(e.message);return [];}}
 function guardarModo(){if(guardia.restringida)return;preferencia=servidor?"servidor":"local";try{almacen?.setItem(clave,preferencia);}catch{}}
 function guardarPendiente(v){if(!almacen)throw Error("Habilita el almacenamiento para conservar la solicitud.");if(v)almacen.setItem(clavePendiente,JSON.stringify(v));else almacen.removeItem(clavePendiente);pendiente=v;}
 async function api(ruta,method="GET",body){const r=await fetch("/api/demo/"+ruta,{method,cache:"no-store",credentials:"same-origin",...(body===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});const v=await r.json();if(!r.ok)throw Object.assign(Error(v.error||"No se pudo consultar."),{status:r.status});return v;}
 async function leerRemotas(){const v=await api("reservaciones?"+apiq);if(!Array.isArray(v.reservas)||!Number.isSafeInteger(v.expira))throw Error("Respuesta de agenda inválida.");expira=v.expira;remotas=v.reservas;totalRemoto=remotas.length;validas=true;}
 async function iniciarRemoto(){await api("sesion","POST");await leerRemotas();}
 const links=enlacesDemo(id,plan);
 $("cliente").href=links.negocio;$("empresa").href=links.administracion;
 $("rol").textContent=admin?"VISTA DE LA EMPRESA":"VISTA DEL CLIENTE";
 $("titulo").textContent=admin?"Administración de reservaciones y mesas":"Reserva tu mesa";
 $("titulo-lista").textContent=admin?"Agenda de la empresa":"Mis reservaciones de práctica";
 $("cambiar-vista").textContent=admin?"Solicitar reservación como cliente":"Abrir agenda del encargado";
 $("formulario").hidden=admin;$("filtro-contenedor").hidden=!admin;$("qr").hidden=!admin;
 $("personas").replaceChildren(...Array.from({length:8},(_,i)=>new Option(String(i+1),String(i+1))));
 $("identidad").replaceChildren(new Option("Selecciona un cliente",""),...clientesDemo.map(c=>new Option(c.nombre,c.id)));
 $("nota").replaceChildren(...notasCitaDemo.map(n=>new Option(n.nombre,n.id)));
 const hoy=relojLocal().fecha;$("fecha").min=hoy;$("fecha").max=sumarDias(hoy,14);$("fecha").value=hoy;
 if(admin)for(const m of mesasComal){const card=el("article"),a=el("a","Abrir menú de "+m.nombre);a.href=enlaceMesa(location.origin,plan,m.id);card.append(el("h3",m.nombre),el("p","Capacidad: "+m.capacidad+" personas"),a);if(plan==="p4"&&location.origin==="https://desarrollo-taqueria-el-comal.lapazimpresion3d.workers.dev"){const img=el("img");img.src=qrMesa(m.id);img.alt="QR de "+m.nombre;const dl=el("a","Guardar QR SVG");dl.href=img.src;dl.download="el-comal-mesa-"+m.id+".svg";card.append(img,dl);}else card.append(el("p","QR imprimible disponible en el Preview P4. En este entorno usa el enlace."));$("qr-lista").append(card);}
 function render(){
  const lr=copiaLocal(),r=servidor?remotas:lr;
  $("modo").textContent=bloqueado?"Procesando…":servidor?(validas?(expira===null?"La primera reserva activará una sesión privada.":"Agenda privada en servidor."):"No se pudo verificar la agenda remota."):configurado===false?"Servidor no configurado: práctica local de esta pestaña.":"Agenda local de esta pestaña.";
  $("num-local").textContent=String(lr.length);$("num-remoto").textContent=totalRemoto===null?"—":String(totalRemoto);
  $("remoto").disabled=bloqueado||!!pendiente||configurado!==true;$("local").disabled=bloqueado||!!pendiente;$("actualizar").disabled=bloqueado;
  $("descartar").hidden=!pendiente||admin;$("descartar").disabled=bloqueado;
  $("cambiar-vista").href=base+(admin?"":"&vista=empresa")+"&origen="+(servidor?"servidor":"local");
  const lista=r.filter(x=>!admin||!$("filtro").value||x.fecha===$("filtro").value);
  $("lista").replaceChildren(...lista.map(c=>{const a=el("article"),d=c.datosCliente; a.append(el("h3","Mesa "+c.mesa+" · "+c.personas+" personas"),el("p",c.fecha+" · "+horaCita(c.inicio)+"–"+horaCita(c.fin)),el("p",estadosReserva[c.estado]),el("p",d.cliente.nombre+" · "+d.cliente.telefono),el("p",d.nota),el("p","Folio: "+c.solicitud));const acciones=el("div");acciones.className="acciones-demo";for(const destino of transicionesReserva(c.estado).filter(x=>(admin||x==="cancelada")&&guardia.permite(permisoAgenda("mesas",x)))){const b=el("button",({confirmada:"Confirmar",atendida:"Marcar atendida",cancelada:"Cancelar",no_asistio:"No asistió"})[destino]);b.disabled=bloqueado||servidor&&!validas;b.type="button";b.addEventListener("click",async()=>{if(bloqueado)return;if(destino==="cancelada"&&!confirm("¿Cancelar esta reservación?"))return;bloqueado=true;render();try{if(servidor){await api("reservaciones?"+apiq,"PATCH",{solicitud:c.solicitud,esperado:c.estado,destino});await leerRemotas();}else repo.cambiar(c.solicitud,c.estado,destino);aviso("Reservación actualizada.");}catch(e){aviso(e.message);}finally{bloqueado=false;render();}});acciones.append(b);}a.append(acciones);return a;}));
  if(!lista.length)$("lista").append(el("p",servidor&&!validas?"Agenda remota no verificada.":"Sin reservaciones con estos filtros."));
  if(admin)return;
  if(pendiente){const d=pendiente.datos;$("fecha").value=d.fecha;$("personas").value=String(d.personas);$("identidad").value=d.datosCliente.cliente;$("nota").value=d.datosCliente.nota;}
  const anterior=$("hora").value,mesaAnterior=$("mesa").value;
  slots=servidor&&!validas?[]:horariosMesa(r,$("fecha").value,Number($("personas").value));
  $("hora").replaceChildren(new Option("Selecciona horario",""),...slots.map(s=>new Option(horaCita(s.inicio)+"–"+horaCita(s.fin),String(s.inicio))));
  if(slots.some(s=>String(s.inicio)===anterior))$("hora").value=anterior;
  actualizarMesas(mesaAnterior);
  $("telefono").value=clientesDemo.find(c=>c.id===$("identidad").value)?.telefono||"";
  for(const k of ["fecha","personas","hora","mesa","identidad","nota"])$(k).disabled=bloqueado||!!pendiente;
  $("guardar").disabled=bloqueado||(!pendiente&&((configurado===null&&preferencia!=="local")||!validas&&servidor||!$("hora").value||!$("mesa").value||!$("identidad").value));
  $("guardar").textContent=pendiente?"Reintentar reservación":"Solicitar reservación";
  if(pendiente)$("detalle").textContent="Reintento: "+pendiente.datos.fecha+" · "+horaCita(pendiente.datos.inicio)+" · Mesa "+pendiente.datos.mesa;
 }
 function actualizarMesas(anterior){const s=slots.find(x=>String(x.inicio)===$("hora").value);$("mesa").replaceChildren(...(s?s.mesas.map(id=>new Option("Mesa "+id+" · "+mesasComal.find(m=>m.id===id).capacidad+" personas",id)):[new Option("Selecciona horario","")]));if(s?.mesas.includes(anterior))$("mesa").value=anterior;$("detalle").textContent=slots.length?"Elige horario y mesa disponible.":"Sin horarios disponibles para esta fecha y cantidad.";}
 for(const k of ["fecha","personas","hora","mesa","identidad","nota"])$(k).addEventListener("change",()=>{if(k==="hora")actualizarMesas("");render();});
 $("filtro").addEventListener("change",render);
 async function detectar(){if(guardia.restringida){servidor=false;configurado=false;render();return;}if(bloqueado)return;bloqueado=true;render();try{configurado=(await api("contexto?"+apiq)).reservacionesConfiguradas===true;validas=false;totalRemoto=null;remotas=[];expira=null;if(configurado){try{await leerRemotas();if(!pendiente&&preferencia!=="servidor"&&preferencia!=="local")servidor=copiaLocal().length===0;}catch(e){if(e.status!==401)throw e;if(!admin&&!pendiente&&preferencia!=="local"&&!copiaLocal().length){servidor=true;validas=true;}}}else if(!pendiente&&preferencia!=="servidor")servidor=false;}catch(e){configurado=null;validas=false;aviso(e.message);}finally{bloqueado=false;render();}}
 $("actualizar").addEventListener("click",detectar);window.addEventListener("focus",detectar);window.addEventListener("pageshow",e=>{if(e.persisted)detectar();});
 $("local").addEventListener("click",()=>{if(bloqueado||pendiente)return;servidor=false;guardarModo();render();});
 $("remoto").addEventListener("click",async()=>{if(guardia.restringida||bloqueado||pendiente)return;bloqueado=true;render();try{await iniciarRemoto();servidor=true;guardarModo();aviso("Sesión privada activa.");}catch(e){aviso(e.message);}finally{bloqueado=false;render();}});
 $("descartar").addEventListener("click",()=>{if(!pendiente||bloqueado||!confirm("¿Descartar reintento? Si llegó al servidor, la reserva sigue registrada."))return;try{guardarPendiente(null);detectar();}catch(e){aviso(e.message);}});
 $("form-reserva").addEventListener("submit",async e=>{e.preventDefault();if(admin||bloqueado||(!pendiente&&configurado===null&&preferencia!=="local"))return;let d;try{d=pendiente?.datos||{solicitud:crypto.randomUUID(),fecha:$("fecha").value,personas:Number($("personas").value),inicio:Number($("hora").value),mesa:$("mesa").value,datosCliente:{cliente:$("identidad").value,nota:$("nota").value}};if(!pendiente)validarReserva(d,servidor?remotas:locales());}catch(e){aviso(e.message);return;}bloqueado=true;render();try{if(servidor){if(configurado!==true)throw Error("Servidor no configurado.");if(!pendiente&&expira===null)await iniciarRemoto();else await leerRemotas();if(pendiente&&pendiente.expira!==expira)throw Error("La sesión caducó. No se reenviará a otra sesión.");if(!pendiente)guardarPendiente({expira,datos:d});guardarModo();const v=await api("reservaciones?"+apiq,"POST",pendiente.datos);if(v.reserva?.solicitud!==d.solicitud)throw Error("No se confirmó la reserva.");guardarPendiente(null);await leerRemotas();}else{repo.crear(d);guardarModo();}aviso("Reservación solicitada. Confírmala desde la agenda de la empresa.");}catch(e){if(pendiente&&[400,403,409,413,415].includes(e.status)){try{guardarPendiente(null);}catch{}}aviso(e.message);if(servidor){try{await leerRemotas();}catch{validas=false;}}}finally{bloqueado=false;render();}});
 $("contenido").hidden=false;detectar();
}
