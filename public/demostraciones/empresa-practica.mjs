import {cambiosEmpresa,agregarEventos,leerAuditoria,evento} from "./auditoria-practica.mjs";
import {gruposPermisos,permisosBase,validarPermisos} from "./permisos-practica.mjs";
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {planes,capacidades,limitesPlanes as limites} from "./config.mjs";
import {planesRepresentativos,enlacesDemo} from "./presentaciones.mjs";
const roles=["propietario","administrador","encargado","cajero"];
const normalizarNombre=s=>s.trim().normalize("NFC").toLocaleLowerCase("es-MX");
export function validarRolesPersonalizados(lista=[]){
 if(!Array.isArray(lista)||lista.length>30)throw Error("Máximo 30 roles personalizados.");
 const ids=new Set(),nombres=new Set(roles);return lista.map(x=>{
 if(!x||typeof x.id!=="string"||!/^ROL-[a-zA-Z0-9-]{1,80}$/.test(x.id)||typeof x.nombre!=="string"||!x.nombre.trim()||x.nombre.trim().length>60||!roles.slice(1).includes(x.base)||ids.has(x.id)||nombres.has(normalizarNombre(x.nombre)))throw Error("Nombre, perfil base o identificador de rol inválido o repetido.");
 ids.add(x.id);nombres.add(normalizarNombre(x.nombre));const permisos=validarPermisos(x.base,x.permisos);return {id:x.id,nombre:x.nombre.trim(),base:x.base,...(permisos===undefined?{}:{permisos})};});
}
export function guardarRolPersonalizado(d,id,nombre,base,permisos){
 const lista=d.rolesPersonalizados??[],actual=lista.find(x=>x.id===id);
 const seleccion=permisos??(actual?.permisos===undefined?undefined:actual.permisos.filter(x=>permisosBase(base).includes(x)));const nuevo={id,nombre,base,...(seleccion===undefined?{}:{permisos:seleccion})};const rolesPersonalizados=validarRolesPersonalizados(actual?lista.map(x=>x.id===id?nuevo:x):[...lista,nuevo]);
 const personal=[...d.personal],asignaciones=[...d.asignaciones],rolesAsignados=[...(d.rolesAsignados??personal.map(()=>null))];
 rolesAsignados.forEach((r,i)=>{if(r===id){personal[i]=base;asignaciones[i]=base==="administrador"?null:(asignaciones[i]??d.sucursal);}});
 return {...d,rolesPersonalizados,personal,asignaciones,rolesAsignados};
}
export function quitarRolPersonalizado(d,id){
 if(!(d.rolesPersonalizados??[]).some(x=>x.id===id))throw Error("Rol inexistente.");
 if((d.rolesAsignados??[]).includes(id))throw Error("Reasigna primero a los empleados que utilizan este rol.");
 return {...d,rolesPersonalizados:d.rolesPersonalizados.filter(x=>x.id!==id)};
}
export function asignarRolPersonalizado(d,i,id){
 if(!Number.isInteger(i)||i<1||i>=d.personal.length)throw Error("Empleado inválido.");
 const personalizado=(d.rolesPersonalizados??[]).find(x=>x.id===id),base=personalizado?.base??id;
 if(!roles.slice(1).includes(base))throw Error("Rol desconocido.");
 const personal=[...d.personal],asignaciones=[...d.asignaciones],rolesAsignados=[...(d.rolesAsignados??personal.map(()=>null))];
 personal[i]=base;asignaciones[i]=base==="administrador"?null:(asignaciones[i]??d.sucursal);rolesAsignados[i]=personalizado?.id??null;
 return {...d,personal,asignaciones,rolesAsignados};
}
export function nombreRolEmpleado(d,i){return (d.rolesPersonalizados??[]).find(x=>x.id===d.rolesAsignados?.[i])?.nombre??d.personal[i];}

export function contextoEmpresa(id,plan){
 const negocio=obtenerEstablecimiento(id), paquete=planes.find(p=>p.id===plan);
 if(!negocio||!paquete)throw Error("Contexto inválido.");
 return {negocio,paquete,usuarios:limites[plan][0],sucursales:limites[plan][1],modulos:capacidades(negocio,plan),clave:"lapaz:empresa:practica:v1:"+id+":"+plan};
}
const inicial=c=>({sucursal:1,personal:["propietario"],activas:Array.from({length:c.sucursales},(_,i)=>i+1),asignaciones:[null]});
function validar(c,d){
 if(!d||!Number.isInteger(d.sucursal)||d.sucursal<1||d.sucursal>c.sucursales||!Array.isArray(d.personal)||d.personal.length<1||d.personal.length>c.usuarios||d.personal[0]!=="propietario"||d.personal.slice(1).some(r=>!roles.slice(1).includes(r)))throw Error("Configuración de práctica inválida.");
 // Compatibilidad con datos de actualización 35: sucursales antes ilustrativas, sin asignación.
 const activas=d.activas===undefined?inicial(c).activas:d.activas;
 const asignaciones=d.asignaciones===undefined?d.personal.map((r,i)=>i&&["encargado","cajero"].includes(r)?d.sucursal:null):d.asignaciones;
 if(!Array.isArray(activas)||!activas.includes(1)||!activas.includes(d.sucursal)||new Set(activas).size!==activas.length||activas.some(s=>!Number.isInteger(s)||s<1||s>c.sucursales)||!Array.isArray(asignaciones)||asignaciones.length!==d.personal.length||asignaciones.some((s,i)=>["propietario","administrador"].includes(d.personal[i])?s!==null:!activas.includes(s)))throw Error("Sucursal o alcance de práctica inválidos.");
 const rolesPersonalizados=validarRolesPersonalizados(d.rolesPersonalizados??[]),rolesAsignados=d.rolesAsignados??d.personal.map(()=>null);
 if(!Array.isArray(rolesAsignados)||rolesAsignados.length!==d.personal.length||rolesAsignados[0]!==null||rolesAsignados.some((r,i)=>r!==null&&!rolesPersonalizados.some(x=>x.id===r&&x.base===d.personal[i])))throw Error("Asignación de rol personalizado inválida.");
 return {sucursal:d.sucursal,personal:[...d.personal],activas:[...activas].sort((a,b)=>a-b),asignaciones:[...asignaciones],...(rolesPersonalizados.length||d.rolesPersonalizados!==undefined?{rolesPersonalizados,rolesAsignados}:{})};
}
export function almacenEmpresa(c,storage){
 return {
 leer(){try{const s=storage?.getItem(c.clave);return s?validar(c,JSON.parse(s)):inicial(c);}catch{return inicial(c);}},
 guardar(d){const v=validar(c,d);if(!storage)throw Error("Almacenamiento no disponible.");const anterior=this.leer();const auditoria=agregarEventos(leerAuditoria(storage,c.clave),cambiosEmpresa(anterior,v));storage.setItem(c.clave,JSON.stringify({...v,auditoria}));return v;},
 restaurar(){if(!storage)throw Error("Almacenamiento no disponible.");const v=inicial(c),anterior=this.leer();const auditoria=agregarEventos(leerAuditoria(storage,c.clave),[...cambiosEmpresa(anterior,v),evento({modulo:"Configuración",objetivo:"Restablecimiento de personal y sucursales"})]);storage.setItem(c.clave,JSON.stringify({...v,auditoria}));return v;}
 };
}
export function montarEmpresa(root,id,plan,storage){
 const c=contextoEmpresa(id,plan),a=almacenEmpresa(c,storage);
 const el=(tag,txt)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;return n;};
 const $=s=>root.querySelector(s);
 const negocio=$("#empresa-negocio"),paquete=$("#empresa-plan"),sucursal=$("#empresa-sucursal"),rol=$("#empresa-rol"),aviso=$("#empresa-aviso");
 const option=(t,v)=>new Option(t,v);
 // Los enlaces cambian solamente el contexto ficticio; nunca una contratación.
 negocio.replaceChildren(...[...Object.keys(planesRepresentativos)].map(k=>option(obtenerEstablecimiento(k).nombre,k)));
 paquete.replaceChildren(...planes.map(p=>option(p.nombre,p.id)));
 negocio.value=id;paquete.value=plan;
 negocio.onchange=()=>location.assign(enlacesDemo(negocio.value,planesRepresentativos[negocio.value]).administracion);
 paquete.onchange=()=>location.assign(enlacesDemo(id,paquete.value).administracion);
 const nombreSucursal=s=>s===1?"Sucursal principal":"Sucursal de ejemplo "+s;
 rol.replaceChildren(...roles.slice(1).map(r=>option(r,r)));
 $("#empresa-limites").textContent=c.paquete.nombre+" · Hasta "+c.usuarios+" usuarios y "+c.sucursales+" sucursales (límites propuestos)";
 function render(d){
  const personalizados=d.rolesPersonalizados??[],opcionesRoles=()=>[...roles.slice(1).map(r=>option(r,r)),...personalizados.map(r=>option(r.nombre+" ("+r.base+")",r.id))];rol.replaceChildren(...opcionesRoles());
  $("#empresa-roles-personalizados").replaceChildren(...personalizados.map(r=>{const li=el("li",r.nombre+" · Permisos de "+r.base+" ");const editar=el("button","Editar"),borrar=el("button","Eliminar");editar.type=borrar.type="button";editar.onclick=()=>{$("#empresa-rol-id").value=r.id;$("#empresa-rol-nombre").value=r.nombre;$("#empresa-rol-base").value=r.base;mostrarPermisos(r.permisos??permisosBase(r.base));$("#empresa-rol-nombre").focus();};borrar.onclick=()=>{if(!confirm("¿Eliminar el rol "+r.nombre+"?"))return;try{cambiar(quitarRolPersonalizado(a.leer(),r.id));}catch(e){aviso.textContent=e.message;}};li.append(editar," ",borrar);return li;}));
  sucursal.replaceChildren(...d.activas.map(s=>option(nombreSucursal(s),String(s))));
  sucursal.value=String(d.sucursal);
  $("#empresa-uso").textContent=d.personal.length+" / "+c.usuarios+" usuarios · "+d.activas.length+" / "+c.sucursales+" sucursales activas";
  $("#empresa-sucursales").replaceChildren(...Array.from({length:c.sucursales},(_,i)=>{
   const s=i+1,li=el("li",nombreSucursal(s)+" · "),b=el("button",d.activas.includes(s)?"Desactivar":"Activar");b.type="button";b.disabled=s===1;
   b.onclick=()=>{const actual=a.leer();if(actual.activas.includes(s)){if(actual.asignaciones.includes(s)){aviso.textContent="Reasigna primero al personal de esta sucursal.";return;}cambiar({...actual,activas:actual.activas.filter(x=>x!==s),sucursal:actual.sucursal===s?1:actual.sucursal});}else cambiar({...actual,activas:[...actual.activas,s]});};li.append(b);return li;
  }));
  $("#empresa-personal").replaceChildren(...d.personal.map((r,i)=>{
   const li=el("li","Empleado de ejemplo "+(i+1)+" · ");if(!i){li.append("Propietario · Toda la empresa");return li;}
   const selector=el("select"),alcance=el("select"),b=el("button","Quitar");selector.setAttribute("aria-label","Rol del empleado "+(i+1));alcance.setAttribute("aria-label","Sucursal del empleado "+(i+1));
   selector.replaceChildren(...opcionesRoles());selector.value=d.rolesAsignados?.[i]??r;
   alcance.replaceChildren(...(r==="administrador"?[option("Toda la empresa","")]:d.activas.map(s=>option(nombreSucursal(s),String(s)))));alcance.value=d.asignaciones[i]===null?"":String(d.asignaciones[i]);alcance.disabled=r==="administrador";
   selector.onchange=()=>{try{cambiar(asignarRolPersonalizado(a.leer(),i,selector.value));}catch(e){aviso.textContent=e.message;}};
   alcance.onchange=()=>{const v=a.leer();v.asignaciones[i]=Number(alcance.value);cambiar(v);};
   b.type="button";b.onclick=()=>{const v=a.leer();cambiar({...v,personal:v.personal.filter((_,j)=>j!==i),asignaciones:v.asignaciones.filter((_,j)=>j!==i),...(v.rolesAsignados?{rolesAsignados:v.rolesAsignados.filter((_,j)=>j!==i)}:{})});};li.append(selector," ",alcance," ",b);return li;
  }));
  $("#empresa-agregar").disabled=d.personal.length>=c.usuarios;
 }
 function cambiar(d){try{render(a.guardar(d));aviso.textContent="Cambio guardado en este navegador.";}catch(e){render(a.leer());aviso.textContent=e.message;}}
 sucursal.onchange=()=>cambiar({...a.leer(),sucursal:Number(sucursal.value)});
 $("#empresa-agregar").onclick=()=>{const d=a.leer(),p=(d.rolesPersonalizados??[]).find(x=>x.id===rol.value),base=p?.base??rol.value;cambiar({...d,personal:[...d.personal,base],asignaciones:[...d.asignaciones,base==="administrador"?null:d.sucursal],...(d.rolesPersonalizados?{rolesAsignados:[...(d.rolesAsignados??d.personal.map(()=>null)),p?.id??null]}:{})});};
 function mostrarPermisos(seleccion=permisosBase($("#empresa-rol-base").value)){const permitidos=permisosBase($("#empresa-rol-base").value);$("#empresa-permisos").replaceChildren(...gruposPermisos.map(([nombre,...items])=>{const f=el("fieldset"),l=el("legend",nombre);f.append(l);for(const [id,t] of items){const label=el("label"),ch=el("input");ch.type="checkbox";ch.value=id;ch.disabled=!permitidos.includes(id);ch.checked=!ch.disabled&&seleccion.includes(id);label.append(ch," "+t);f.append(label);}return f;}));}
 $("#empresa-rol-base").onchange=()=>mostrarPermisos();$("#empresa-permisos-todos").onclick=()=>mostrarPermisos();$("#empresa-permisos-ninguno").onclick=()=>mostrarPermisos([]);mostrarPermisos();
 const limpiarRol=()=>{$("#empresa-rol-id").value="";$("#empresa-rol-nombre").value="";$("#empresa-rol-base").value="encargado";mostrarPermisos();};
 $("#empresa-rol-nuevo").onclick=limpiarRol;
 $("#empresa-rol-guardar").onclick=()=>{try{const d=a.leer(),id=$("#empresa-rol-id").value||"ROL-"+crypto.randomUUID();const v=guardarRolPersonalizado(d,id,$("#empresa-rol-nombre").value,$("#empresa-rol-base").value,[...$("#empresa-permisos").querySelectorAll("input:checked")].map(x=>x.value));render(a.guardar(v));limpiarRol();aviso.textContent="Rol personalizado guardado.";}catch(e){aviso.textContent=e.message;}};

 $("#empresa-restaurar").onclick=()=>{if(confirm("¿Restaurar solo personal y contexto de este negocio y plan?"))try{render(a.restaurar());aviso.textContent="Contexto restaurado.";}catch(e){aviso.textContent=e.message;}};
 $("#empresa-modulos").replaceChildren(...c.modulos.map(m=>el("li",m.nombre+" — "+({disponible:"Práctica disponible",en_desarrollo:"En desarrollo",otro_plan:"Plan superior",ejemplo:"Vista previa"}[m.estadoEfectivo]))));
 render(a.leer());
}
