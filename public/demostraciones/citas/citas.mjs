import {importe} from "../config.mjs";
import {obtenerEstablecimiento} from "../establecimientos.mjs";
import {crearCatalogosLocales} from "../catalogo-local.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
import {admiteCitas,recursosCita,serviciosCita,relojLocal,sumarDias,horaCita,horariosCita,crearCitasPractica,nombresCita,transicionesCita} from "../citas-practica.mjs";
import {crearCitasRemotas,prepararCita} from "../citas-remotas.mjs";
const $=id=>document.getElementById(id);
const el=(tag,txt,clase)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(clase)e.className=clase;return e;};
const q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan"),admin=q.get("vista")==="agenda",personalizada=q.get("practica")==="1";
const negocio=obtenerEstablecimiento(id);
if(!negocio||!admiteCitas(id,plan)){
 $("error").textContent="Las citas no están disponibles para este negocio y plan."; $("error").hidden=false;
}else{
 let almacen;try{almacen=sessionStorage;}catch{}
 const catalogo=personalizada?crearCatalogosLocales(almacen).leer(id):negocio.catalogo;
 const servicios=serviciosCita(catalogo),recursos=recursosCita(id),repo=crearCitasPractica(almacen,id,plan);
 const links=enlacesDemo(id,plan,personalizada),base="/demostraciones/citas/?"+new URLSearchParams({negocio:id,plan,...(personalizada?{practica:"1"}:{})});
 $("nombre").textContent=negocio.nombre;$("volver-negocio").href=links.negocio;$("volver-panel").href=links.administracion;
 $("cambiar-vista").href=admin?base:base+"&vista=agenda";$("cambiar-vista").textContent=admin?"Probar como cliente":"Abrir agenda del encargado";
 $("reservar").hidden=admin;$("filtros").hidden=!admin;$("resumen-agenda").hidden=!admin;$("restaurar").hidden=!admin;$("titulo-listado").textContent=admin?"Agenda de citas":"Mis citas de práctica";
 const aviso=s=>{$("aviso").textContent=s;};
 $("servicio").replaceChildren(...servicios.map(p=>new Option(p.nombre+" · "+p.duracionMinutos+" min · "+importe(p.precioCentavos),p.id)));
 if(servicios.some(p=>p.id===q.get("servicio")))$("servicio").value=q.get("servicio");
 $("recurso").replaceChildren(...recursos.map(r=>new Option(r.nombre,r.id)));
 $("filtro-recurso").replaceChildren(new Option("Todos",""),...recursos.map(r=>new Option(r.nombre,r.id)));
 $("filtro-estado").replaceChildren(new Option("Todos",""),...Object.entries(nombresCita).map(([k,v])=>new Option(v,k)));
 const hoy=relojLocal().fecha;$("fecha").min=hoy;$("fecha").max=sumarDias(hoy,30);$("fecha").value=hoy;
 const remoto=crearCitasRemotas(id,plan),claveModo="lapaz:demo:citas:modo:"+id,clavePendiente="lapaz:demo:citas:pendiente:"+id;
 let elegido=null,creando=false,servidor=false,ocupado=false,lectura=0,copiaRemota=[],listaValida=false,expira=null,pendiente=null;
 try{servidor=almacen?.getItem(claveModo)==="servidor";const v=JSON.parse(almacen?.getItem(clavePendiente)||"null");if(v?.datos?.solicitud&&Number.isSafeInteger(v.expira)){pendiente=v;servidor=true;}}catch{}
 function modo(){try{almacen?.setItem(claveModo,servidor?"servidor":"local");}catch{}}
 function guardarPendiente(v){if(!almacen)throw Error("Habilita el almacenamiento para conservar la solicitud.");if(v)almacen.setItem(clavePendiente,JSON.stringify(v));else almacen.removeItem(clavePendiente);pendiente=v;}
 const citasActuales=()=>servidor?copiaRemota:repo.leer();
 function controles(){
  $("modo-citas").textContent=servidor?"Práctica en servidor · sesión privada":"Práctica local · esta pestaña";
  $("activar-citas").disabled=ocupado||creando||!!pendiente;
  $("citas-locales").disabled=ocupado||creando||!!pendiente||!servidor;
  $("restaurar").hidden=!admin||servidor;
  $("descartar-cita").hidden=!pendiente||admin;
  $("descartar-cita").disabled=ocupado||creando;
  for(const k of ["servicio","recurso","fecha"])$(k).disabled=creando||ocupado||!!pendiente;
 }
 const solicitud=()=>({servicio:$("servicio").value,recurso:$("recurso").value,fecha:$("fecha").value,inicio:elegido});
 function horas(){
  const p=servicios.find(p=>p.id===$("servicio").value),slots=servidor&&!listaValida?[]:horariosCita(id,catalogo,citasActuales(),solicitud());
  if(!slots.some(s=>s.inicio===elegido))elegido=null;
  $("resumen-servicio").textContent=p?importe(p.precioCentavos)+" · Duración: "+p.duracionMinutos+" minutos":"No hay servicios disponibles.";
  $("horas").replaceChildren(...slots.map(s=>{const b=el("button",horaCita(s.inicio));b.type="button";b.setAttribute("aria-pressed",String(elegido===s.inicio));b.disabled=creando||ocupado||!!pendiente;b.addEventListener("click",()=>{if(pendiente||creando||ocupado)return;elegido=s.inicio;horas();});return b;}));
  if(!slots.length)$("horas").append(el("p","No hay horarios disponibles para esta fecha y profesional.","nota"));
  const s=slots.find(s=>s.inicio===elegido);$("seleccion").textContent=s?"Horario elegido: "+horaCita(s.inicio)+"–"+horaCita(s.fin):"Selecciona un horario.";
  $("crear").disabled=creando||ocupado||(!pendiente&&!s)||(servidor&&!pendiente&&!listaValida);
  $("crear").textContent=pendiente?"Reintentar cita pendiente":"Solicitar cita de práctica";
  if(pendiente)$("seleccion").textContent="Solicitud pendiente: "+pendiente.datos.fecha+" · "+horaCita(pendiente.datos.inicio)+". Reintenta sin modificarla.";
  controles();
 }
 function render(){
  controles();
  const citas=citasActuales().sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.inicio-b.inicio||a.recurso.localeCompare(b.recurso));
  const f=$("filtro-fecha").value,r=$("filtro-recurso").value,e=$("filtro-estado").value;
  const lista=citas.filter(c=>!admin||(!f||f===c.fecha)&&(!r||r===c.recurso)&&(!e||e===c.estado));
  $("resumen-agenda").replaceChildren(...Object.entries(nombresCita).map(([k,n])=>{const a=el("div");a.append(el("strong",String(lista.filter(c=>c.estado===k).length)),el("span",n));return a;}));
  $("citas").replaceChildren(...lista.map(c=>{
   const a=el("article");a.append(el("p",c.fecha+" · "+horaCita(c.inicio)+"–"+horaCita(c.fin),"cita-hora"),el("h3",c.nombreServicio),el("p",recursos.find(r=>r.id===c.recurso)?.nombre),el("p",importe(c.precioCentavos)+" · "+nombresCita[c.estado]),el("p",c.folio,"nota"));
   const acciones=el("div",undefined,"acciones-demo"),est=admin?transicionesCita(c.estado):transicionesCita(c.estado).filter(s=>s==="cancelada");
   const etiquetas={confirmada:"Confirmar",atendida:"Marcar atendida",no_asistio:"No asistió",cancelada:"Cancelar"};
   for(const destino of est){const b=el("button",etiquetas[destino]);b.type="button";b.disabled=ocupado||creando||servidor&&!listaValida;b.addEventListener("click",async()=>{if(ocupado||creando||servidor&&!listaValida)return;if(destino==="cancelada"&&!confirm("¿Cancelar la cita de práctica?"))return;ocupado=true;render();try{if(servidor)await remoto.cambiar(c.solicitud,c.estado,destino);else repo.cambiar(c.folio,c.estado,destino);aviso("Cita actualizada: "+nombresCita[destino]+".");}catch(e){aviso(e.message);}finally{ocupado=false;await actualizar();}});acciones.append(b);}
   a.append(acciones);if(admin){const details=el("details"),ul=el("ul");for(const h of c.historial)ul.append(el("li",nombresCita[h.estado]+" · "+new Date(h.fecha).toLocaleString("es-MX",{timeZone:"America/Mazatlan"})));details.append(el("summary","Historial"),ul);a.append(details);}return a;
  }));
  if(!lista.length)$("citas").append(el("p","No hay citas con esta selección.","nota"));
  $("restaurar").disabled=ocupado||creando||!citas.length;if(!admin)horas();
 }
 for(const k of ["servicio","recurso","fecha"])$(k).addEventListener("change",()=>{elegido=null;horas();});
 async function actualizar(){
  const n=++lectura;
  if(!servidor){render();return;}
  try{const v=await remoto.leer();if(n!==lectura||!servidor)return;copiaRemota=v.citas;expira=v.expira;listaValida=true;}
  catch(e){if(n!==lectura)return;copiaRemota=[];listaValida=false;aviso(e.message+" Actualiza o activa la sesión.");}
  render();
 }
 $("activar-citas").addEventListener("click",async()=>{if(ocupado||creando||pendiente)return;ocupado=true;render();try{const v=await remoto.conectar();servidor=true;listaValida=true;expira=v.expira;copiaRemota=v.citas;modo();aviso("Sesión privada activa. No se importan citas locales.");}catch(e){aviso(e.message);}finally{ocupado=false;render();}});
 $("citas-locales").addEventListener("click",()=>{if(ocupado||creando||pendiente)return;lectura++;servidor=false;listaValida=false;elegido=null;modo();aviso("Práctica local activa.");render();});
 $("descartar-cita").addEventListener("click",()=>{if(admin||!pendiente||ocupado||creando)return;if(!confirm("¿Descartar el reintento? Si la cita llegó al servidor, seguirá en la agenda. Actualiza antes de solicitar otra."))return;try{guardarPendiente(null);elegido=null;aviso("Reintento descartado. Consulta la agenda antes de crear otra cita.");actualizar();}catch(e){aviso(e.message);}});
 $("form-cita").addEventListener("submit",async e=>{
  e.preventDefault();if(admin||creando||ocupado||(!pendiente&&elegido===null))return;
  creando=true;render();
  try{
   let c;
   if(servidor){
    const v=await remoto.leer();expira=v.expira;copiaRemota=v.citas;listaValida=true;
    if(pendiente&&pendiente.expira!==expira)throw Error("La sesión del reintento caducó. No se reenviará en otra sesión. Descarta el reintento.");
    if(!pendiente){const d=solicitud(),p=servicios.find(p=>p.id===d.servicio);if(!p||!horariosCita(id,catalogo,copiaRemota,d).some(h=>h.inicio===d.inicio))throw Error("Horario ocupado. Selecciona otro.");guardarPendiente({expira,datos:prepararCita(d,p,personalizada,crypto.randomUUID())});}
    const resultado=await remoto.crear(pendiente.datos);c=resultado.cita;
    if(!c||c.solicitud!==pendiente.datos.solicitud)throw Error("No se confirmó la cita. Reintenta.");
    guardarPendiente(null);
   }else c=repo.crear(catalogo,solicitud());
   elegido=null;aviso("Cita de práctica "+(servidor?"guardada en servidor":"creada localmente")+" · "+c.folio);
  }catch(e){if(pendiente&&[400,403,409,413,415].includes(e.status)){try{guardarPendiente(null);}catch{}}aviso(e.message+(pendiente?" Conserva o reintenta la solicitud pendiente.":""));}
  finally{creando=false;await actualizar();}
 });
 for(const k of ["filtro-fecha","filtro-recurso","filtro-estado"])$(k).addEventListener("change",render);
 $("actualizar").addEventListener("click",actualizar);
 $("restaurar").addEventListener("click",()=>{if(!admin||servidor||ocupado||creando||!confirm("¿Restablecer las citas de práctica de este negocio?"))return;try{repo.restaurar();aviso("Agenda restablecida.");}catch(e){aviso(e.message);}render();});
 window.addEventListener("pageshow",actualizar);document.title=(admin?"Agenda · ":"Citas · ")+negocio.nombre;render();$("contenido").hidden=false;if(servidor)actualizar();
}
