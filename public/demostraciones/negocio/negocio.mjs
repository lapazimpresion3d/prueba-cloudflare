import {planes,importe} from "../config.mjs";
import {obtenerEstablecimiento,filtrarCatalogo} from "../establecimientos.mjs";
import {crearCatalogosLocales} from "../catalogo-local.mjs";
import {crearPerfilesLocales} from "../perfil-local.mjs";
import {presentacionDe,enlacesDemo} from "../presentaciones.mjs";
const $=id=>document.getElementById(id);
const el=(tag,txt,clase)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(clase)e.className=clase;return e;};
const q=new URLSearchParams(location.search);
const base=obtenerEstablecimiento(q.get("negocio"));
const plan=planes.find(p=>p.id===q.get("plan"));
const practica=q.get("practica")==="1";
const t=base&&presentacionDe(base.id);
if(!base||!plan||!t){
  $("error").textContent="Esta demostración no existe. ";
  const a=el("a","Explorar negocios");a.href="../";$("error").append(a);$("error").hidden=false;
}else{
  let datos=base;
  if(practica){
    let almacen;try{almacen=sessionStorage;}catch{}
    datos={...base,...crearPerfilesLocales(almacen).leer(base.id),catalogo:crearCatalogosLocales(almacen).leer(base.id)};
  }
  document.body.dataset.estilo=t.estilo;
  if(practica){document.documentElement.style.setProperty("--marca",datos.marca.color);document.documentElement.style.setProperty("--papel",datos.marca.fondo);}
  document.title=datos.nombre+" · Demostración";
  const textos={logo:t.sigla,nombre:datos.nombre,distintivo:t.distintivo,titulo:practica?datos.marca.lema:t.titulo,entrada:t.entrada,accion:t.accion,"nav-catalogo":t.catalogo,"titulo-catalogo":t.catalogo,"titulo-nosotros":t.seccion,descripcion:datos.marca.descripcion,historia:t.texto,horario:datos.horario,ubicacion:datos.ubicacion,"contacto-texto":datos.contacto||"Información de contacto de ejemplo.","pie-nombre":datos.nombre,"detalle-marca":datos.marca.icono};
  for(const [id,txt] of Object.entries(textos))$(id).textContent=txt;
  const arte=el("div",undefined,"arte-emblema");
  arte.append(el("span",datos.marca.icono,"arte-icono"),el("span",t.sigla,"arte-sigla"),el("span",datos.nombre,"arte-nombre"));
  $("arte").append(arte);
  $("destacados").replaceChildren(...t.destacados.map((x,i)=>{const a=el("a");a.href="#catalogo";a.append(el("span",String(i+1).padStart(2,"0"),"numero"),el("strong",x));a.addEventListener("click",()=>{const op=[...$("categoria").options].find(o=>o.value===x);$("categoria").value=op?x:"";$("buscar").value="";render();});return a;}));
  const cats=[...new Set(datos.catalogo.map(p=>p.categoria))];
  $("categoria").replaceChildren(new Option("Todas",""),...cats.map(c=>new Option(c,c)));
  function render(){
    const lista=filtrarCatalogo(datos,{busqueda:$("buscar").value,categoria:$("categoria").value});
    $("resultados").textContent=lista.length?lista.length+" opciones":"No hay resultados para esta búsqueda.";
    $("productos").replaceChildren(...lista.map(p=>{
      const card=el("article",undefined,"producto");
      const imagen=el("div",undefined,"imagen-producto");
      if(p.imagen&&/^\/imagenes\/[a-z0-9_-]+\.webp$/i.test(p.imagen)){const img=el("img");img.src=p.imagen;img.alt=p.nombre;img.loading="lazy";img.addEventListener("error",()=>imagen.replaceChildren(el("span",t.iconos[p.categoria]||datos.marca.icono)));imagen.append(img);}
      else{imagen.append(el("span",t.iconos[p.categoria]||datos.marca.icono));imagen.setAttribute("aria-hidden","true");}
      const cuerpo=el("div",undefined,"producto-texto");
      cuerpo.append(el("p",p.categoria,"categoria"),el("h3",p.nombre),el("p",p.descripcion,"descripcion"),el("strong",importe(p.precioCentavos),"precio"));
      if(p.duracionMinutos)cuerpo.append(el("p",p.duracionMinutos+" min","nota"));
      if(p.disponible===false)cuerpo.append(el("p","Temporalmente no disponible","nota"));
      card.append(imagen,cuerpo);return card;
    }));
  }
  $("buscar").addEventListener("input",render);$("categoria").addEventListener("change",render);
  const links=enlacesDemo(base.id,plan.id,practica);
  $("administracion").href=links.administracion;$("comparador").href=links.comparador;
  $("aviso-practica").hidden=!practica;
  render();$("pagina").hidden=false;
}
