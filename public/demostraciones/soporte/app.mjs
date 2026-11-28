import {crearSoportePractica,categorias,estados,impactos,filtrarSoporte,resumenSoporte} from "../soporte-practica.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
const $=id=>document.getElementById(id),q=new URLSearchParams(location.search);
const el=(tag,t,cls)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;if(cls)n.className=cls;return n;};
const fmt=s=>new Date(s).toLocaleString("es-MX",{timeZone:"America/Mazatlan"});
function opciones(n,datos,todas){if(todas)n.append(new Option(todas,""));for(const [k,v] of Object.entries(datos))n.append(new Option(v,k));}
function iniciar(){
 if(q.get("rolVista")==="1")throw Error("El soporte de práctica está reservado a la vista del propietario.");
 const id=q.get("negocio"),plan=q.get("plan"),s=crearSoportePractica(sessionStorage,id,plan),f=$("solicitud");
 $("volver").href=enlacesDemo(id,plan).administracion;$("contexto").textContent=s.ctx.nombre+" · "+plan.toUpperCase()+" · almacenamiento de esta pestaña";
 opciones(f.elements.categoria,categorias);opciones(f.elements.impacto,impactos);for(const m of s.ctx.modulos)f.elements.modulo.append(new Option(m,m));
 opciones($("estado"),estados,"Todos los estados");opciones($("categoria"),categorias,"Todas las categorías");
 function pintar(){const d=s.leer(),r=resumenSoporte(d);$("resumen").replaceChildren(...[["Pendientes",r.pendientes],["Resueltas",r.resueltas],["Canceladas",r.canceladas]].map(([k,v])=>{const a=el("article");a.append(el("strong",String(v)),el("span",k));return a;}));
 const lista=filtrarSoporte(d,{estado:$("estado").value,categoria:$("categoria").value});$("lista").replaceChildren();if(!lista.length)$("lista").append(el("p","No hay solicitudes con estos filtros."));
 for(const x of lista){const a=el("details",undefined,"soporte-ticket"),t=el("summary",x.id+" · "+x.titulo+" · "+estados[x.estado]);a.append(t,el("p",categorias[x.categoria]+" · "+x.modulo+" · Impacto: "+impactos[x.impacto]),el("p","Prioridad: "+(x.prioridad??"Por asignar")),el("p","Registro: "+fmt(x.creado)+" · Actualización: "+fmt(x.actualizado),"nota"),el("p",x.descripcion),el("h3","Conversación"));if(!x.mensajes.length)a.append(el("p","Sin respuestas registradas."));for(const m of x.mensajes){const b=el("article",undefined,"soporte-mensaje");b.append(el("strong",m.autor),el("p",m.texto),el("p",fmt(m.fecha),"nota"));a.append(b);}$("lista").append(a);}
 }
 for(const k of ["estado","categoria"])$(k).addEventListener("change",()=>{try{pintar();}catch(e){$("aviso").textContent=e.message;}});
 f.addEventListener("submit",e=>{e.preventDefault();try{const x=s.crear(Object.fromEntries(new FormData(f)));f.reset();$("estado").value="";$("categoria").value="";pintar();$("nueva").open=false;$("aviso").textContent="Solicitud ficticia "+x.id+" registrada en esta pestaña. No se envió a Lapazimpresion3d.";}catch(e){$("aviso").textContent=e.message;}});
 for(const m of s.mantenimiento()){const a=el("article");a.append(el("h3",m.titulo),el("p",fmt(m.fecha),"nota"),el("p",m.detalle));$("mantenimiento").append(a);}
 pintar();$("contenido").hidden=false;
}
try{iniciar();}catch(e){$("aviso").textContent="No se pudo abrir el soporte: "+e.message;}
