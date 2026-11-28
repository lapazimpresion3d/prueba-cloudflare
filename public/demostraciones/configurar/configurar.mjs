import {establecimientos,obtenerEstablecimiento} from "../establecimientos.mjs";
import {planes,capacidades,importe} from "../config.mjs";
import {planesRepresentativos,enlacesDemo,enlaceConfigurador,enlaceCotizacion,idInternoDemo,enlacesPublicosDemo} from "../presentaciones.mjs";
const $=id=>document.getElementById(id);
const q=new URLSearchParams(location.search);
const inicial=obtenerEstablecimiento(idInternoDemo(q.get("negocio")))||establecimientos[0];
$("negocio").replaceChildren(...establecimientos.map(e=>new Option(e.giroNombre+" · "+e.nombre,e.id)));
$("plan").replaceChildren(...planes.map(p=>new Option(p.nombre,p.id)));
$("negocio").value=inicial.id;$("plan").value=planes.some(p=>p.id===q.get("plan"))?q.get("plan"):planesRepresentativos[inicial.id];
const item=(texto)=>{const n=document.createElement("li");n.textContent=texto;return n;};
function comparar(e,seleccionado){const nodos=planes.map(p=>{const card=document.createElement("article");card.className="comparacion-plan";card.dataset.plan=p.id;const h=document.createElement("h3");h.textContent=p.id.toUpperCase()+" · "+p.nombre;const precio=document.createElement("p");precio.textContent=importe(p.implementacion)+" implementación · "+importe(p.mensualidad)+"/mes + IVA";const lista=document.createElement("ul");lista.className="funciones";lista.replaceChildren(...capacidades(e,p.id).filter(m=>m.estadoEfectivo==="disponible").map(m=>item(m.nombre)));const b=document.createElement("button");b.type="button";b.className="plan";b.textContent=p.id===seleccionado?"Paquete seleccionado":"Seleccionar "+p.id.toUpperCase();b.setAttribute("aria-pressed",String(p.id===seleccionado));b.onclick=()=>{$("plan").value=p.id;actualizar();$("plan").focus();};const enlaces=enlacesPublicosDemo(e.id,p.id);const a=document.createElement("a"),admin=document.createElement("a");a.href=enlaces.negocio;a.textContent="Ver página web";admin.href=enlaces.administracion;admin.textContent="Ver panel administrativo";card.append(h,precio,lista,b,a,admin);return card;});$("comparacion").replaceChildren(...nodos);}
function actualizar(){
 const e=obtenerEstablecimiento($("negocio").value),p=planes.find(x=>x.id===$("plan").value);if(!e||!p)return;
 $("descripcion").textContent=p.nombre+" — "+p.descripcion;
 const mods=capacidades(e,p.id),resto=mods.filter(m=>m.estadoEfectivo==="en_desarrollo"||m.estadoEfectivo==="ejemplo");
 $("disponibles").replaceChildren(...mods.filter(m=>m.estadoEfectivo==="disponible").map(m=>item(m.nombre)));
 $("lista-pendientes").replaceChildren(...resto.map(m=>item(m.nombre+" · "+(m.estadoEfectivo==="ejemplo"?"Vista previa":"En desarrollo"))));
 $("pendientes").hidden=!resto.length;
 const links=enlacesDemo(e.id,p.id,true);
 $("abrir").href=links.negocio;$("editar").href=links.administracion;$("cotizar-paquete").href=enlaceCotizacion(e.id,p.id);
 comparar(e,p.id);
 try{history.replaceState(null,"",enlaceConfigurador(e.id,p.id));}catch{}
}
$("negocio").addEventListener("change",()=>{$("plan").value=planesRepresentativos[$("negocio").value];actualizar();});
$("plan").addEventListener("change",actualizar);actualizar();
