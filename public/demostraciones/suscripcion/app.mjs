import {consultarSuscripcionPractica,estadosModulo} from "../suscripcion-practica.mjs";
import {importe} from "../config.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
const $=id=>document.getElementById(id),q=new URLSearchParams(location.search);
const el=(tag,t,cls)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;if(cls)n.className=cls;return n;};
const fecha=s=>new Date(s+"T12:00:00Z").toLocaleDateString("es-MX",{timeZone:"America/Mazatlan"});
function lista(id,datos){$(id).replaceChildren(...datos.map(x=>el("li",x)));}
function dl(id,datos){$(id).replaceChildren(...datos.flatMap(([k,v])=>[el("dt",k),el("dd",String(v))]));}
function iniciar(){
 if(q.get("rolVista")==="1")throw Error("Mi suscripción de práctica está reservada a la vista del propietario.");
 const id=q.get("negocio"),plan=q.get("plan"),s=consultarSuscripcionPractica(id,plan),a=s.acuerdo,l=s.limites;
 const money=n=>importe(n,a.moneda);
 $("volver").href=enlacesDemo(id,plan).administracion;$("soporte").href="/demostraciones/soporte/?"+new URLSearchParams({negocio:id,plan});
 $("contexto").textContent=s.negocio.nombre+" · "+plan.toUpperCase();
 $("plan-titulo").textContent=plan.toUpperCase()+" — "+a.nombre;$("estado").textContent="Suscripción activa · Al corriente (ejemplo)";
 $("corte").textContent="Escenario ficticio con fecha de corte "+fecha(a.fechaCorte)+".";
 $("importes").replaceChildren(...[["Mensualidad antes de IVA",a.base],["IVA ("+a.tasaIva+" %)",a.iva],["Total mensual MXN",a.total]].map(([k,v])=>{const c=el("article");c.append(el("span",k),el("strong",money(v)));return c;}));
 dl("acuerdo",[["Versión del acuerdo ficticio",a.version],["Inicio",fecha(a.inicio)],["Próxima renovación del escenario",fecha(a.renovacion)]]);
 lista("prestaciones",s.prestaciones);$("bolsa").textContent="Cambios menores: "+s.cambiosMenores.minutos+" minutos mensuales de referencia en este acuerdo ficticio, no acumulables. Consumo no registrado.";
 dl("limites",[["Usuarios de referencia",l.usuarios],["Sucursales de referencia",l.sucursales],["Almacenamiento","No definido en el acuerdo ficticio"]]);
 $("modulos").replaceChildren(...s.modulos.map(m=>{const n=el("li");n.append(el("strong",m.nombre),el("span",estadosModulo[m.estado],"sus-estado"),el("p",m.detalle));return n;}));
 $("pagos").replaceChildren(...s.pagos.map(p=>{const tr=el("tr");for(const x of [p.periodo,fecha(p.fecha),money(p.base),money(p.iva),money(p.total),"Registrado (ficticio)"])tr.append(el("td",x));return tr;}));
 lista("condiciones",s.condiciones);$("contenido").hidden=false;
}
try{iniciar();}catch(e){$("aviso").textContent="No se pudo consultar la suscripción de práctica: "+e.message;}
