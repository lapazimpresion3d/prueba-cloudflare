// Private shell: static HTML, no embedded business data, no persistent browser storage.
export function interfazAsistente(nonce){
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Asistente de implementación</title><style nonce="'+nonce+'">'+css+'</style></head><body><header><strong>Lapazimpresion3d</strong><span>Asistente de implementación</span></header><main><p id="estado" role="status" aria-live="polite">Consultando configuración…</p><button id="recargar" type="button">Recuperar estado del servidor</button><div class="layout"><aside><h2>Etapas</h2><progress id="avance" max="1" value="0"></progress><p id="avanceTexto"></p><nav id="etapas" aria-label="Etapas"></nav></aside><section id="contenido" aria-label="Configuración"></section></div></main><script nonce="'+nonce+'" type="module">('+cliente.toString()+')();</script></body></html>';
}
const css=`*{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#202b38;font:16px system-ui,sans-serif}header{padding:20px 4%;background:#14283b;color:white;display:flex;gap:20px;flex-wrap:wrap}main{max-width:1200px;margin:auto;padding:24px}.layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:20px;margin-top:18px}aside,section{background:white;border:1px solid #dce2e8;border-radius:12px;padding:20px}h2{font-size:1.3rem}button,input,textarea,select{font:inherit}button{padding:10px 14px;border:1px solid #b6c4d0;border-radius:7px;background:#fff;color:#152d43;cursor:pointer;margin:4px 0}button:disabled{opacity:.5;cursor:default}nav button{display:block;width:100%;text-align:left}button[aria-current=step]{background:#153b59;color:white}label{display:block;margin:12px 0}input,textarea,select{display:block;width:100%;padding:9px;border:1px solid #9daab8;border-radius:5px}input[type=checkbox]{display:inline-block;width:auto;margin-left:12px}textarea{min-height:90px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.9rem}article{border-top:1px solid #dce2e8;padding:12px 0}progress{width:100%}.acciones{display:flex;gap:8px;flex-wrap:wrap}.error{color:#9e2525}@media(max-width:720px){.layout{grid-template-columns:1fr}main{padding:12px}aside,section{padding:14px}}`;
function cliente(){
 const $=id=>document.getElementById(id),estado=$("estado"),contenido=$("contenido"),nav=$("etapas"),recargar=$("recargar");
 const empresa=new URL(location.href).searchParams.get("empresa"),url=new URL("/interno/asistente/datos",location.origin);url.searchParams.set("empresa",empresa);
 const nombres={inicio:"Inicio",perfil:"Identidad comercial",presentacion:"Presentación y contacto",sucursales:"Sucursales",personal:"Personal y permisos",modulos:"Módulos",revision:"Revisión"};
 let v=null,ocupado=false,incierto=false,generacion=0;
 const el=(tag,text,padre=contenido)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;padre.append(n);return n;};
 const boton=(texto,fn,padre=contenido,disabled=false)=>{const b=el("button",texto,padre);b.type="button";b.disabled=disabled;b.addEventListener("click",fn);return b;};
 const detalle=(titulo,obj,padre=contenido)=>{const d=el("details",undefined,padre);el("summary",titulo,d);el("pre",JSON.stringify(obj,null,2),d);};
 function mensaje(t,error=false){estado.textContent=t;estado.className=error?"error":"";}
 async function api(accion=null,datos=null){
  const u=new URL(url);if(accion)u.searchParams.set("accion",accion);
  const r=await fetch(u,{method:datos===null?"GET":"POST",credentials:"same-origin",cache:"no-store",redirect:"error",...(datos===null?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(datos)})});
  if(!r.ok)throw Error("Solicitud no completada.");return r.json();
 }
 function bloquear(){for(const b of document.querySelectorAll("button,input,textarea,select"))b.disabled=true;}
 async function cargar(){
  if(ocupado)return;ocupado=true;generacion++;bloquear();
  try{v=await api();incierto=false;render();mensaje("Estado recuperado del servidor.");}
  catch{v=null;incierto=true;contenido.replaceChildren();nav.replaceChildren();$("avance").value=0;$("avanceTexto").textContent="Sin datos vigentes";mensaje("No se pudo recuperar la configuración. Comprueba la sesión o conexión y vuelve a cargar.",true);}
  finally{ocupado=false;recargar.disabled=false;}
 }
 async function guardar(accion,datos){
  if(ocupado||incierto)return;ocupado=true;generacion++;bloquear();
  try{await api(accion,datos);v=await api();render();mensaje("Guardado y confirmado por el servidor.");}
  catch{incierto=true;v=null;contenido.replaceChildren();nav.replaceChildren();$("avance").value=0;$("avanceTexto").textContent="Sin datos vigentes";mensaje("Resultado no confirmado. Recupera el estado antes de volver a guardar. No se repetirá automáticamente.",true);}
  finally{ocupado=false;recargar.disabled=false;}
 }
 function formulario(titulo,campos,accion,transformar=x=>x,padre=contenido){
  const f=el("form",undefined,padre);el("h3",titulo,f);const inputs={};
  for(const [k,label,val,tipo] of campos){const l=el("label",label,f),i=el(tipo==="textarea"?"textarea":"input",undefined,l);i.name=k;if(tipo!=="textarea")i.type=tipo||"text";i.value=val??"";inputs[k]=i;}
  const b=el("button","Guardar",f);b.type="submit";f.addEventListener("submit",e=>{e.preventDefault();try{guardar(accion,transformar(Object.fromEntries(Object.entries(inputs).map(([k,i])=>[k,i.value]))));}catch{mensaje("Revisa los datos del formulario.",true);}});
 }
 const json=x=>JSON.stringify(x,null,2);
 function campo(p,k,tipo,valor){const l=el("label",k,p),i=el("input",undefined,l);i.type=tipo;if(tipo==="checkbox")i.checked=valor===true;else i.value=valor??"";return i;}
 function formularioPresentacion(rev){
  const f=el("form");el("h3","Presentación",f);
  const l=el("label","Estilo",f),sel=el("select",undefined,l);
  for(const k of ["clasico","compacto"]){const o=el("option",k,sel);o.value=k;}
  sel.value=v.perfil.presentacion.estilo;
  const campos=["descripcion","horario","contacto"].map(k=>[k,campo(f,k,"checkbox",v.perfil.presentacion.secciones.includes(k))]);
  const b=el("button","Guardar presentación",f);b.type="submit";f.addEventListener("submit",e=>{e.preventDefault();guardar("presentacion",{revision:rev,presentacion:{estilo:sel.value,secciones:campos.filter(([,i])=>i.checked).map(([k])=>k)}});});
 }
 function formularioContacto(rev){
  const f=el("form");el("h3","Contacto y visibilidad pública",f);const c=v.perfil.contacto,campos={};
  for(const k of ["telefono","whatsapp","correo","direccion","mapa","sitio","facebook","instagram","tiktok","youtube","linkedin","x"]){campos[k]=[campo(f,k,k==="correo"?"email":"text",c[k]),campo(f,"Mostrar "+k,"checkbox",c.visibilidad[k])];}
  const lat=campo(f,"Latitud (opcional)","text",c.coordenadas?.latitud),lon=campo(f,"Longitud (opcional)","text",c.coordenadas?.longitud),vis=campo(f,"Mostrar coordenadas","checkbox",c.visibilidad.coordenadas);
  const modos=["establecimiento","domicilio","en_linea"].map(k=>[k,campo(f,k,"checkbox",c.modalidades.includes(k))]);
  const b=el("button","Guardar contacto",f);b.type="submit";f.addEventListener("submit",e=>{e.preventDefault();const contacto={visibilidad:{coordenadas:vis.checked},modalidades:modos.filter(([,i])=>i.checked).map(([k])=>k),coordenadas:null};for(const [k,[i,j]] of Object.entries(campos)){contacto[k]=i.value;contacto.visibilidad[k]=j.checked;}if(lat.value.trim()||lon.value.trim()){if(!lat.value.trim()||!lon.value.trim()||!Number.isFinite(Number(lat.value))||!Number.isFinite(Number(lon.value))){mensaje("Revisa las coordenadas.",true);return;}contacto.coordenadas={latitud:Number(lat.value),longitud:Number(lon.value)};}guardar("contacto",{revision:rev,contacto});});
 }
 function formularioHorario(rev){
  const f=el("form");el("h3","Horario semanal",f);const h=v.perfil.horario,z=campo(f,"Zona horaria","text",h.zona_horaria);
  const dias=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"],fmt=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
  const semana=dias.map((d,i)=>campo(f,d+" (HH:MM-HH:MM, separados por coma; vacío = cerrado)","text",h.horario_semanal[i].map(([a,b])=>fmt(a)+"-"+fmt(b)).join(", ")));
  const l=el("label","Excepciones por fecha (JSON avanzado, se conserva si no se edita)",f),ex=el("textarea",undefined,l);ex.value=json(h.excepciones_horario);
  const b=el("button","Guardar horario",f);b.type="submit";f.addEventListener("submit",e=>{e.preventDefault();try{const parse=t=>{if(!t.trim())return [];return t.split(",").map(s=>{const m=s.trim().match(/^(\\d{2}):([0-5]\\d)-(\\d{2}):([0-5]\\d)$/);if(!m)throw Error();return [Number(m[1])*60+Number(m[2]),Number(m[3])*60+Number(m[4])];});};guardar("horario",{revision:rev,zona_horaria:z.value,horario_semanal:semana.map(i=>parse(i.value)),excepciones_horario:JSON.parse(ex.value)});}catch{mensaje("Revisa el formato del horario.",true);}});
 }
 function formularioEmpleado(f,padre){
  const nuevo=!f;f=f??{activo:1};formulario(nuevo?"Nueva ficha":"Editar ficha",[["codigo","Código",f.codigo],["nombre","Nombre",f.nombre],["puesto","Puesto",f.puesto],["especialidad","Especialidad",f.especialidad],["telefono","Teléfono internacional",f.telefono],["correo","Correo",f.correo,"email"],["incorporacion","Fecha de incorporación",f.incorporacion,"date"],["activo","Activo (1 o 0)",f.activo,"number"]],"empleado",x=>({...x,activo:Number(x.activo),revision:f.revision??0,...(nuevo?{}:{id:f.id})}),padre);
 }
 function render(){
  nav.replaceChildren();contenido.replaceChildren();
  const p=v.progreso,items=v.checklist.items,oblig=items.filter(i=>i.obligatorio),validos=oblig.filter(i=>i.estado==="valido").length;
  $("avance").max=oblig.length||1;$("avance").value=validos;$("avanceTexto").textContent=validos+" de "+oblig.length+" requisitos obligatorios válidos";
  for(const etapa of v.pasos){const item=items.find(i=>i.id===etapa.id);const b=boton(nombres[etapa.id]+(item?.estado==="valido"?" — válido":""),()=>guardar("progreso",{revision:p.revision,paso:etapa.id,accion:"navegar"}),nav,p.estado==="pausado"||(p.estado==="sin_iniciar"&&etapa.id!=="inicio"));if(etapa.id===p.paso)b.setAttribute("aria-current","step");}
  el("h2",nombres[p.paso]||"Implementación");el("p","Estado: "+p.estado+" · revisión "+p.revision);
  const acciones=el("div");acciones.className="acciones";
  if(p.estado==="sin_iniciar")boton("Iniciar",()=>guardar("progreso",{revision:p.revision,paso:"inicio",accion:"navegar"}),acciones);
  else boton(p.estado==="pausado"?"Continuar":"Pausar",()=>guardar("progreso",{revision:p.revision,paso:p.paso,accion:p.estado==="pausado"?"reanudar":"pausar"}),acciones);
  if(p.estado==="pausado"){el("p","Reanuda para editar la configuración.");return;}
  const rev=v.revision_perfil,ident=v.perfil.identidad;
  if(p.paso==="inicio"){el("p","Giro: "+v.giro+" · Plan: "+(v.ruta.contrato?.plan??"pendiente"));el("p","Configura los datos y revisa los requisitos. Visitar una etapa no la valida.");}
  if(p.paso==="perfil"){
   formulario("Datos básicos",[["nombre_publico","Nombre comercial",ident.nombre_publico],["lema","Lema",ident.lema],["descripcion","Descripción",ident.descripcion,"textarea"]],"perfil",x=>({...x,revision:rev}));
   formulario("Colores",["color","color_secundario","color_acento","color_fondo","color_texto"].map(k=>[k,k,ident[k],"color"]),"visual",x=>({...x,revision:rev}));
  }
  if(p.paso==="presentacion"){
   formularioPresentacion(rev);formularioContacto(rev);formularioHorario(rev);
   detalle("Vista previa filtrada",v.perfil.vista_previa);
  }
  if(p.paso==="sucursales"){
   el("p",v.organizacion.sucursales.activas+" / "+v.organizacion.sucursales.limite+" sucursales activas");
   for(const s of v.organizacion.sucursales.datos){const a=el("article");el("h3",s.nombre+(s.principal?" — Principal":""),a);formulario("Editar sucursal",[["nombre","Nombre",s.nombre],["activa","Activa (1 o 0)",s.activa,"number"],["contacto","Contacto (JSON o null)",json(s.contacto),"textarea"],["horario","Horario (JSON o null)",json(s.horario),"textarea"]],"sucursal",x=>({id:s.id,revision:s.revision,nombre:x.nombre,activa:Number(x.activa),contacto:JSON.parse(x.contacto),horario:JSON.parse(x.horario)}),a);if(s.activa===1&&!s.principal)boton("Establecer principal",()=>guardar("principal",{id:s.id,revision:s.revision_principal}),a);}
   formulario("Nueva sucursal",[["nombre","Nombre",""]],"sucursal",x=>({...x,revision:0,activa:1,contacto:null,horario:null}));
  }
  if(p.paso==="personal"){const d=v.organizacion.personal;if(d){el("p",d.usuarios_activos+" / "+d.limite_usuarios+" usuarios activos");for(const f of d.fichas){const a=el("article");el("h3",f.nombre,a);detalle("Ficha y asignaciones",{ficha:f,detalle:d.detalles.find(x=>x.id===f.id)},a);formularioEmpleado(f,a);}detalle("Roles configurados",d.roles);detalle("Servicios internos",d.servicios);detalle("Recursos",d.recursos);formularioEmpleado(null,contenido);el("p","Las fichas no crean cuentas. Roles y asignaciones de acceso permanecen en consulta.");}}
  if(p.paso==="modulos"){for(const m of v.modulos.modulos){const a=el("article");el("h3",m.id,a);el("p",m.estado_configuracion+" · "+m.estado_validacion,a);el("p",m.habilitado?"Habilitado":"No habilitado",a);detalle("Requisitos y bloqueos",{faltantes:m.faltantes,dependencias:m.dependencias_pendientes,bloqueos:m.bloqueos},a);}detalle("Excluidos",v.modulos.excluidos);}
  if(p.paso==="revision"){el("p",v.preparado?"Preparado para revisión":"No preparado");el("p","Validación: "+v.validacion);detalle("Checklist",v.checklist);boton("Registrar nueva validación",()=>guardar("validar",{revision:v.revision_validacion?.revision??0}));boton("Consultar historial",async()=>{if(ocupado)return;const g=generacion;try{const h=await api("historial");if(g===generacion&&v&&v.progreso.paso==="revision")detalle("Últimas validaciones",h);}catch{mensaje("No se pudo consultar el historial.",true);}});}
 }
 recargar.addEventListener("click",cargar);cargar();
}
