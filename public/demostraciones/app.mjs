import {planes,capacidades,importe} from "./config.mjs";
import {establecimientos,obtenerEstablecimiento,filtrarCatalogo} from "./establecimientos.mjs";
import {crearCatalogosLocales,centavosDesdeTexto} from "./catalogo-local.mjs";
let almacenamiento;
try { almacenamiento=window.sessionStorage; } catch {}
const catalogos=crearCatalogosLocales(almacenamiento);

const $ = id=>document.getElementById(id);
const crear=(tag,texto,clase)=>{const el=document.createElement(tag);if(texto!==undefined)el.textContent=texto;if(clase)el.className=clase;return el;};
const etiquetas={disponible:"Disponible aquí",en_desarrollo:"En desarrollo",otro_plan:"Plan superior",ejemplo:"Vista previa"};
const tipos={alimento:"Alimento",fisico:"Producto físico",servicio:"Servicio"};
const params=new URLSearchParams(location.search);
let negocio=obtenerEstablecimiento(params.get("negocio")) ?? establecimientos[0];
let plan=planes.find(p=>p.id===params.get("plan")) ?? planes[0];
let vistaNegocio=params.get("vista")==="negocio";
let editorAbierto=false;
let editando=null;
const catalogoActual=()=>({...negocio,catalogo:catalogos.leer(negocio.id)});
const campo=n=>$("form-oferta").elements.namedItem(n);

function boton(textos,activo,accion){
  const b=crear("button",undefined,"selector");b.type="button";b.setAttribute("aria-pressed",String(activo));
  for(const [tag,texto,clase] of textos)b.append(crear(tag,texto,clase));
  b.addEventListener("click",accion);return b;
}
function guardarURL(){
  const url=new URL(location.href);url.searchParams.set("negocio",negocio.id);url.searchParams.set("plan",plan.id);
  if(vistaNegocio)url.searchParams.set("vista","negocio");else url.searchParams.delete("vista");
  history.replaceState(null,"",url);
  const enlace=new URL(url.pathname,url.origin);enlace.searchParams.set("negocio",negocio.id);enlace.searchParams.set("plan",plan.id);enlace.searchParams.set("vista","negocio");$("compartir-vista").href=enlace.href;
}
function renderSelectores(){
  $("negocios").replaceChildren(...establecimientos.map(e=>boton([["span",e.marca.icono,"icono"],["strong",e.nombre],["small",e.giroNombre]],e.id===negocio.id,()=>{
    negocio=e;editorAbierto=false;reiniciarFormulario();$("aviso-editor").textContent="";$("buscar").value="";$("tipo").value="";$("categoria").value="";renderTodo(true);$("negocios").querySelector('[aria-pressed="true"]')?.focus();
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
  const anterior=$("categoria").value;
  const cs=[...new Set(catalogoActual().catalogo.map(p=>p.categoria))];
  $("categoria").replaceChildren(new Option("Todas",""),...cs.map(c=>new Option(c,c)));
  if(cs.includes(anterior))$("categoria").value=anterior;
}
function renderCatalogo(){
  const lista=filtrarCatalogo(catalogoActual(),{busqueda:$("buscar").value,tipo:$("tipo").value,categoria:$("categoria").value});
  $("resultado").textContent=lista.length ? lista.length+" elementos de ejemplo" : "No hay elementos que coincidan con los filtros.";
  $("catalogo").replaceChildren(...lista.map(p=>{
    const card=crear("article",undefined,"producto");
    if(p.imagen){const img=crear("img");img.src=p.imagen;img.alt=p.nombre;img.loading="lazy";card.append(img);}
    card.append(crear("span",tipos[p.tipo]+" · "+p.categoria,"tipo"),crear("h3",p.nombre),crear("p",p.descripcion),crear("div",importe(p.precioCentavos,negocio.configuracion.moneda),"precio"));
    if(p.duracionMinutos)card.append(crear("p","Duración de referencia: "+p.duracionMinutos+" min"));
    if(p.disponible===false)card.append(crear("span","No disponible","etiqueta otro_plan"));
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
  $("seccion-catalogo").hidden=false;renderVista();
  $("estado").textContent=negocio.nombre+" · "+plan.nombre;guardarURL();
}
function renderVista(){
  $("introduccion").hidden=$("selector-negocios").hidden=$("selector-planes").hidden=vistaNegocio;
  $("seccion-capacidades").hidden=vistaNegocio;
  $("vista-cliente").hidden=vistaNegocio;$("vista-comparador").hidden=!vistaNegocio;
  $("abrir-editor").hidden=vistaNegocio||editorAbierto;$("editor").hidden=vistaNegocio||!editorAbierto;
  if(vistaNegocio)$("legado").hidden=true;
  if(editorAbierto&&!vistaNegocio)renderEditor();
  document.title=(vistaNegocio?negocio.nombre:"Demostraciones comerciales")+" | Lapazimpresion3d";
}
function ajustarDuracion(){
  const servicio=campo("tipo").value==="servicio";
  $("campo-duracion").hidden=!servicio;campo("duracion").disabled=!servicio;campo("duracion").required=servicio;
}
function reiniciarFormulario(){
  editando=null;$("form-oferta").reset();$("titulo-form-oferta").textContent="Agregar elemento";
  $("cancelar-edicion").hidden=true;ajustarDuracion();
}
function mensajeGuardado(persistido){
  $("aviso-editor").textContent=persistido?"Cambio guardado en esta pestaña.":"Cambio guardado temporalmente en memoria; se perderá al recargar.";
}
function trasCambio(persistido){
  mensajeGuardado(persistido);reiniciarFormulario();categorias();renderCatalogo();renderEditor();
}
function renderEditor(){
  $("lista-editor").replaceChildren(...catalogos.leer(negocio.id).map(p=>{
    const fila=crear("div",undefined,"fila-editor");
    const info=crear("div");info.append(crear("strong",p.nombre),crear("p",p.categoria+" · "+importe(p.precioCentavos)+(p.disponible===false?" · No disponible":"")));
    const editar=crear("button","Editar");editar.type="button";editar.addEventListener("click",()=>{
      editando=p.id;campo("nombre").value=p.nombre;campo("categoria").value=p.categoria;campo("tipo").value=p.tipo;
      campo("precio").value=(p.precioCentavos/100).toFixed(2);campo("descripcion").value=p.descripcion;
      campo("duracion").value=p.duracionMinutos??"";campo("disponible").checked=p.disponible!==false;
      ajustarDuracion();$("titulo-form-oferta").textContent="Editar "+p.nombre;$("cancelar-edicion").hidden=false;campo("nombre").focus();
    });
    const borrar=crear("button","Eliminar");borrar.type="button";borrar.addEventListener("click",()=>{
      if(!confirm("¿Eliminar "+p.nombre+" del catálogo de práctica de "+negocio.nombre+"?"))return;
      try{trasCambio(catalogos.eliminar(negocio.id,p.id));}catch(e){$("aviso-editor").textContent=e.message;}
    });
    fila.append(info,editar,borrar);return fila;
  }));
}
$("vista-cliente").addEventListener("click",()=>{vistaNegocio=true;editorAbierto=false;reiniciarFormulario();renderTodo(false);});
$("vista-comparador").addEventListener("click",()=>{vistaNegocio=false;renderTodo(false);});
$("abrir-editor").addEventListener("click",()=>{editorAbierto=true;renderVista();campo("nombre").focus();});
$("cerrar-editor").addEventListener("click",()=>{editorAbierto=false;reiniciarFormulario();renderVista();$("abrir-editor").focus();});
$("cancelar-edicion").addEventListener("click",reiniciarFormulario);
campo("tipo").addEventListener("change",ajustarDuracion);
$("form-oferta").addEventListener("submit",e=>{
  e.preventDefault();
  try{
    const datos={nombre:campo("nombre").value,categoria:campo("categoria").value,tipo:campo("tipo").value,
      precioCentavos:centavosDesdeTexto(campo("precio").value),descripcion:campo("descripcion").value,
      disponible:campo("disponible").checked,duracionMinutos:Number(campo("duracion").value)};
    trasCambio(editando?catalogos.editar(negocio.id,editando,datos):catalogos.crear(negocio.id,datos));
  }catch(error){$("aviso-editor").textContent=error.message;}
});
$("restaurar-catalogo").addEventListener("click",()=>{
  if(confirm("¿Restaurar el catálogo de práctica de "+negocio.nombre+"?"))trasCambio(catalogos.restaurar(negocio.id));
});
$("buscar").addEventListener("input",renderCatalogo);
$("tipo").addEventListener("change",renderCatalogo);
$("categoria").addEventListener("change",renderCatalogo);
renderTodo(true);
