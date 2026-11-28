import {textoDemostracion} from "../modo-demostracion.mjs";
import {guardiaOperacion,limitarRepositorio,permisoAgenda} from "../guardia-operacion.mjs";
import {clientesDemo,notasCitaDemo,seleccionCita} from "../clientes-practica.mjs";
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
 const servicios=serviciosCita(catalogo),recursos=recursosCita(id),guardia=guardiaOperacion(id,plan,admin?q:new URLSearchParams(),localStorage),repo=limitarRepositorio(crearCitasPractica(almacen,id,plan),guardia,{cambiar:d=>permisoAgenda("citas",d)});
 const links=enlacesDemo(id,plan,personalizada),base="/demostraciones/citas/?"+new URLSearchParams({negocio:id,plan,...(personalizada?{practica:"1"}:{})});
 $("nombre").textContent=negocio.nombre;$("volver-negocio").href=links.negocio;$("volver-panel").href=links.administracion;
 $("cambiar-vista").href=admin?base:base+"&vista=agenda";$("cambiar-vista").textContent=admin?"Probar como cliente":"Abrir agenda del encargado";
 $("reservar").hidden=admin;$("filtros").hidden=!admin;$("resumen-agenda").hidden=!admin;$("restaurar").hidden=!admin;$("titulo-listado").textContent=admin?"Agenda de citas":"Mis citas";
 const aviso=s=>{$("aviso").textContent=s;};
 $("cliente-cita").replaceChildren(new Option("Selecciona un cliente",""),...clientesDemo.map(x=>new Option(x.nombre,x.id)));
 $("nota-cita").replaceChildren(...notasCitaDemo.map(x=>new Option(x.nombre,x.id)));
 function contactoCita(){const x=clientesDemo.find(x=>x.id===$("cliente-cita").value);$("telefono-cita").value=x?.telefono||"";$("correo-cita").value=x?.correo||"";}
 $("cliente-cita").addEventListener("change",()=>{contactoCita();horas();});contactoCita();
 $("servicio").replaceChildren(...servicios.map(p=>new Option(p.nombre+" · "+p.duracionMinutos+" min · "+importe(p.precioCentavos),p.id)));
 if(servicios.some(p=>p.id===q.get("servicio")))$("servicio").value=q.get("servicio");
 $("recurso").replaceChildren(...recursos.map(r=>new Option(r.nombre,r.id)));
 $("filtro-recurso").replaceChildren(new Option("Todos",""),...recursos.map(r=>new Option(r.nombre,r.id)));
 $("filtro-estado").replaceChildren(new Option("Todos",""),...Object.entries(nombresCita).map(([k,v])=>new Option(v,k)));
 const hoy=relojLocal().fecha;$("fecha").min=hoy;$("fecha").max=sumarDias(hoy,30);$("fecha").value=hoy;
 const remoto=crearCitasRemotas(id,plan),claveModo="lapaz:demo:citas:modo:"+id,clavePendiente="lapaz:demo:citas:pendiente:"+id;
 let elegido=null,creando=false,servidor=false,ocupado=false,lectura=0,copiaRemota=[],listaValida=false,expira=null,pendiente=null,preferencia=null,configurado=null,comprobando=true;
 let remotoDisponible=false,remotoConsultado=false;
 try{preferencia=["local","servidor"].includes(q.get("origen"))?q.get("origen"):almacen?.getItem(claveModo);servidor=preferencia==="servidor";const v=JSON.parse(almacen?.getItem(clavePendiente)||"null");if(v?.datos?.solicitud&&Number.isSafeInteger(v.expira)){pendiente=v;servidor=true;}}catch{}
 if(!pendiente||guardia.restringida){preferencia="local";servidor=false;}if(guardia.restringida){pendiente=null;$("activar-citas").hidden=true;$("restaurar").hidden=true;}
 function modo(){if(guardia.restringida)return;preferencia=servidor?"servidor":"local";try{almacen?.setItem(claveModo,preferencia);}catch{}}
 function guardarPendiente(v){if(!almacen)throw Error("Habilita el almacenamiento para conservar la solicitud.");if(v)almacen.setItem(clavePendiente,JSON.stringify(v));else almacen.removeItem(clavePendiente);pendiente=v;}
 const citasActuales=()=>servidor?copiaRemota:repo.leer();
 function controles(){
  if(pendiente?.datos.datosCliente){$("cliente-cita").value=pendiente.datos.datosCliente.cliente;$("nota-cita").value=pendiente.datos.datosCliente.nota;contactoCita();}
  $("cliente-cita").required=!pendiente;
  $("modo-citas").textContent="Demostración privada";
  $("activar-citas").disabled=comprobando||ocupado||creando||!!pendiente||configurado===false;
  $("estado-origen").textContent=textoDemostracion({ocupado:comprobando,verificado:configurado!==null,servidor,locales:repo.leer().length});
  $("cantidad-local").textContent=String(repo.leer().length);
  $("cantidad-remota").textContent=remotoConsultado?String(copiaRemota.length):"—";
  $("citas-locales").textContent="Ver agenda local";
  $("activar-citas").textContent="Consultar agenda de la sesión compartida";
  const origen="&origen="+(servidor?"servidor":"local");
  $("cambiar-vista").href=base+(admin?"":"&vista=agenda")+origen;
  $("ir-agenda").href=base+"&vista=agenda"+origen;
  $("citas-locales").disabled=comprobando||ocupado||creando||!!pendiente||!servidor;
  $("restaurar").hidden=!admin||servidor;
  $("descartar-cita").hidden=!pendiente||admin;
  $("descartar-cita").disabled=ocupado||creando;
  for(const k of ["servicio","recurso","fecha","cliente-cita","nota-cita"])$(k).disabled=creando||ocupado||!!pendiente;
 }
 const solicitud=()=>({servicio:$("servicio").value,recurso:$("recurso").value,fecha:$("fecha").value,inicio:elegido});
 const solicitudCompleta=()=>({...solicitud(),datosCliente:seleccionCita({cliente:$("cliente-cita").value,nota:$("nota-cita").value})});
 function horas(){
  const p=servicios.find(p=>p.id===$("servicio").value),slots=servidor&&!listaValida?[]:horariosCita(id,catalogo,citasActuales(),solicitud());
  if(!slots.some(s=>s.inicio===elegido))elegido=null;
  $("resumen-servicio").textContent=p?importe(p.precioCentavos)+" · Duración: "+p.duracionMinutos+" minutos":"No hay servicios disponibles.";
  $("horas").replaceChildren(...slots.map(s=>{const b=el("button",horaCita(s.inicio));b.type="button";b.setAttribute("aria-pressed",String(elegido===s.inicio));b.disabled=creando||ocupado||!!pendiente;b.addEventListener("click",()=>{if(pendiente||creando||ocupado)return;elegido=s.inicio;horas();});return b;}));
  if(!slots.length)$("horas").append(el("p","No hay horarios disponibles para esta fecha y profesional.","nota"));
  const s=slots.find(s=>s.inicio===elegido);$("seleccion").textContent=s?"Horario elegido: "+horaCita(s.inicio)+"–"+horaCita(s.fin):"Selecciona un horario.";
  $("crear").disabled=comprobando||creando||ocupado||(!pendiente&&(!s||!$("cliente-cita").value))||(servidor&&!pendiente&&!listaValida);
  $("crear").textContent=pendiente?"Reintentar cita pendiente":"Solicitar cita";
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
   if(c.datosCliente?.cliente){const d=c.datosCliente;a.append(el("p","Cliente: "+d.cliente.nombre),el("p","Teléfono: "+d.cliente.telefono),el("p","Correo: "+d.cliente.correo),el("p","Comentarios: "+d.nota));}
   else a.append(el("p","Cita anterior sin datos de cliente.","nota"));
   const acciones=el("div",undefined,"acciones-demo"),est=admin?transicionesCita(c.estado):transicionesCita(c.estado).filter(s=>s==="cancelada");
   const etiquetas={confirmada:"Confirmar",atendida:"Marcar atendida",no_asistio:"No asistió",cancelada:"Cancelar"};
   for(const destino of est){if(!guardia.permite(permisoAgenda("citas",destino)))continue;const b=el("button",etiquetas[destino]);b.type="button";b.disabled=ocupado||creando||servidor&&!listaValida;b.addEventListener("click",async()=>{if(ocupado||creando||servidor&&!listaValida)return;if(destino==="cancelada"&&!confirm("¿Cancelar la cita?"))return;ocupado=true;render();try{if(servidor)await remoto.cambiar(c.solicitud,c.estado,destino);else repo.cambiar(c.folio,c.estado,destino);aviso("Cita actualizada: "+nombresCita[destino]+".");}catch(e){aviso(e.message);}finally{ocupado=false;await actualizar();}});acciones.append(b);}
   a.append(acciones);if(admin){const details=el("details"),ul=el("ul");for(const h of c.historial)ul.append(el("li",nombresCita[h.estado]+" · "+new Date(h.fecha).toLocaleString("es-MX",{timeZone:"America/Mazatlan"})));details.append(el("summary","Historial"),ul);a.append(details);}return a;
  }));
  if(!lista.length)$("citas").append(el("p",comprobando?"Consultando agenda…":servidor&&!listaValida?"No se pudo consultar la agenda del servidor. Actualiza o activa la sesión.":servidor?"No hay citas en esta sesión del servidor con estos filtros.":"No hay citas locales en esta pestaña con estos filtros.","nota"));
  $("restaurar").disabled=ocupado||creando||!citas.length;if(!admin)horas();
 }
 for(const k of ["servicio","recurso","fecha"])$(k).addEventListener("change",()=>{elegido=null;horas();});
 async function actualizar(){
  const n=++lectura;
  if(!servidor){render();return;}
  if(expira===null&&!pendiente&&!admin){await iniciarAgenda();return;}
  try{const v=await remoto.leer();if(n!==lectura||!servidor)return;copiaRemota=v.citas;expira=v.expira;listaValida=true;remotoDisponible=true;remotoConsultado=true;}
  catch(e){if(n!==lectura)return;copiaRemota=[];listaValida=false;remotoConsultado=false;remotoDisponible=false;aviso(e.message+" Actualiza para consultar la agenda.");}
  render();
 }
 async function abrirRemoto(){if(guardia.restringida)return;
 if(comprobando||ocupado||creando||pendiente)return;
 ocupado=true;render();
 try{const v=await remoto.conectar();servidor=true;configurado=true;listaValida=true;remotoDisponible=true;remotoConsultado=true;expira=v.expira;copiaRemota=v.citas;modo();aviso("Agenda en servidor activa. Las citas locales siguen disponibles por separado.");}
 catch(e){aviso(e.message);}finally{ocupado=false;render();}
 }
 $("activar-citas").addEventListener("click",abrirRemoto);
 // El encargado detecta la sesión ya existente incluso en otra pestaña.
 // Nunca migrar ni borrar citas locales. Si hay ambas, las dos se indican con sus conteos.
 async function iniciarAgenda(){if(guardia.restringida||!pendiente){servidor=false;preferencia="local";comprobando=false;configurado=false;listaValida=true;render();if(guardia.restringida)$("restaurar").hidden=true;return;}
 const n=++lectura;comprobando=true;render();
 try{
  configurado=await remoto.disponibilidad();
  if(n!==lectura)return;
  if(configurado){
   try{const v=await remoto.leer();if(n!==lectura)return;copiaRemota=v.citas;expira=v.expira;remotoDisponible=true;remotoConsultado=true;listaValida=true;
    if(pendiente||preferencia==="servidor"||preferencia!=="local"&&repo.leer().length===0)servidor=true;
    else servidor=false;
   }catch(e){if(n!==lectura)return;if(e.status!==401)aviso(e.message);listaValida=false;
    // Cliente nuevo: reservar en servidor por defecto cuando esté configurado.
    // Crear sesión solo al solicitar una cita, no al visitar la página.
    if(!admin&&!pendiente&&preferencia!=="local"&&repo.leer().length===0&&e.status===401){servidor=true;listaValida=true;expira=null;remotoDisponible=false;remotoConsultado=true;copiaRemota=[];}
    else if(e.status===401){remotoDisponible=false;remotoConsultado=false;copiaRemota=[];}
   }
  }else if(!pendiente){servidor=false;listaValida=false;}
 }catch(e){if(n!==lectura)return;configurado=null;aviso("No se pudo comprobar la agenda remota. "+e.message);}
 finally{if(n===lectura){comprobando=false;render();}}
 }
 $("citas-locales").addEventListener("click",()=>{if(ocupado||creando||pendiente)return;lectura++;servidor=false;listaValida=false;elegido=null;modo();aviso("Práctica local activa.");render();});
 $("descartar-cita").addEventListener("click",()=>{if(admin||!pendiente||ocupado||creando)return;if(!confirm("¿Descartar el reintento? Si la cita llegó al servidor, seguirá en la agenda. Actualiza antes de solicitar otra."))return;try{guardarPendiente(null);elegido=null;aviso("Reintento descartado. Consulta la agenda antes de crear otra cita.");actualizar();}catch(e){aviso(e.message);}});
 $("form-cita").addEventListener("submit",async e=>{
  e.preventDefault();if(admin||comprobando||creando||ocupado||(!pendiente&&elegido===null))return;
  creando=true;render();
  try{
   let c;
   if(servidor){
    const v=expira===null&&!pendiente?await remoto.conectar():await remoto.leer();expira=v.expira;copiaRemota=v.citas;listaValida=true;remotoDisponible=true;remotoConsultado=true;modo();
    if(pendiente&&pendiente.expira!==expira)throw Error("La sesión del reintento caducó. No se reenviará en otra sesión. Descarta el reintento.");
    if(!pendiente){const d=solicitudCompleta(),p=servicios.find(p=>p.id===d.servicio);if(!p||!horariosCita(id,catalogo,copiaRemota,d).some(h=>h.inicio===d.inicio))throw Error("Horario ocupado. Selecciona otro.");guardarPendiente({expira,datos:prepararCita(d,p,personalizada,crypto.randomUUID())});}
    const resultado=await remoto.crear(pendiente.datos);c=resultado.cita;
    if(!c||c.solicitud!==pendiente.datos.solicitud)throw Error("No se confirmó la cita. Reintenta.");
    guardarPendiente(null);
   }else{c=repo.crear(catalogo,solicitudCompleta());modo();}
   elegido=null;aviso("Cita de práctica "+(servidor?"guardada en servidor":"creada localmente")+" · "+c.folio);
   $("ir-agenda").hidden=false;
  }catch(e){if(pendiente&&[400,403,409,413,415].includes(e.status)){try{guardarPendiente(null);}catch{}}aviso(e.message+(pendiente?" Conserva o reintenta la solicitud pendiente.":""));}
  finally{creando=false;await actualizar();}
 });
 for(const k of ["filtro-fecha","filtro-recurso","filtro-estado"])$(k).addEventListener("change",render);
 $("actualizar").addEventListener("click",()=>{if(!comprobando&&!ocupado&&!creando)iniciarAgenda();});
 $("restaurar").addEventListener("click",()=>{if(guardia.restringida||!admin||servidor||ocupado||creando||!confirm("¿Restablecer las citas de práctica de este negocio?"))return;try{repo.restaurar();aviso("Agenda restablecida.");}catch(e){aviso(e.message);}render();});
 window.addEventListener("pageshow",e=>{if(e.persisted&&!comprobando&&!ocupado&&!creando)iniciarAgenda();});
 window.addEventListener("focus",()=>{if(!comprobando&&!ocupado&&!creando)iniciarAgenda();});
 document.title=(admin?"Agenda · ":"Citas · ")+negocio.nombre;render();$("contenido").hidden=false;iniciarAgenda();
}
