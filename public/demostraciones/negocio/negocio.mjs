import {planes,importe} from "../config.mjs";
import {obtenerEstablecimiento,filtrarCatalogo} from "../establecimientos.mjs";
import {crearCatalogosLocales,imagenOfertaSegura} from "../catalogo-local.mjs";
import {crearPerfilesLocales} from "../perfil-local.mjs";
import {presentacionDe,enlacesDemo,simbolos,destacadosDisponibles,enlaceGaleria} from "../presentaciones.mjs";
import {ilustracionPortada} from "../ilustraciones.mjs";
import {iniciarCarrito} from "../carrito-ui.mjs";
import {admiteCitas,serviciosCita} from "../citas-practica.mjs";
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
  if(practica){document.body.style.setProperty("--marca",datos.marca.color);document.body.style.setProperty("--papel",datos.marca.fondo);document.body.style.setProperty("--hero",datos.marca.color);const rgb=datos.marca.color.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);const luminancia=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];document.body.style.setProperty("--hero-texto",luminancia>.179?"#161616":"#fff");}
  document.title=datos.nombre+" · Demostración";
  const textos={logo:t.sigla,nombre:datos.nombre,distintivo:t.distintivo,titulo:practica?datos.marca.lema:t.titulo,entrada:t.entrada,accion:t.accion,"nav-catalogo":t.catalogo,"titulo-catalogo":t.catalogo,"titulo-nosotros":t.seccion,descripcion:datos.marca.descripcion,historia:t.texto,horario:datos.horario,ubicacion:datos.ubicacion,"contacto-texto":datos.contacto||"Información de contacto de ejemplo.","pie-nombre":datos.nombre,"detalle-marca":datos.marca.icono};
  for(const [id,txt] of Object.entries(textos))$(id).textContent=txt;
  if(datos.logo){const img=el("img");img.src=datos.logo;img.alt="";$("logo").replaceChildren(img);}
  if(datos.portada){const img=el("img",undefined,"portada-practica");img.src=datos.portada;img.alt="";$("arte").append(img);}
  else{const svg=ilustracionPortada(t.estilo);if(svg){const fondo=el("div",undefined,"portada-ilustrada");fondo.innerHTML=svg;$("arte").append(fondo);}}
  const arte=el("div",undefined,"arte-emblema");
  const simbolo=el("div",undefined,"arte-vector");
  if(practica&&datos.marca.icono!==base.marca.icono)simbolo.textContent=datos.marca.icono;
  else simbolo.innerHTML='<svg viewBox="0 0 96 96" width="106" height="106" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+simbolos[t.estilo]+'</svg>';
  arte.append(simbolo,el("span",t.sigla,"arte-sigla"),el("span",datos.nombre,"arte-nombre"));
  $("arte").append(arte);
  const destacados=destacadosDisponibles(t,datos.catalogo);
  $("destacados").hidden=!destacados.length;
  $("destacados").replaceChildren(...destacados.map((d,i)=>{const a=el("a");a.href="#catalogo";a.append(el("span",String(i+1).padStart(2,"0"),"numero"),el("strong",d.nombre));a.addEventListener("click",()=>{$("categoria").value=d.categoria;$("buscar").value="";render();});return a;}));
  const carrito=iniciarCarrito(datos,plan.id,practica);
  const citas=admiteCitas(base.id,plan.id),urlCitas="/demostraciones/citas/?"+new URLSearchParams({negocio:base.id,plan:plan.id,...(practica?{practica:"1"}:{})});
  $("nav-citas").hidden=!citas;$("nav-citas").href=urlCitas;
  const cats=[...new Set(datos.catalogo.map(p=>p.categoria))];
  $("categoria").replaceChildren(new Option("Todas",""),...cats.map(c=>new Option(c,c)));
  function render(){
    const lista=filtrarCatalogo(datos,{busqueda:$("buscar").value,categoria:$("categoria").value});
    $("resultados").textContent=lista.length?lista.length+" opciones":"No hay resultados para esta búsqueda.";
    $("productos").replaceChildren(...lista.map(p=>{
      const card=el("article",undefined,"producto");
      const imagen=el("div",undefined,"imagen-producto");
      if(imagenOfertaSegura(p.imagen)){const img=el("img");img.src=p.imagen;img.alt=p.nombre;img.loading="lazy";img.addEventListener("error",()=>imagen.replaceChildren(el("span",(Object.hasOwn(t.iconos,p.categoria)?t.iconos[p.categoria]:datos.marca.icono))));imagen.append(img);}
      else{imagen.append(el("span",(Object.hasOwn(t.iconos,p.categoria)?t.iconos[p.categoria]:datos.marca.icono)));imagen.setAttribute("aria-hidden","true");}
      const cuerpo=el("div",undefined,"producto-texto");
      cuerpo.append(el("p",p.categoria,"categoria"),el("h3",p.nombre),el("p",p.descripcion,"descripcion"),el("strong",importe(p.precioCentavos),"precio"));
      if(p.duracionMinutos)cuerpo.append(el("p",p.duracionMinutos+" min","nota"));
      if(p.disponible===false){card.classList.add("producto-agotado");cuerpo.append(el("p","Agotado · temporalmente no disponible","estado-agotado"));}
      if(carrito&&carrito.puedeAgregar(p)){const b=el("button","Agregar al carrito","boton-agregar");b.type="button";b.addEventListener("click",()=>carrito.agregar(p,b));cuerpo.append(b);}
      if(citas&&serviciosCita([p]).length){const a=el("a","Reservar cita","boton-agregar");a.href=urlCitas+"&servicio="+encodeURIComponent(p.id);cuerpo.append(a);}
      card.append(imagen,cuerpo);return card;
    }));
  }
  $("buscar").addEventListener("input",render);$("categoria").addEventListener("change",render);
  const links=enlacesDemo(base.id,plan.id,practica);
  $("administracion").href=links.administracion;$("administracion-arriba").href=links.administracion;$("administracion-arriba").hidden=false;$("comparador").href=enlaceGaleria();
  $("salir-practica").href=enlacesDemo(base.id,plan.id).negocio;
  $("aviso-practica-arriba").hidden=!practica;
  $("plan-visible").textContent=plan.nombre+(plan.id==="p1"?" · Ejemplo de página y catálogo":" · Funciones de práctica disponibles según el giro");
  $("aviso-practica").hidden=!practica;
  render();$("pagina").hidden=false;
  // Al volver desde el panel con el historial del navegador, reconstruir desde la copia de práctica.
  if(practica)window.addEventListener("pageshow",e=>{if(e.persisted)location.reload();});
}
