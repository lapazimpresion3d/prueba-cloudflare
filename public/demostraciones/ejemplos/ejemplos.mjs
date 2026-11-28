import {establecimientos} from "../establecimientos.mjs";
import {presentacionDe,enlacesDemo,simbolos,planesRepresentativos,enlaceCotizacion} from "../presentaciones.mjs";
import {planes,capacidades} from "../config.mjs";
import {ilustracionPortada} from "../ilustraciones.mjs";
import {portadaDemo,logoDemo} from "../identidad.mjs?v=portada-turismo-2";
const el=(tag,t,c)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;if(c)e.className=c;return e;};
const cont=document.getElementById("ejemplos");
for(const negocio of establecimientos){
 const t=presentacionDe(negocio.id),card=el("article",undefined,"ejemplo");
 const plan=planes.find(p=>p.id===planesRepresentativos[negocio.id]);
 const mods=capacidades(negocio,plan.id);
 card.style.setProperty("--marca",negocio.marca.color);card.style.setProperty("--fondo",negocio.marca.fondo);
 const arte=el("div",undefined,"arte");arte.setAttribute("aria-hidden","true");
 const ilustracion=ilustracionPortada(t.estilo);
 if(ilustracion)arte.innerHTML=ilustracion;const img=el("img");img.alt="";img.loading="lazy";img.addEventListener("load",()=>arte.querySelector(":scope > svg")?.remove());img.addEventListener("error",()=>img.remove());img.src=portadaDemo(negocio.id);arte.append(img);
 const sello=el("div",undefined,"sello");const logo=el("img");logo.alt="";logo.src=logoDemo(negocio.id);sello.append(logo);arte.append(sello);
 const info=el("div",undefined,"info");const a=el("a","Explorar demostración","accion");const links=enlacesDemo(negocio.id,plan.id);a.href=links.negocio;a.setAttribute("aria-label","Explorar "+negocio.nombre);
 const lista=el("ul",undefined,"funciones"),pendientes=el("ul",undefined,"funciones pendientes"),detalle=el("details",undefined,"modulos-pendientes");detalle.append(el("summary","Funciones pendientes de este paquete"),pendientes);
 lista.replaceChildren(...mods.filter(m=>m.estadoEfectivo==="disponible").map(m=>el("li",m.nombre)));
 const resto=mods.filter(m=>m.estadoEfectivo==="en_desarrollo"||m.estadoEfectivo==="ejemplo");detalle.hidden=!resto.length;pendientes.replaceChildren(...resto.map(m=>el("li",m.nombre+" · En desarrollo")));
 const cotizar=el("a","Me interesa este paquete","accion");cotizar.href=enlaceCotizacion(negocio.id,plan.id);
 info.append(el("p",negocio.giroNombre,"etiqueta"),el("h2",negocio.nombre),el("p",plan.nombre+" · Ejemplo representativo","plan-representativo"),el("p",t.entrada),el("strong","Disponible para probar","funciones-titulo"),lista,detalle);const acciones=el("div",undefined,"accesos-demo");const admin=el("a","Ver panel administrativo","accion panel-demo");admin.href=links.administracion;admin.setAttribute("aria-label","Ver panel administrativo de "+negocio.nombre);acciones.append(a,admin,cotizar);info.append(acciones);card.append(arte,info);cont.append(card);
}


