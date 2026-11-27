import {planes,capacidades,importe} from "./config.mjs";
import {establecimientos,obtenerEstablecimiento,filtrarCatalogo} from "./establecimientos.mjs";

const $ = id=>document.getElementById(id);
const crear=(tag,texto,clase)=>{const el=document.createElement(tag);if(texto!==undefined)el.textContent=texto;if(clase)el.className=clase;return el;};
const etiquetas={disponible:"Disponible aquí",en_desarrollo:"En desarrollo",otro_plan:"Plan superior",ejemplo:"Vista previa"};
const tipos={alimento:"Alimento",fisico:"Producto físico",servicio:"Servicio"};
const params=new URLSearchParams(location.search);
let negocio=obtenerEstablecimiento(params.get("negocio")) ?? establecimientos[0];
let plan=planes.find(p=>p.id===params.get("plan")) ?? planes[0];

function boton(textos,activo,accion){
  const b=crear("button",undefined,"selector");b.type="button";b.setAttribute("aria-pressed",String(activo));
  for(const [tag,texto,clase] of textos)b.append(crear(tag,texto,clase));
  b.addEventListener("click",accion);return b;
}
function guardarURL(){
  const url=new URL(location.href);url.searchParams.set("negocio",negocio.id);url.searchParams.set("plan",plan.id);
  history.replaceState(null,"",url);
}
function renderSelectores(){
  $("negocios").replaceChildren(...establecimientos.map(e=>boton([["span",e.marca.icono,"icono"],["strong",e.nombre],["small",e.giroNombre]],e.id===negocio.id,()=>{
    negocio=e;$("buscar").value="";$("tipo").value="";renderTodo(true);$("negocios").querySelector('[aria-pressed="true"]')?.focus();
  })));
  $("planes").replaceChildren(...planes.map(p=>boton([["strong",p.nombre],["span",importe(p.mensualidad,p.moneda)+"/mes","precio-plan"],["small","Implementación: "+importe(p.implementacion,p.moneda)],["small",p.descripcion]],p.id===plan.id,()=>{
    plan=p;renderTodo(false);$("planes").querySelector('[aria-pressed="true"]')?.focus();
  })));
}
function renderPerfil(){
  const m=negocio.marca;
  document.documentElement.style.setProperty("--marca",m.color);
  document.documentElement.style.setProperty("--marca-fondo",m.fondo);
  $("marca").textContent=m.icono;$("giro").textContent=negocio.giroNombre;$("nombre").textContent=negocio.nombre;
  $("lema").textContent=m.lema;$("descripcion").textContent=m.descripcion;$("horario").textContent=negocio.horario;$("ubicacion").textContent=negocio.ubicacion;
  $("perfil").hidden=false;
}
function categorias(){
  const cs=[...new Set(negocio.catalogo.map(p=>p.categoria))];
  $("categoria").replaceChildren(new Option("Todas",""),...cs.map(c=>new Option(c,c)));
}
function renderCatalogo(){
  const lista=filtrarCatalogo(negocio,{busqueda:$("buscar").value,tipo:$("tipo").value,categoria:$("categoria").value});
  $("resultado").textContent=lista.length ? lista.length+" elementos de ejemplo" : "No hay elementos que coincidan con los filtros.";
  $("catalogo").replaceChildren(...lista.map(p=>{
    const card=crear("article",undefined,"producto");
    if(p.imagen){const img=crear("img");img.src=p.imagen;img.alt=p.nombre;img.loading="lazy";card.append(img);}
    card.append(crear("span",tipos[p.tipo]+" · "+p.categoria,"tipo"),crear("h3",p.nombre),crear("p",p.descripcion),crear("div",importe(p.precioCentavos,negocio.configuracion.moneda),"precio"));
    if(p.duracionMinutos)card.append(crear("p","Duración de referencia: "+p.duracionMinutos+" min"));
    return card;
  }));
}
function renderCapacidades(){
  const lista=capacidades(negocio,plan.id);
  const incluidas=lista.filter(m=>m.estadoEfectivo!=="otro_plan");
  $("resumen-plan").textContent=plan.nombre+" · "+incluidas.filter(m=>m.estadoEfectivo==="disponible").length+" funcionalidades utilizables en esta vista previa. Las restantes no son operativas.";
  $("capacidades").replaceChildren(...lista.map(m=>{
    const card=crear("article",undefined,"capacidad");
    card.append(crear("span",etiquetas[m.estadoEfectivo],"etiqueta "+m.estadoEfectivo),crear("h3",m.nombre),crear("p",m.detalle));
    if(m.estadoEfectivo==="otro_plan")card.append(crear("p","Desde "+planes[m.desde-1].nombre));
    return card;
  }));
  const referencias=$("referencias");referencias.replaceChildren();
  $("legado").hidden=negocio.id!=="taqueria-el-comal" || plan.id==="p1";
  if(!$("legado").hidden){
    for(const [texto,ruta] of [["Panel de encargado (vista previa)","/demo-panel/"],["Cocina (vista previa)","/demo-cocina/"]]){
      const a=crear("a",texto);a.href=ruta;referencias.append(a);
    }
  }
}
function renderTodo(reiniciarCategoria){
  renderSelectores();renderPerfil();if(reiniciarCategoria)categorias();renderCatalogo();renderCapacidades();
  $("seccion-catalogo").hidden=$("seccion-capacidades").hidden=false;
  $("estado").textContent=negocio.nombre+" · "+plan.nombre;guardarURL();
}
$("buscar").addEventListener("input",renderCatalogo);
$("tipo").addEventListener("change",renderCatalogo);
$("categoria").addEventListener("change",renderCatalogo);
renderTodo(true);
