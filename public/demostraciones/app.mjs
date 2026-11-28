import {gruposIconos} from "./iconos-perfil.mjs";
import {admiteCotizaciones} from "./cotizaciones-practica.mjs";
import {montarInicioAdmin} from "./panel-admin.mjs";
import {admitePos} from "./pos-practica.mjs";
import {montarEmpresa} from "./empresa-practica.mjs";
import {admiteCuentas} from "./cuentas-practica.mjs";
import {admiteCocina,admiteComandas} from "./cocina-practica.mjs";
import {admiteMesas} from "./mesas-practica.mjs";
import {planes,capacidades,importe} from "./config.mjs";
import {establecimientos,obtenerEstablecimiento,filtrarCatalogo} from "./establecimientos.mjs";
import {crearCatalogosLocales,centavosDesdeTexto,imagenOfertaSegura} from "./catalogo-local.mjs";
import {crearPerfilesLocales,perfilPlano,validarImagenPerfil} from "./perfil-local.mjs?v=iconos-2";
import {optimizarImagenPerfil} from "./imagenes-perfil.mjs";
import {enlacesDemo,enlaceCotizacion} from "./presentaciones.mjs";
import {admitePedidos} from "./pedidos-practica.mjs";
import {admiteCitas} from "./citas-practica.mjs";
let almacenamiento;
try { almacenamiento=window.sessionStorage; } catch {}
const catalogos=crearCatalogosLocales(almacenamiento);
const selectorIcono=document.getElementById("icono-perfil");
for(const grupo of gruposIconos){const g=document.createElement("optgroup");g.label=grupo.nombre;for(const i of grupo.items)g.append(new Option(i.icono+"  "+i.etiqueta,i.icono));selectorIcono.append(g);}
const perfiles=crearPerfilesLocales(almacenamiento);

const $ = id=>document.getElementById(id);
const crear=(tag,texto,clase)=>{const el=document.createElement(tag);if(texto!==undefined)el.textContent=texto;if(clase)el.className=clase;return el;};
const etiquetas={disponible:"Disponible aquí",en_desarrollo:"En desarrollo",otro_plan:"Plan superior",ejemplo:"Vista previa"};
const tipos={alimento:"Alimento",fisico:"Producto físico",servicio:"Servicio"};
const params=new URLSearchParams(location.search);
let negocio=obtenerEstablecimiento(params.get("negocio")) ?? establecimientos[0];
let plan=planes.find(p=>p.id===params.get("plan")) ?? planes[0];
const vistaAdmin=params.get("vista")==="administracion";
let vistaNegocio=false;
const redirigirNegocio=params.get("vista")==="negocio"&&obtenerEstablecimiento(params.get("negocio"))&&planes.some(p=>p.id===params.get("plan"));
if(redirigirNegocio)location.replace(enlacesDemo(negocio.id,plan.id).negocio);
let editorAbierto=false, perfilAbierto=false, empresaAbierta=false;
if(vistaAdmin)document.body.classList.add("modo-admin");
let editando=null;
let contextoServidor=null, consultaContexto=0, ocupada=false;
const revisiones=new Map(), revisionesPerfil=new Map();
let perfilActivo=false, perfilOcupado=false, imagenPendiente=0, generacionImagen=0;
const generacionesArchivo={logo:0,portada:0};
let practicaActiva=false, fotoPendiente=false, fotoGeneracion=0;
const catalogoActual=()=>({...negocio,catalogo:catalogos.leer(negocio.id)});
const campo=n=>$("form-oferta").elements.namedItem(n);

function boton(textos,activo,accion){
  const b=crear("button",undefined,"selector");b.type="button";b.setAttribute("aria-pressed",String(activo));
  for(const [tag,texto,clase] of textos)b.append(crear(tag,texto,clase));
  b.addEventListener("click",accion);return b;
}
function guardarURL(){
  const url=new URL(location.href);url.searchParams.set("negocio",negocio.id);url.searchParams.set("plan",plan.id);
  if(vistaAdmin)url.searchParams.set("vista","administracion");else url.searchParams.delete("vista");
  history.replaceState(null,"",url);
  const enlaces=enlacesDemo(negocio.id,plan.id);$("compartir-vista").href=enlaces.negocio;$("cotizar-paquete").href=enlaceCotizacion(negocio.id,plan.id);
  $("admin-ver-negocio").href=enlacesDemo(negocio.id,plan.id,true).negocio;$("admin-salir").href=enlacesDemo(negocio.id,plan.id,true).negocio;
  $("ver-catalogo-editado").href=enlacesDemo(negocio.id,plan.id,true).negocio;
  $("ver-original").href=enlaces.negocio;
  $("admin-turismo").hidden=negocio.giro!=="turismo"||plan.id==="p1";$("admin-turismo").href="/demostraciones/turismo/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id})+"#gestion";
  $("admin-suscripcion").href="/demostraciones/suscripcion/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-soporte").href="/demostraciones/soporte/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-auditoria").href="/demostraciones/auditoria/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-comprobantes").hidden=!admitePos(negocio.id,plan.id);$("admin-comprobantes").href="/demostraciones/comprobantes/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-recetas").hidden=plan.id!=="p4"||negocio.giro==="turismo";$("admin-recetas").href="/demostraciones/recetas/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-compras").hidden=!admitePos(negocio.id,plan.id);$("admin-compras").href="/demostraciones/compras/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-almacen").hidden=!admitePos(negocio.id,plan.id);$("admin-almacen").href="/demostraciones/almacen/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-inventario").hidden=!admitePos(negocio.id,plan.id);$("admin-inventario").href="/demostraciones/inventario/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-caja").hidden=!admitePos(negocio.id,plan.id);$("admin-caja").href="/demostraciones/caja/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-alertas").hidden=plan.id!=="p4"||negocio.giro==="turismo";$("admin-alertas").href="/demostraciones/alertas/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-reportes").hidden=!admitePos(negocio.id,plan.id);$("admin-reportes").href="/demostraciones/reportes/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-clientes").hidden=plan.id==="p1"||negocio.giro==="turismo";$("admin-clientes").href="/demostraciones/clientes/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-fidelizacion").hidden=plan.id!=="p4"||negocio.giro==="turismo";$("admin-fidelizacion").href="/demostraciones/fidelizacion/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-cotizaciones").hidden=!admiteCotizaciones(negocio.id,plan.id);$("admin-cotizaciones").href="/demostraciones/cotizaciones/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-pos").hidden=!admitePos(negocio.id,plan.id);$("admin-pos").href="/demostraciones/pos/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-pedidos").hidden=!admitePedidos(negocio.id,plan.id);$("admin-pedidos").href="/demostraciones/pedidos/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-cocina").hidden=!admiteCocina(negocio.id,plan.id);$("admin-cocina").href="/demostraciones/cocina/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-terminales").hidden=!admiteCuentas(negocio.id,plan.id);$("admin-terminales").href="/demostraciones/terminales/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-cuentas").hidden=!admiteCuentas(negocio.id,plan.id);$("admin-cuentas").href="/demostraciones/cuentas/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id});
  $("admin-comandas").hidden=!admiteComandas(negocio.id,plan.id);$("admin-comandas").href="/demostraciones/cocina/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id,vista:"mesas"});
  $("admin-mesas").hidden=!admiteMesas(negocio.id,plan.id);$("admin-mesas").href="/demostraciones/reservaciones/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id,vista:"empresa"});
  $("admin-citas").hidden=!admiteCitas(negocio.id,plan.id);$("admin-citas").href="/demostraciones/citas/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id,vista:"agenda"});
}
function renderSelectores(){
  $("negocios").replaceChildren(...establecimientos.map(e=>boton([["span",e.marca.icono,"icono"],["strong",e.nombre],["small",e.giroNombre]],e.id===negocio.id,()=>{
    negocio=e;generacionImagen++;editorAbierto=false;perfilAbierto=false;reiniciarFormulario();$("aviso-editor").textContent="";$("buscar").value="";$("tipo").value="";$("categoria").value="";renderTodo(true);$("negocios").querySelector('[aria-pressed="true"]')?.focus();
  })));
  $("planes").replaceChildren(...planes.map(p=>boton([["strong",p.nombre],["span",importe(p.mensualidad,p.moneda)+"/mes","precio-plan"],["small","Implementación desde: "+importe(p.implementacion,p.moneda)],["small",p.descripcion]],p.id===plan.id,()=>{
    plan=p;renderTodo(false);$("planes").querySelector('[aria-pressed="true"]')?.focus();
  })));
}
function renderPerfil(){
  const perfil=perfiles.leer(negocio.id),m=perfil.marca;
  document.documentElement.style.setProperty("--marca",m.color);
  document.documentElement.style.setProperty("--marca-fondo",m.fondo);
  $("marca").textContent=m.icono;$("giro").textContent=negocio.giroNombre;$("nombre").textContent=perfil.nombre;
  $("lema").textContent=m.lema;$("descripcion").textContent=m.descripcion;$("horario").textContent=perfil.horario;$("ubicacion").textContent=perfil.ubicacion;$("contacto-demo").textContent=perfil.contacto;
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
    if(imagenOfertaSegura(p.imagen)){const img=crear("img");img.src=p.imagen;img.alt=p.nombre;img.loading="lazy";card.append(img);}
    card.append(crear("span",tipos[p.tipo]+" · "+p.categoria,"tipo"),crear("h3",p.nombre),crear("p",p.descripcion),crear("div",importe(p.precioCentavos,negocio.configuracion.moneda),"precio"));
    if(p.duracionMinutos)card.append(crear("p","Duración de referencia: "+p.duracionMinutos+" min"));
    if(p.disponible===false)card.append(crear("span","No disponible","etiqueta otro_plan"));
    return card;
  }));
}
function renderCapacidades(){
  const lista=contextoServidor?.establecimiento.id===negocio.id&&contextoServidor.plan.id===plan.id?contextoServidor.capacidades:capacidades(negocio,plan.id);
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
  $("estado").textContent=negocio.nombre+" · "+plan.nombre;guardarURL();consultarContexto();
}
function renderVista(){
  $("introduccion").hidden=$("selector-negocios").hidden=$("selector-planes").hidden=vistaNegocio||vistaAdmin;
  $("seccion-capacidades").hidden=vistaNegocio||vistaAdmin;
  $("empresa-contexto").hidden=!vistaAdmin||!empresaAbierta||editorAbierto||perfilAbierto;$("admin-inicio").hidden=!vistaAdmin||empresaAbierta||editorAbierto||perfilAbierto;$("admin-empresa").setAttribute("aria-pressed",String(empresaAbierta&&!editorAbierto&&!perfilAbierto));$("admin-resumen").setAttribute("aria-pressed",String(vistaAdmin&&!empresaAbierta&&!editorAbierto&&!perfilAbierto));$("cabecera-admin").hidden=!vistaAdmin;$("acciones-comparador").hidden=vistaAdmin;
  $("estado").hidden=vistaAdmin;$("perfil").hidden=vistaAdmin;$("seccion-catalogo").hidden=vistaAdmin;
  $("editor-servidor").hidden=false;$("enlace-original").hidden=vistaAdmin;
  if(vistaAdmin){$("titulo-barra").textContent="Panel de demostración";$("nombre-admin").textContent=perfiles.leer(negocio.id).nombre;$("admin-catalogo").setAttribute("aria-pressed",String(editorAbierto));$("admin-perfil").setAttribute("aria-pressed",String(perfilAbierto));}
  $("vista-cliente").hidden=vistaNegocio;$("vista-comparador").hidden=!vistaNegocio;
  $("abrir-editor").hidden=vistaNegocio||editorAbierto;$("editor").hidden=vistaNegocio||!editorAbierto;
  $("abrir-perfil").hidden=vistaNegocio||perfilAbierto;$("editor-perfil").hidden=vistaNegocio||!perfilAbierto;
  if(vistaNegocio||vistaAdmin)$("legado").hidden=true;
  if(editorAbierto&&!vistaNegocio)renderEditor();
  actualizarBotonesServidor();
  document.title=(vistaAdmin?"Panel · "+perfiles.leer(negocio.id).nombre:"Demostraciones comerciales")+" | Lapazimpresion3d";
}
function ajustarDuracion(){
  const servicio=campo("tipo").value==="servicio";
  $("campo-duracion").hidden=!servicio;campo("duracion").disabled=!servicio;campo("duracion").required=servicio;
}
function reiniciarFormulario(){
  editando=null;fotoGeneracion++;fotoPendiente=false;$("form-oferta").reset();mostrarFotoProducto();$("aviso-producto").textContent="JPG, PNG o WebP de hasta 8 MB. Se reduce automáticamente." ;$("titulo-form-oferta").textContent="Agregar elemento";
  $("cancelar-edicion").hidden=true;ajustarDuracion();
}
function mensajeGuardado(persistido){
  $("aviso-editor").textContent=persistido?"Cambio aplicado. Abre Ver catálogo editado para comprobarlo. Para conservarlo en D1, usa Guardar catálogo.":"Cambio solo en memoria; el navegador no pudo conservarlo. No se reflejará al abrir otra página hasta guardarlo en servidor.";
}
function trasCambio(persistido){
  mensajeGuardado(persistido);reiniciarFormulario();categorias();renderCatalogo();renderEditor();actualizarBotonesServidor();
}
function renderEditor(){
  $("lista-editor").replaceChildren(...catalogos.leer(negocio.id).map(p=>{
    const fila=crear("div",undefined,"fila-editor");
    const info=crear("div");info.append(crear("strong",p.nombre),crear("p",p.categoria+" · "+importe(p.precioCentavos)+(p.disponible===false?" · No disponible":"")));
    const editar=crear("button","Editar");editar.type="button";editar.addEventListener("click",()=>{
      fotoGeneracion++;fotoPendiente=false;$("archivo-producto").value="";campo("imagen").value=p.imagen??"";mostrarFotoProducto();actualizarBotonesServidor();
      editando=p.id;campo("nombre").value=p.nombre;campo("categoria").value=p.categoria;campo("tipo").value=p.tipo;
      campo("precio").value=(p.precioCentavos/100).toFixed(2);campo("descripcion").value=p.descripcion;
      campo("duracion").value=p.duracionMinutos??"";campo("disponible").checked=p.disponible!==false;
      ajustarDuracion();$("titulo-form-oferta").textContent="Editar "+p.nombre;$("cancelar-edicion").hidden=false;campo("nombre").focus();
    });
    const borrar=crear("button","Eliminar");borrar.type="button";borrar.addEventListener("click",()=>{
      if(!confirm("¿Eliminar "+p.nombre+" del catálogo de práctica de "+negocio.nombre+"?"))return;
      try{trasCambio(catalogos.eliminar(negocio.id,p.id));}catch(e){$("aviso-editor").textContent=e.message;}
    });
    const estado=crear("button",p.disponible===false?"Marcar disponible":"Marcar agotado");estado.type="button";estado.setAttribute("aria-label",(p.disponible===false?"Marcar disponible ":"Marcar agotado ")+p.nombre);
    estado.addEventListener("click",()=>{if(ocupada||perfilOcupado||fotoPendiente)return;if(editando!==null&&!confirm("¿Descartar la edición actual y cambiar solo la disponibilidad?"))return;try{const actual=catalogos.leer(negocio.id).find(x=>x.id===p.id);if(!actual)throw Error("El producto ya no existe.");trasCambio(catalogos.editar(negocio.id,p.id,{...actual,disponible:actual.disponible===false}));}catch(e){$("aviso-editor").textContent=e.message;}});
    fila.append(info,estado,editar,borrar);return fila;
  }));
}
$("vista-cliente").addEventListener("click",()=>{location.href=enlacesDemo(negocio.id,plan.id).negocio;});
$("vista-comparador").addEventListener("click",()=>{vistaNegocio=false;renderTodo(false);});
$("abrir-editor").addEventListener("click",()=>{perfilAbierto=false;editorAbierto=true;renderVista();actualizarBotonesServidor();campo("nombre").focus();});
$("cerrar-editor").addEventListener("click",()=>{editorAbierto=false;reiniciarFormulario();renderVista();$(vistaAdmin?"admin-catalogo":"abrir-editor").focus();});
$("admin-empresa").addEventListener("click",()=>{editorAbierto=false;perfilAbierto=false;empresaAbierta=true;renderVista();});
$("admin-resumen").addEventListener("click",()=>{empresaAbierta=false;if(editorAbierto){$("cerrar-editor").click();}if(perfilAbierto){$("cerrar-perfil").click();}renderVista();$("admin-resumen").focus();});
$("admin-catalogo").addEventListener("click",()=>{if(negocio.giro==="turismo"){location.assign("/demostraciones/experiencias/?"+new URLSearchParams({negocio:negocio.id,plan:plan.id}));return;}empresaAbierta=false;perfilAbierto=false;editorAbierto=true;renderVista();campo("nombre").focus();});
$("admin-perfil").addEventListener("click",()=>{empresaAbierta=false;editorAbierto=false;reiniciarFormulario();perfilAbierto=true;cargarPerfil();$("aviso-perfil").textContent="";renderVista();$("form-perfil").elements.namedItem("nombre").focus();});
function cargarPerfil(){
  const p=perfilPlano(perfiles.leer(negocio.id));
  generacionImagen++;
  for(const [k,v] of Object.entries(p))$("form-perfil").elements.namedItem(k).value=v;
  for(const tipo of ["logo","portada"]){$("archivo-"+tipo).value="";mostrarImagen(tipo);}
  $("aviso-imagenes").textContent="";
}
$("abrir-perfil").addEventListener("click",()=>{
  editorAbierto=false;reiniciarFormulario();perfilAbierto=true;cargarPerfil();$("aviso-perfil").textContent="";
  renderVista();$("form-perfil").elements.namedItem("nombre").focus();
});
$("cerrar-perfil").addEventListener("click",()=>{generacionImagen++;perfilAbierto=false;renderVista();$(vistaAdmin?"admin-perfil":"abrir-perfil").focus();});
function mostrarImagen(tipo){
  const valor=$("form-perfil").elements.namedItem(tipo).value,img=$("prev-"+tipo);
  img.hidden=!valor;if(valor)img.src=valor;else img.removeAttribute("src");
}
for(const tipo of ["logo","portada"]){
  $("archivo-"+tipo).addEventListener("change",async e=>{
    const archivo=e.currentTarget.files?.[0];if(!archivo)return;
    const contexto=generacionImagen, actual=++generacionesArchivo[tipo];imagenPendiente++;
    const vigente=()=>contexto===generacionImagen&&actual===generacionesArchivo[tipo];
    $("aviso-imagenes").textContent="Optimizando imagen…";
    try{
      const valor=validarImagenPerfil(await optimizarImagenPerfil(archivo,tipo));
      if(!vigente())return;
      $("form-perfil").elements.namedItem(tipo).value=valor;mostrarImagen(tipo);
      $("aviso-imagenes").textContent="Imagen lista. Aplica la personalización para conservarla.";
    }catch(error){if(vigente())$("aviso-imagenes").textContent=error.message;}
    finally{imagenPendiente--;if(vigente())e.target.value="";}
  });
  $("quitar-"+tipo).addEventListener("click",()=>{generacionesArchivo[tipo]++;$("archivo-"+tipo).value="";$("form-perfil").elements.namedItem(tipo).value="";mostrarImagen(tipo);});
}
$("form-perfil").addEventListener("submit",e=>{
  e.preventDefault();
  try{
    if(imagenPendiente)throw Error("Espera a que termine la optimización de la imagen.");
    const guardado=perfiles.guardar(negocio.id,Object.fromEntries(new FormData(e.currentTarget)));
    renderPerfil();renderVista();$("aviso-perfil").textContent=guardado?"Identidad actualizada en esta pestaña.":"Identidad actualizada en memoria; se perderá al recargar.";
  }catch(error){$("aviso-perfil").textContent=error.message;}
});
$("restaurar-perfil").addEventListener("click",()=>{
  if(!confirm("¿Restaurar la identidad original de demostración de "+negocio.nombre+"?"))return;
  const guardado=perfiles.restaurar(negocio.id);cargarPerfil();renderPerfil();renderVista();
  $("aviso-perfil").textContent=guardado?"Identidad original restaurada.":"Restaurada en memoria; no se conserva al recargar.";
});
function mostrarFotoProducto(){
  const img=$("prev-producto"),valor=campo("imagen").value;
  img.hidden=!imagenOfertaSegura(valor);
  if(img.hidden)img.removeAttribute("src");else img.src=valor;
}
$("archivo-producto").addEventListener("change",async e=>{
  const file=e.currentTarget.files?.[0];if(!file)return;
  const n=++fotoGeneracion;fotoPendiente=true;actualizarBotonesServidor();
  $("aviso-producto").textContent="Optimizando foto…";
  try{
    const foto=await optimizarImagenPerfil(file,"producto");
    if(n!==fotoGeneracion)return;
    if(!imagenOfertaSegura(foto))throw Error("La foto no tiene el formato requerido.");
    campo("imagen").value=foto;mostrarFotoProducto();$("aviso-producto").textContent="Foto lista. Guarda el elemento para aplicarla.";
  }catch(e){if(n===fotoGeneracion)$("aviso-producto").textContent=e.message;}
  finally{if(n===fotoGeneracion){fotoPendiente=false;$("archivo-producto").value="";actualizarBotonesServidor();}}
});
$("quitar-producto").addEventListener("click",()=>{fotoGeneracion++;fotoPendiente=false;$("archivo-producto").value="";campo("imagen").value="";mostrarFotoProducto();actualizarBotonesServidor();$("aviso-producto").textContent="Foto eliminada de la edición. Guarda el elemento para aplicar."});
$("cancelar-edicion").addEventListener("click",()=>{reiniciarFormulario();actualizarBotonesServidor();});
campo("tipo").addEventListener("change",ajustarDuracion);
$("form-oferta").addEventListener("submit",e=>{
  e.preventDefault();
  try{
    if(fotoPendiente)throw Error("Espera a que termine la optimización.");
    const datos={imagen:campo("imagen").value,nombre:campo("nombre").value,categoria:campo("categoria").value,tipo:campo("tipo").value,
      precioCentavos:centavosDesdeTexto(campo("precio").value),descripcion:campo("descripcion").value,
      disponible:campo("disponible").checked,duracionMinutos:Number(campo("duracion").value)};
    trasCambio(editando?catalogos.editar(negocio.id,editando,datos):catalogos.crear(negocio.id,datos));
  }catch(error){$("aviso-editor").textContent=error.message;}
});
$("restaurar-catalogo").addEventListener("click",()=>{
  if(confirm("¿Restaurar el catálogo de práctica de "+negocio.nombre+"?"))trasCambio(catalogos.restaurar(negocio.id));
});
function rutaServidor(ruta,id=negocio.id,p=plan.id){
  return "/api/demo/"+ruta+"?"+new URLSearchParams({negocio:id,plan:p});
}
async function peticion(ruta,opciones={}){
  const r=await fetch(ruta,{cache:"no-store",credentials:"same-origin",...opciones});
  const datos=await r.json();
  if(!r.ok){const error=Error(datos.error||"No se pudo completar la solicitud.");error.status=r.status;throw error;}
  return datos;
}
function actualizarBotonesServidor(){
  const configurado=contextoServidor?.establecimiento.id===negocio.id&&contextoServidor?.plan.id===plan.id&&contextoServidor.persistenciaConfigurada===true;
  $("demo-sesion").disabled=ocupada||perfilOcupado||fotoPendiente||!configurado;
  $("demo-cargar").disabled=ocupada||perfilOcupado||fotoPendiente||!configurado||!practicaActiva;
  $("demo-guardar").disabled=ocupada||perfilOcupado||fotoPendiente||!configurado||!practicaActiva||!revisiones.has(negocio.id);
  actualizarPerfilRemoto();
}
async function consultarContexto(){
  const n=++consultaContexto,id=negocio.id,p=plan.id;contextoServidor=null;actualizarBotonesServidor();
  try{
    const ctx=await peticion(rutaServidor("contexto",id,p));
    if(n!==consultaContexto)return;
    if(ctx.establecimiento?.id!==id||ctx.plan?.id!==p||!Array.isArray(ctx.capacidades))throw Error("Contexto inválido.");
    contextoServidor=ctx;renderCapacidades();if(vistaNegocio||vistaAdmin)$("legado").hidden=true;
    $("perfil-remoto-aviso").textContent=ctx.perfilConfigurado?"Puedes activar una sesión para guardar tu identidad.":"Guardado remoto de identidad aún no disponible. Puedes personalizar localmente.";
    if(!ocupada)$("demo-servidor-aviso").textContent=ctx.persistenciaConfigurada?"Servicio configurado. Conecta para consultar o guardar una copia.":"Persistencia en servidor pendiente de configuración. La práctica local sigue disponible.";
  }catch{
    if(n!==consultaContexto)return;
    $("demo-servidor-aviso").textContent="No se pudo consultar el servidor. Continúa con la práctica local.";
    $("perfil-remoto-aviso").textContent="Servicio no disponible. Puedes personalizar localmente.";
  }finally{if(n===consultaContexto)actualizarBotonesServidor();}
}
async function operarServidor(accion){
  if(ocupada||perfilOcupado||fotoPendiente)return;
  const id=negocio.id,p=plan.id;
  if(!contextoServidor?.persistenciaConfigurada||contextoServidor.establecimiento.id!==id||contextoServidor.plan.id!==p)return;
  if(accion==="cargar"&&!confirm("¿Reemplazar el catálogo local de "+negocio.nombre+" por la copia del servidor?"))return;
  ocupada=true;actualizarBotonesServidor();
  const aviso=mensaje=>{if(negocio.id===id)$("demo-servidor-aviso").textContent=mensaje;};
  try{
    if(accion==="conectar"){
      await peticion("/api/demo/sesion",{method:"POST"});
      revisiones.clear();revisionesPerfil.clear();perfilActivo=false;practicaActiva=true;
      // Obtener revisión sin sobreescribir cambios locales.
      const copia=await peticion(rutaServidor("catalogo",id,p));
      if(copia.establecimiento!==id||!Number.isSafeInteger(copia.revision))throw Error("Copia inválida.");
      if(copia.revision===0)revisiones.set(id,0);
      aviso(copia.revision===0?"Práctica conectada. Puedes guardar la copia actual.":"Hay una copia guardada. Cárgala antes de modificarla y guardarla.");
    }else if(accion==="cargar"){
      const antes=JSON.stringify(catalogos.leer(id));
      const copia=await peticion(rutaServidor("catalogo",id,p));
      if(copia.establecimiento!==id||!Number.isSafeInteger(copia.revision))throw Error("Copia inválida.");
      if(antes!==JSON.stringify(catalogos.leer(id)))throw Error("El catálogo local cambió mientras se cargaba. Intenta de nuevo.");
      const guardado=catalogos.importar(id,copia.catalogo);revisiones.set(id,copia.revision);
      if(negocio.id===id){reiniciarFormulario();categorias();renderCatalogo();renderEditor();}
      aviso(guardado?"Copia cargada en esta pestaña.":"Copia cargada en memoria; no se conserva al recargar.");
    }else if(accion==="guardar"){
      if(!revisiones.has(id))throw Error("Conecta o carga la copia primero.");
      const catalogo=catalogos.leer(id).map(x=>({...x,disponible:x.disponible!==false}));
      const copia=await peticion(rutaServidor("catalogo",id,p),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:revisiones.get(id),catalogo})});
      if(copia.establecimiento!==id||!Number.isSafeInteger(copia.revision))throw Error("Respuesta inválida.");
      revisiones.set(id,copia.revision);aviso("Copia guardada en servidor · revisión "+copia.revision+".");
    }
  }catch(e){
    if(e.status===401){practicaActiva=false;perfilActivo=false;revisiones.clear();revisionesPerfil.clear();}
    if(e.status===409)revisiones.delete(id);
    aviso(e.message||"No se pudo completar la operación.");
  }finally{ocupada=false;actualizarBotonesServidor();}
}
function actualizarPerfilRemoto(){
  const listo=contextoServidor?.establecimiento.id===negocio.id&&contextoServidor?.plan.id===plan.id&&contextoServidor?.perfilConfigurado===true;
  $("perfil-conectar").disabled=perfilOcupado||ocupada||!listo;
  $("perfil-cargar").disabled=perfilOcupado||ocupada||!listo||!perfilActivo;
  $("perfil-guardar").disabled=perfilOcupado||ocupada||!listo||!perfilActivo||!revisionesPerfil.has(negocio.id);
}
async function operarPerfil(accion){
  if(perfilOcupado||ocupada||imagenPendiente||!contextoServidor?.perfilConfigurado)return;
  const id=negocio.id,p=plan.id;
  if(contextoServidor.establecimiento.id!==id||contextoServidor.plan.id!==p)return;
  if(accion==="cargar"&&!confirm("¿Recuperar la identidad guardada y sustituir la copia local de este negocio?"))return;
  perfilOcupado=true;actualizarBotonesServidor();
  const aviso=mensaje=>{if(negocio.id===id)$("perfil-remoto-aviso").textContent=mensaje;};
  const revisar=c=>{if(c.establecimiento!==id||!Number.isSafeInteger(c.revision)||c.revision<0||!c.perfil)throw Error("Respuesta inválida.");return c;};
  try{
    if(accion==="conectar"){
      await peticion("/api/demo/sesion",{method:"POST"});perfilActivo=true;revisionesPerfil.clear();revisiones.clear();practicaActiva=false;
      const c=revisar(await peticion(rutaServidor("perfil",id,p)));
      if(c.revision===0)revisionesPerfil.set(id,0);
      aviso(c.revision===0?"Sesión activa. Aplica tus cambios y guarda la identidad.":"Hay una identidad guardada. Recupérala antes de guardar cambios.");
    }else if(accion==="cargar"){
      const antes=JSON.stringify(perfiles.leer(id));
      const c=revisar(await peticion(rutaServidor("perfil",id,p)));
      if(antes!==JSON.stringify(perfiles.leer(id)))throw Error("La identidad local cambió mientras se recuperaba.");
      const local=perfiles.guardar(id,perfilPlano(c.perfil));revisionesPerfil.set(id,c.revision);
      if(negocio.id===id){cargarPerfil();renderPerfil();renderVista();}
      aviso(local?"Identidad recuperada.":"Identidad recuperada en memoria; el almacenamiento local está bloqueado.");
    }else{
      if(!revisionesPerfil.has(id))return;
      const c=revisar(await peticion(rutaServidor("perfil",id,p),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:revisionesPerfil.get(id),perfil:perfiles.leer(id)})}));
      revisionesPerfil.set(id,c.revision);aviso("Identidad guardada en tu sesión · revisión "+c.revision+".");
    }
  }catch(e){
    if(e.status===401){perfilActivo=false;practicaActiva=false;revisionesPerfil.clear();revisiones.clear();}
    if(e.status===409)revisionesPerfil.delete(id);
    aviso(e.message||"No fue posible completar la operación.");
  }finally{perfilOcupado=false;actualizarBotonesServidor();}
}
$("perfil-conectar").addEventListener("click",()=>operarPerfil("conectar"));
$("perfil-cargar").addEventListener("click",()=>operarPerfil("cargar"));
$("perfil-guardar").addEventListener("click",()=>operarPerfil("guardar"));
$("demo-sesion").addEventListener("click",()=>operarServidor("conectar"));
$("demo-cargar").addEventListener("click",()=>operarServidor("cargar"));
$("demo-guardar").addEventListener("click",()=>operarServidor("guardar"));
$("buscar").addEventListener("input",renderCatalogo);
$("tipo").addEventListener("change",renderCatalogo);
$("categoria").addEventListener("change",renderCatalogo);
if(!redirigirNegocio){renderTodo(true);if(vistaAdmin){let local;try{local=window.localStorage;}catch{}montarEmpresa($("empresa-contexto"),negocio.id,plan.id,local);montarInicioAdmin({negocio,plan,catalogos,perfiles});renderVista();const destino={productos:"admin-catalogo",personal:"admin-empresa",perfil:"admin-perfil"}[params.get("seccion")];if(destino&&params.get("rolVista")!=="1")$(destino).click();}}
