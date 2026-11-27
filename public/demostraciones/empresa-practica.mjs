import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {planes,capacidades,limitesPlanes as limites} from "./config.mjs";
import {planesRepresentativos,enlacesDemo} from "./presentaciones.mjs";
const roles=["propietario","administrador","encargado","cajero"];
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
 return {sucursal:d.sucursal,personal:[...d.personal],activas:[...activas].sort((a,b)=>a-b),asignaciones:[...asignaciones]};
}
export function almacenEmpresa(c,storage){
 return {
 leer(){try{const s=storage?.getItem(c.clave);return s?validar(c,JSON.parse(s)):inicial(c);}catch{return inicial(c);}},
 guardar(d){const v=validar(c,d);if(!storage)throw Error("Almacenamiento no disponible.");storage.setItem(c.clave,JSON.stringify(v));return v;},
 restaurar(){if(!storage)throw Error("Almacenamiento no disponible.");storage.removeItem(c.clave);return inicial(c);}
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
 const nombreSucursal=s=>s===1?"Sucursal principal":"Sucursal ficticia "+s;
 rol.replaceChildren(...roles.slice(1).map(r=>option(r,r)));
 $("#empresa-limites").textContent=c.paquete.nombre+" · Hasta "+c.usuarios+" usuarios y "+c.sucursales+" sucursales (límites propuestos)";
 function render(d){
  sucursal.replaceChildren(...d.activas.map(s=>option(nombreSucursal(s),String(s))));
  sucursal.value=String(d.sucursal);
  $("#empresa-uso").textContent=d.personal.length+" / "+c.usuarios+" usuarios · "+d.activas.length+" / "+c.sucursales+" sucursales activas";
  $("#empresa-sucursales").replaceChildren(...Array.from({length:c.sucursales},(_,i)=>{
   const s=i+1,li=el("li",nombreSucursal(s)+" · "),b=el("button",d.activas.includes(s)?"Desactivar":"Activar");b.type="button";b.disabled=s===1;
   b.onclick=()=>{const actual=a.leer();if(actual.activas.includes(s)){if(actual.asignaciones.includes(s)){aviso.textContent="Reasigna primero al personal de esta sucursal.";return;}cambiar({...actual,activas:actual.activas.filter(x=>x!==s),sucursal:actual.sucursal===s?1:actual.sucursal});}else cambiar({...actual,activas:[...actual.activas,s]});};li.append(b);return li;
  }));
  $("#empresa-personal").replaceChildren(...d.personal.map((r,i)=>{
   const li=el("li","Empleado ficticio "+(i+1)+" · ");if(!i){li.append("Propietario · Toda la empresa");return li;}
   const selector=el("select"),alcance=el("select"),b=el("button","Quitar");selector.setAttribute("aria-label","Rol del empleado "+(i+1));alcance.setAttribute("aria-label","Sucursal del empleado "+(i+1));
   selector.replaceChildren(...roles.slice(1).map(x=>option(x,x)));selector.value=r;
   alcance.replaceChildren(...(r==="administrador"?[option("Toda la empresa","")]:d.activas.map(s=>option(nombreSucursal(s),String(s)))));alcance.value=d.asignaciones[i]===null?"":String(d.asignaciones[i]);alcance.disabled=r==="administrador";
   selector.onchange=()=>{const v=a.leer();v.personal[i]=selector.value;v.asignaciones[i]=selector.value==="administrador"?null:(v.asignaciones[i]??v.sucursal);cambiar(v);};
   alcance.onchange=()=>{const v=a.leer();v.asignaciones[i]=Number(alcance.value);cambiar(v);};
   b.type="button";b.onclick=()=>{const v=a.leer();cambiar({...v,personal:v.personal.filter((_,j)=>j!==i),asignaciones:v.asignaciones.filter((_,j)=>j!==i)});};li.append(selector," ",alcance," ",b);return li;
  }));
  $("#empresa-agregar").disabled=d.personal.length>=c.usuarios;
 }
 function cambiar(d){try{render(a.guardar(d));aviso.textContent="Cambio guardado en este navegador.";}catch(e){render(a.leer());aviso.textContent=e.message;}}
 sucursal.onchange=()=>cambiar({...a.leer(),sucursal:Number(sucursal.value)});
 $("#empresa-agregar").onclick=()=>{const d=a.leer();cambiar({...d,personal:[...d.personal,rol.value],asignaciones:[...d.asignaciones,rol.value==="administrador"?null:d.sucursal]});};
 $("#empresa-restaurar").onclick=()=>{if(confirm("¿Restaurar solo personal y contexto de este negocio y plan?"))try{render(a.restaurar());aviso.textContent="Contexto restaurado.";}catch(e){aviso.textContent=e.message;}};
 $("#empresa-modulos").replaceChildren(...c.modulos.map(m=>el("li",m.nombre+" — "+({disponible:"Práctica disponible",en_desarrollo:"En desarrollo",otro_plan:"Plan superior",ejemplo:"Vista previa"}[m.estadoEfectivo]))));
 render(a.leer());
}
