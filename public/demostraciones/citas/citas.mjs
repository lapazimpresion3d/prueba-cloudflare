import {importe} from "../config.mjs";
import {obtenerEstablecimiento} from "../establecimientos.mjs";
import {crearCatalogosLocales} from "../catalogo-local.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
import {admiteCitas,recursosCita,serviciosCita,relojLocal,sumarDias,horaCita,horariosCita,crearCitasPractica,nombresCita,transicionesCita} from "../citas-practica.mjs";
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
 let elegido=null,creando=false;
 const solicitud=()=>({servicio:$("servicio").value,recurso:$("recurso").value,fecha:$("fecha").value,inicio:elegido});
 function horas(){
  const p=servicios.find(p=>p.id===$("servicio").value),slots=horariosCita(id,catalogo,repo.leer(),solicitud());
  if(!slots.some(s=>s.inicio===elegido))elegido=null;
  $("resumen-servicio").textContent=p?importe(p.precioCentavos)+" · Duración: "+p.duracionMinutos+" minutos":"No hay servicios disponibles.";
  $("horas").replaceChildren(...slots.map(s=>{const b=el("button",horaCita(s.inicio));b.type="button";b.setAttribute("aria-pressed",String(elegido===s.inicio));b.addEventListener("click",()=>{elegido=s.inicio;horas();});return b;}));
  if(!slots.length)$("horas").append(el("p","No hay horarios disponibles para esta fecha y profesional.","nota"));
  const s=slots.find(s=>s.inicio===elegido);$("seleccion").textContent=s?"Horario elegido: "+horaCita(s.inicio)+"–"+horaCita(s.fin):"Selecciona un horario.";
  $("crear").disabled=creando||!s;
 }
 function render(){
  const citas=repo.leer().sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.inicio-b.inicio||a.recurso.localeCompare(b.recurso));
  const f=$("filtro-fecha").value,r=$("filtro-recurso").value,e=$("filtro-estado").value;
  const lista=citas.filter(c=>!admin||(!f||f===c.fecha)&&(!r||r===c.recurso)&&(!e||e===c.estado));
  $("resumen-agenda").replaceChildren(...Object.entries(nombresCita).map(([k,n])=>{const a=el("div");a.append(el("strong",String(lista.filter(c=>c.estado===k).length)),el("span",n));return a;}));
  $("citas").replaceChildren(...lista.map(c=>{
   const a=el("article");a.append(el("p",c.fecha+" · "+horaCita(c.inicio)+"–"+horaCita(c.fin),"cita-hora"),el("h3",c.nombreServicio),el("p",recursos.find(r=>r.id===c.recurso)?.nombre),el("p",importe(c.precioCentavos)+" · "+nombresCita[c.estado]),el("p",c.folio,"nota"));
   const acciones=el("div",undefined,"acciones-demo"),est=admin?transicionesCita(c.estado):transicionesCita(c.estado).filter(s=>s==="cancelada");
   const etiquetas={confirmada:"Confirmar",atendida:"Marcar atendida",no_asistio:"No asistió",cancelada:"Cancelar"};
   for(const destino of est){const b=el("button",etiquetas[destino]);b.type="button";b.addEventListener("click",()=>{if(destino==="cancelada"&&!confirm("¿Cancelar la cita de práctica?"))return;try{repo.cambiar(c.folio,c.estado,destino);aviso("Cita actualizada: "+nombresCita[destino]+".");}catch(e){aviso(e.message);}render();});acciones.append(b);}
   a.append(acciones);if(admin){const details=el("details"),ul=el("ul");for(const h of c.historial)ul.append(el("li",nombresCita[h.estado]+" · "+new Date(h.fecha).toLocaleString("es-MX",{timeZone:"America/Mazatlan"})));details.append(el("summary","Historial"),ul);a.append(details);}return a;
  }));
  if(!lista.length)$("citas").append(el("p","No hay citas con esta selección.","nota"));
  $("restaurar").disabled=!citas.length;if(!admin)horas();
 }
 for(const k of ["servicio","recurso","fecha"])$(k).addEventListener("change",()=>{elegido=null;horas();});
 $("form-cita").addEventListener("submit",e=>{e.preventDefault();if(admin||creando||elegido===null)return;creando=true;try{const c=repo.crear(catalogo,solicitud());elegido=null;aviso("Cita de práctica creada · "+c.folio+". Consulta su estado abajo.");}catch(e){aviso(e.message);}finally{creando=false;render();}});
 for(const k of ["filtro-fecha","filtro-recurso","filtro-estado"])$(k).addEventListener("change",render);
 $("actualizar").addEventListener("click",render);
 $("restaurar").addEventListener("click",()=>{if(!admin||!confirm("¿Restablecer las citas de práctica de este negocio?"))return;try{repo.restaurar();aviso("Agenda restablecida.");}catch(e){aviso(e.message);}render();});
 window.addEventListener("pageshow",render);document.title=(admin?"Agenda · ":"Citas · ")+negocio.nombre;render();$("contenido").hidden=false;
}
