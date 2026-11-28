import {navegacionCentral} from "./navegacion-central.mjs";
const css=`*{box-sizing:border-box}body{margin:0;background:#f5f7fa;color:#243447;font:16px system-ui,sans-serif}header{background:#14283b;color:white;padding:18px 4%;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.layout{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:85vh;max-width:1440px;margin:auto}aside{padding:20px;background:white;border-right:1px solid #dce2e8}main{padding:28px}nav a,nav span{display:block;padding:12px;border-radius:8px;margin:4px 0;color:inherit}nav a[aria-current=page]{background:#e1edf7;font-weight:700}nav span{color:#667587}small{display:block;font-size:.8rem}article{background:white;border:1px solid #dce2e8;border-radius:12px;padding:20px} .indicadores{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.indicadores article strong{display:block;font-size:1.6rem;margin-top:8px}#dashboard section{margin:20px 0}#filtros{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin:16px 0}#filtros label{display:grid;gap:4px}input,select{font:inherit;padding:8px;max-width:100%}#directorio article{margin:8px 0}#expediente p{overflow-wrap:anywhere}#dashboard li{overflow-wrap:anywhere;margin:8px 0}button{font:inherit;padding:8px 12px;border:1px solid #b6c4d0;border-radius:6px;background:white;color:#14283b;cursor:pointer}#menu{display:none}[hidden]{display:none!important}@media(max-width:780px){.layout{grid-template-columns:1fr}#menu{display:block}aside,main{padding:14px}}`;
export function interfazCentral(nonce,seccion="inicio"){
 if(typeof nonce!=="string"||!/^[a-f0-9]{32}$/.test(nonce))throw Error("Nonce inválido.");
 const menu=navegacionCentral.map(s=>s.estado==="disponible"?'<a href="'+(s.id==="inicio"?"/interno/central":"/interno/central/comercios")+'"'+(s.id===seccion?' aria-current="page"':'')+'>'+s.nombre+'<small>'+s.descripcion+'</small></a>':'<span aria-disabled="true">'+s.nombre+'<small>'+s.descripcion+' · Próximamente</small></span>').join("");
 const contenido=seccion==="comercios"?"<h1>Comercios</h1><p id=\"estado\" role=\"status\">Consultando directorio…</p><form id=\"filtros\"><label>Buscar <input name=\"buscar\" maxlength=\"120\" type=\"search\"></label><label>Giro <select name=\"giro\"><option value=\"\">Todos</option><option>restaurante</option><option>cafeteria</option><option>tienda</option><option>barberia</option><option>taller</option><option>otro</option></select></label><label>Paquete <select name=\"plan\"><option value=\"\">Todos</option><option>p1</option><option>p2</option><option>p3</option><option>p4</option></select></label><label>Estado <select name=\"estado\"><option value=\"\">Todos</option><option>sin_contratar</option><option>programada</option><option>vencida</option><option>prueba</option><option>activa</option><option>suspendida</option><option>cancelada</option></select></label><button type=\"submit\">Buscar</button></form><div id=\"directorio\"></div><div id=\"paginacion\"></div><div id=\"expediente\"></div>":"<h1>Inicio</h1><p id=\"estado\" role=\"status\">Sesión administrativa verificada.</p><button id=\"actualizar\" type=\"button\">Actualizar indicadores</button><div id=\"dashboard\" aria-live=\"polite\"></div>";
 return '<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administrador central privado | Lapazimpresion3d</title><style nonce="'+nonce+'">'+css+'</style></head><body><header><strong>Lapazimpresion3d · Administración central</strong><button id="salir" type="button">Cerrar sesión</button></header><div class="layout"><aside><button id="menu" type="button" aria-controls="nav" aria-expanded="true">Menú</button><nav id="nav" aria-label="Administración central">'+menu+'</nav></aside><main>'+contenido+'</main></div><script nonce="'+nonce+'">('+cliente.toString()+')();('+clienteDirectorio.toString()+')();</script></body></html>';
}
function cliente(){
 const menu=document.getElementById("menu"),nav=document.getElementById("nav"),salir=document.getElementById("salir"),estado=document.getElementById("estado");
 const media=matchMedia("(max-width:780px)");function abrir(v){nav.hidden=!v;menu.setAttribute("aria-expanded",String(v));}abrir(!media.matches);media.addEventListener("change",e=>abrir(!e.matches));menu.onclick=()=>abrir(nav.hidden);
 const root=document.getElementById("dashboard"),actualizar=document.getElementById("actualizar");
 const el=(tag,txt,padre)=>{const x=document.createElement(tag);x.textContent=txt;padre.append(x);return x;};
 const money=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n/100),fecha=n=>new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeZone:"America/Mazatlan"}).format(n);
 const nombres={sin_contratar:"Sin contratar",programada:"Programada",vencida:"Vencida",prueba:"En prueba",activa:"Activa",suspendida:"Suspendida",cancelada:"Cancelada",pendiente:"Pendiente",aceptada:"Aceptada",configuracion:"Configuración",revision:"Revisión",entregada:"Entregada",solicitada:"Solicitada",correccion:"Corrección",rechazada:"Rechazada",aprobada:"Aprobada"};
 function lista(t,items,fn){const s=el("section","",root);el("h2",t,s);if(!items.length){el("p","Sin registros.",s);return;}const l=el("ul","",s);for(const x of items)el("li",fn(x),l);}
 function render(d){root.replaceChildren();const grid=el("div","",root);grid.className="indicadores";for(const [label,value] of [["Comercios registrados",d.comercios],["Contratos activos vigentes y empresa habilitada",d.mrr_contratos],["Empresas deshabilitadas",d.empresas_deshabilitadas],["Mensualidades contractuales estimadas · antes de IVA",money(d.mrr_centavos)],["Vencimientos en 30 días",d.vencimientos_total],["Pagos del sistema principal","No integrado"]]){const a=el("article","",grid);el("span",label,a);el("strong",String(value),a);}
 el("p","La estimación contractual no representa ingresos cobrados. Los pagos se consultarán en la administración principal.",root);
 lista("Estados contractuales",Object.entries(d.estados),x=>(nombres[x[0]]??x[0])+": "+x[1]);
 lista("Distribución de suscripciones por paquete y versión",d.planes,x=>x.nombre+" · v"+x.version+": "+x.total);
 lista("Altas autorizadas",d.altas,x=>(nombres[x.estado]??x.estado)+": "+x.total);
 lista("Implementaciones",d.implementaciones,x=>(nombres[x.estado]??x.estado)+": "+x.total);
 lista("Último estado de entrega",d.entregas,x=>(nombres[x.estado]??x.estado)+": "+x.total);
 lista("Próximos vencimientos · hasta 20",d.vencimientos,x=>x.nombre+" · "+x.plan+" · "+fecha(x.vence));
 lista("Actividad reciente · hasta 20",d.actividad,x=>fecha(x.fecha)+" · "+x.accion+(x.empresa?" · "+x.empresa:""));
 }
 async function cargar(){actualizar.disabled=true;root.replaceChildren();estado.textContent="Consultando indicadores…";try{const r=await fetch("/interno/central/dashboard",{credentials:"same-origin",cache:"no-store",redirect:"error"});if(!r.ok)throw Error();const d=await r.json();render(d);estado.textContent="Datos consultados: "+fecha(d.fecha);}catch{root.replaceChildren();estado.textContent="No se pudieron consultar los indicadores. Comprueba la sesión o vuelve a intentar.";}finally{actualizar.disabled=false;}}
 if(actualizar){actualizar.onclick=cargar;cargar();}
 salir.onclick=async()=>{salir.disabled=true;try{const r=await fetch("/interno/central/salir",{method:"POST",credentials:"same-origin",cache:"no-store",redirect:"error"});if(!r.ok)throw Error();location.replace("/interno/central");}catch{estado.textContent="No se pudo confirmar el cierre de sesión. Intenta nuevamente.";salir.disabled=false;}};
}

function clienteDirectorio(){
 const form=document.getElementById("filtros");if(!form)return;
 const lista=document.getElementById("directorio"),detalle=document.getElementById("expediente"),pag=document.getElementById("paginacion"),estado=document.getElementById("estado");
 let generacion=0,offset=0,filtros=new URLSearchParams();
 const el=(tag,text,padre)=>{const x=document.createElement(tag);x.textContent=text;padre.append(x);return x;};
 const boton=(texto,fn,padre)=>{const b=el("button",texto,padre);b.type="button";b.onclick=fn;return b;};
 async function api(path,q){const r=await fetch(path+"?"+q,{credentials:"same-origin",cache:"no-store",redirect:"error"});if(!r.ok)throw Error();return r.json();}
 async function cargar(){
  const g=++generacion;lista.replaceChildren();detalle.replaceChildren();pag.replaceChildren();estado.textContent="Consultando directorio…";
  try{const q=new URLSearchParams(filtros);q.set("offset",String(offset));q.set("limite","25");const d=await api("/interno/central/directorio",q);if(g!==generacion)return;
   estado.textContent=d.total+" comercios encontrados";
   for(const x of d.items){const a=el("article","",lista);el("h2",x.nombre_publico||x.nombre,a);el("p",[x.giro??"Giro no registrado",x.paquete??"Sin paquete",x.estado_efectivo,x.activa?"Habilitada":"Deshabilitada"].join(" · "),a);boton("Ver expediente",()=>abrir(x.id),a);}
   if(offset>0)boton("Anterior",()=>{offset=Math.max(0,offset-25);cargar();},pag);
   if(offset+25<d.total)boton("Siguiente",()=>{offset+=25;cargar();},pag);
  }catch{if(g===generacion)estado.textContent="No se pudo consultar el directorio.";}
 }
 async function abrir(id){
  const g=++generacion;detalle.replaceChildren();estado.textContent="Consultando expediente…";
  try{const d=await api("/interno/central/expediente",new URLSearchParams({empresa:id}));if(g!==generacion)return;const e=d.datos.empresa[0];el("h2",e.nombre_publico||e.nombre,detalle);el("p","Expediente de solo consulta. Pagos: integración pendiente.",detalle);
   const nombres={empresa:"Información y suscripción",sucursales:"Sucursales",principal:"Sucursal principal",membresias:"Propietarios y accesos",personal:"Personal",roles:"Roles",contrato_inicial:"Contrato inicial",activacion:"Módulos habilitados",historial:"Historial contractual",ciclo:"Ciclo comercial",entregas:"Entregas"};
   for(const [k,rows] of Object.entries(d.datos)){const s=el("details","",detalle);s.open=k==="empresa";el("summary",nombres[k]??k,s);if(d.truncados.includes(k))el("p","Se muestran los primeros 100 registros.",s);if(!rows.length)el("p","Sin registros.",s);for(const row of rows){const a=el("article","",s);for(const [campo,valor] of Object.entries(row)){let v=valor===null?"No registrado":String(valor);if(valor!==null&&["mensualidad","implementacion"].includes(campo)&&typeof valor==="number")v=new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(valor/100)+" + IVA";if(typeof valor==="number"&&["fecha","inicio","vence"].includes(campo))v=new Date(valor).toLocaleString("es-MX",{timeZone:"America/Mazatlan"});el("p",campo+": "+v,a);}}}
   estado.textContent="Expediente consultado.";detalle.scrollIntoView({block:"start"});
  }catch{if(g===generacion){detalle.replaceChildren();estado.textContent="Expediente no disponible.";}}
 }
 form.onsubmit=e=>{e.preventDefault();filtros=new URLSearchParams(new FormData(form));offset=0;cargar();};cargar();
}
