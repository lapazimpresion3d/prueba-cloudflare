import {establecimientos} from "../establecimientos.mjs";
import {presentacionDe,enlacesDemo,simbolos,planesRepresentativos} from "../presentaciones.mjs";
import {planes,capacidades} from "../config.mjs";
import {ilustracionPortada} from "../ilustraciones.mjs";
const el=(tag,t,c)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;if(c)e.className=c;return e;};
const cont=document.getElementById("ejemplos");
for(const negocio of establecimientos){
 const t=presentacionDe(negocio.id),card=el("article",undefined,"ejemplo");
 const plan=planes.find(p=>p.id===planesRepresentativos[negocio.id]);
 const mods=capacidades(negocio,plan.id);
 card.style.setProperty("--marca",negocio.marca.color);card.style.setProperty("--fondo",negocio.marca.fondo);
 const arte=el("div",undefined,"arte");arte.setAttribute("aria-hidden","true");
 const ilustracion=ilustracionPortada(t.estilo);
 if(ilustracion){arte.innerHTML=ilustracion;}else if(t.estilo==="comal"){const img=el("img");img.src="/imagenes/pastor.webp";img.alt="";img.addEventListener("error",()=>{img.hidden=true;});arte.append(img);}
 const sello=el("div",undefined,"sello");sello.innerHTML='<svg viewBox="0 0 96 96" width="48" height="48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'+simbolos[t.estilo]+'</svg>';arte.append(sello);
 const info=el("div",undefined,"info");const a=el("a","Explorar demostración","accion");a.href=enlacesDemo(negocio.id,plan.id).negocio;a.setAttribute("aria-label","Explorar "+negocio.nombre);
 const lista=el("ul",undefined,"funciones"),pendientes=el("ul",undefined,"funciones pendientes"),detalle=el("details",undefined,"modulos-pendientes");detalle.append(el("summary","Funciones pendientes de este paquete"),pendientes);
 lista.replaceChildren(...mods.filter(m=>m.estadoEfectivo==="disponible").map(m=>el("li",m.nombre)));
 const resto=mods.filter(m=>m.estadoEfectivo==="en_desarrollo"||m.estadoEfectivo==="ejemplo");detalle.hidden=!resto.length;pendientes.replaceChildren(...resto.map(m=>el("li",m.nombre+" · En desarrollo")));
 info.append(el("p",negocio.giroNombre,"etiqueta"),el("h2",negocio.nombre),el("p",plan.nombre+" · Ejemplo representativo","plan-representativo"),el("p",t.entrada),el("strong","Disponible para probar","funciones-titulo"),lista,detalle,a);card.append(arte,info);cont.append(card);
}

