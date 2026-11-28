import {establecimientos} from "../establecimientos.mjs";
import {presentacionDe,enlacesDemo,planesRepresentativos,enlaceCotizacion} from "../presentaciones.mjs?v=52t8g";
import {resumenFicha} from "./resumen.mjs?v=52t8g";
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
 const r=resumenFicha(negocio.id,mods),lista=el("ul",undefined,"funciones funciones-principales");
 lista.replaceChildren(...r.principales.map(m=>el("li",m.etiqueta)));
 const detalle=el("details",undefined,"modulos-pendientes");detalle.append(el("summary","Ver más funcionalidades"));
 detalle.hidden=!r.adicionales.length&&!r.pendientes.length;
 if(r.adicionales.length){const otras=el("ul",undefined,"funciones");otras.replaceChildren(...r.adicionales.map(m=>el("li",m.nombre)));detalle.append(el("strong","También disponibles"),otras);}
 if(r.pendientes.length){const pendientes=el("ul",undefined,"funciones pendientes");pendientes.replaceChildren(...r.pendientes.map(m=>el("li",m.nombre+" · "+(m.estadoEfectivo==="ejemplo"?"Vista previa":"En desarrollo"))));detalle.append(el("strong","En preparación"),pendientes);}
 const cotizar=el("a","Me interesa este paquete","accion");cotizar.href=enlaceCotizacion(negocio.id,plan.id);
 info.append(el("p",negocio.giroNombre,"etiqueta"),el("h2",negocio.nombre),el("p",plan.id.toUpperCase()+" · "+plan.nombre,"plan-representativo"),el("p",t.entrada),el("strong","Funciones destacadas","funciones-titulo"),lista,detalle);const acciones=el("div",undefined,"accesos-demo");const admin=el("a","Ver panel administrativo","accion panel-demo");admin.href=links.administracion;admin.setAttribute("aria-label","Ver panel administrativo de "+negocio.nombre);acciones.append(a,admin,cotizar);info.append(acciones);card.append(arte,info);cont.append(card);
}


