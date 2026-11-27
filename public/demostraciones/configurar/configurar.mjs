import {establecimientos,obtenerEstablecimiento} from "../establecimientos.mjs";
import {planes,capacidades} from "../config.mjs";
import {planesRepresentativos,enlacesDemo,enlaceConfigurador} from "../presentaciones.mjs";
const $=id=>document.getElementById(id);
const q=new URLSearchParams(location.search);
const inicial=obtenerEstablecimiento(q.get("negocio"))||establecimientos[0];
$("negocio").replaceChildren(...establecimientos.map(e=>new Option(e.giroNombre+" · "+e.nombre,e.id)));
$("plan").replaceChildren(...planes.map(p=>new Option(p.nombre,p.id)));
$("negocio").value=inicial.id;$("plan").value=planes.some(p=>p.id===q.get("plan"))?q.get("plan"):planesRepresentativos[inicial.id];
const item=(texto)=>{const n=document.createElement("li");n.textContent=texto;return n;};
function actualizar(){
 const e=obtenerEstablecimiento($("negocio").value),p=planes.find(x=>x.id===$("plan").value);if(!e||!p)return;
 $("descripcion").textContent=p.nombre+" — "+p.descripcion;
 const mods=capacidades(e,p.id),resto=mods.filter(m=>m.estadoEfectivo==="en_desarrollo"||m.estadoEfectivo==="ejemplo");
 $("disponibles").replaceChildren(...mods.filter(m=>m.estadoEfectivo==="disponible").map(m=>item(m.nombre)));
 $("lista-pendientes").replaceChildren(...resto.map(m=>item(m.nombre+" · "+(m.estadoEfectivo==="ejemplo"?"Vista previa":"En desarrollo"))));
 $("pendientes").hidden=!resto.length;
 const links=enlacesDemo(e.id,p.id,true);
 $("abrir").href=links.negocio;$("editar").href=links.administracion;
 try{history.replaceState(null,"",enlaceConfigurador(e.id,p.id));}catch{}
}
$("negocio").addEventListener("change",()=>{$("plan").value=planesRepresentativos[$("negocio").value];actualizar();});
$("plan").addEventListener("change",actualizar);actualizar();
