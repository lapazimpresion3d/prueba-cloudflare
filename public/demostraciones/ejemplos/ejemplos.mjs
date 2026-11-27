import {establecimientos} from "../establecimientos.mjs";
import {presentacionDe,enlacesDemo,simbolos} from "../presentaciones.mjs";
import {ilustracionPortada} from "../ilustraciones.mjs";
const el=(tag,t,c)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;if(c)e.className=c;return e;};
const cont=document.getElementById("ejemplos");
for(const negocio of establecimientos){
 const t=presentacionDe(negocio.id),link=enlacesDemo(negocio.id,"p1").negocio,card=el("article",undefined,"ejemplo");
 card.style.setProperty("--marca",negocio.marca.color);card.style.setProperty("--fondo",negocio.marca.fondo);
 const arte=el("div",undefined,"arte");arte.setAttribute("aria-hidden","true");
 const ilustracion=ilustracionPortada(t.estilo);
 if(ilustracion){arte.innerHTML=ilustracion;}else if(t.estilo==="comal"){const img=el("img");img.src="/imagenes/pastor.webp";img.alt="";img.addEventListener("error",()=>{img.hidden=true;});arte.append(img);}
 const sello=el("div",undefined,"sello");sello.innerHTML='<svg viewBox="0 0 96 96" width="48" height="48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'+simbolos[t.estilo]+'</svg>';arte.append(sello);
 const info=el("div",undefined,"info");const a=el("a","Explorar página","accion");a.href=link;a.setAttribute("aria-label","Explorar página de "+negocio.nombre);
 info.append(el("p",negocio.giroNombre,"etiqueta"),el("h2",negocio.nombre),el("p",t.entrada),a);card.append(arte,info);cont.append(card);
}
