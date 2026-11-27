import {tituloAdmin} from "./perfil-panel.mjs";
import {gruposAdmin} from "./panel-admin.mjs";
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {planes} from "./config.mjs";
import {admitePos} from "./pos-practica.mjs";
import {admitePedidos} from "./pedidos-practica.mjs";
import {admiteCitas} from "./citas-practica.mjs";
import {admiteCocina,admiteComandas} from "./cocina-practica.mjs";
import {admiteMesas} from "./mesas-practica.mjs";
import {admiteCuentas} from "./cuentas-practica.mjs";
import {enlacesDemo} from "./presentaciones.mjs";
import {crearPerfilesLocales} from "./perfil-local.mjs";
import {logoDemo} from "./identidad.mjs";
export function rutaAdmin(ruta,vista){if(ruta==="citas")return vista==="agenda"?"admin-citas":null;if(ruta==="reservaciones")return vista==="empresa"?"admin-mesas":null;if(ruta==="cocina")return vista==="mesas"?"admin-comandas":"admin-cocina";return ({pos:"admin-pos",caja:"admin-caja",comprobantes:"admin-comprobantes",inventario:"admin-inventario",almacen:"admin-almacen",compras:"admin-compras",recetas:"admin-recetas",pedidos:"admin-pedidos",cuentas:"admin-cuentas",terminales:"admin-terminales"})[ruta]??null;}
export function enlacesAdmin(id,plan,contexto={}){
 if(!obtenerEstablecimiento(id)||!planes.some(p=>p.id===plan))return {};
 const inicio=enlacesDemo(id,plan).administracion,links={"admin-resumen":inicio,"admin-catalogo":inicio+"&seccion=productos","admin-empresa":inicio+"&seccion=personal","admin-perfil":inicio+"&seccion=perfil"};
 const ruta=(key,path,extra={})=>{const q=new URLSearchParams({negocio:id,plan,...extra});for(const k of ["sucursal","empleado"])if(/^\d{1,2}$/.test(String(contexto[k]??"")))q.set(k,contexto[k]);links[key]="/demostraciones/"+path+"/?"+q;};
 if(admitePos(id,plan))for(const k of ["pos","caja","comprobantes","inventario","almacen","compras"])ruta("admin-"+k,k);
 if(plan==="p4")ruta("admin-recetas","recetas");
 if(admitePedidos(id,plan))ruta("admin-pedidos","pedidos");
 if(admiteCitas(id,plan))ruta("admin-citas","citas",{vista:"agenda"});
 if(admiteCocina(id,plan))ruta("admin-cocina","cocina");
 if(admiteComandas(id,plan))ruta("admin-comandas","cocina",{vista:"mesas"});
 if(admiteMesas(id,plan))ruta("admin-mesas","reservaciones",{vista:"empresa"});
 if(admiteCuentas(id,plan)){ruta("admin-cuentas","cuentas");ruta("admin-terminales","terminales");}
 return links;
}
const el=(tag,t,cls)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;if(cls)n.className=cls;return n;};
export function montarNavegacion(){
 const q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan"),ruta=location.pathname.split("/").filter(Boolean).at(-1),activo=rutaAdmin(ruta,q.get("vista")),e=obtenerEstablecimiento(id),p=planes.find(x=>x.id===plan);if(!activo||!e||!p||!enlacesAdmin(id,plan)[activo])return;
 const main=document.querySelector("main"),header=document.querySelector("body>header");if(!main||!header)return;
 let perfil;try{perfil=crearPerfilesLocales(sessionStorage).leer(id);}catch{perfil=e;}
 const shell=el("div",undefined,"admin-shell"),side=el("aside",undefined,"admin-sidebar"),nav=el("nav");nav.id="modulo-admin-nav";nav.setAttribute("aria-label","Panel administrativo");
 const img=el("img",undefined,"admin-logo");img.src=perfil.logo||logoDemo(id);img.alt="";side.append(img,el("strong",perfil.nombre),el("p",p.nombre,"admin-plan"),el("p","Modo demostración","nota"));
 const menu=el("button","Menú de administración","admin-menu-toggle");menu.type="button";menu.setAttribute("aria-controls",nav.id);
 function abrir(v){nav.hidden=!v;menu.setAttribute("aria-expanded",String(v));}abrir(!matchMedia("(max-width: 780px)").matches);menu.onclick=()=>abrir(nav.hidden);side.append(menu,nav);
 function contexto(){return {sucursal:document.getElementById("sucursal")?.value||q.get("sucursal"),empleado:document.getElementById("empleado")?.value||q.get("empleado")};}
 const grupos=gruposAdmin.map(([g,items])=>[g,[...items]]);grupos[2][1].push(["admin-terminales","Terminales de cobro","Simulación"]);
 for(const [g,items] of grupos){const div=el("div",undefined,"admin-grupo");div.append(el("h2",g));for(const [key,nombre] of items){const href=enlacesAdmin(id,plan,contexto())[key];if(!href)continue;const a=el("a",tituloAdmin(e.giro,key,nombre));a.href=href;if(key===activo)a.setAttribute("aria-current","page");a.addEventListener("click",()=>{a.href=enlacesAdmin(id,plan,contexto())[key];});div.append(a);}if(div.children.length>1)nav.append(div);}
 const extra=el("div",undefined,"admin-grupo admin-enlaces");for(const [label,url] of [["← Volver al negocio",enlacesDemo(id,plan,true).negocio],["Otras demostraciones","/demostraciones/ejemplos/"]]){const a=el("a",label);a.href=url;extra.append(a);}nav.append(extra);
 document.body.classList.add("modo-modulo-admin");main.before(shell);shell.append(side,main);
 const breadcrumb=el("div",undefined,"admin-breadcrumb"),home=el("a","Inicio");home.href=enlacesDemo(id,plan).administracion;breadcrumb.append(home,document.createTextNode(" / "+(tituloAdmin(e.giro,activo,grupos.flatMap(g=>g[1]).find(x=>x[0]===activo)?.[1]??"Administración"))));main.prepend(breadcrumb);
}
