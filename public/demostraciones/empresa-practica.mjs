import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {planes,capacidades} from "./config.mjs";
import {planesRepresentativos,enlacesDemo} from "./presentaciones.mjs";
const limites=Object.freeze({p1:[1,1],p2:[3,1],p3:[5,2],p4:[10,3]});
const roles=["propietario","administrador","encargado","cajero"];
export function contextoEmpresa(id,plan){
 const negocio=obtenerEstablecimiento(id), paquete=planes.find(p=>p.id===plan);
 if(!negocio||!paquete)throw Error("Contexto inválido.");
 return {negocio,paquete,usuarios:limites[plan][0],sucursales:limites[plan][1],modulos:capacidades(negocio,plan),clave:"lapaz:empresa:practica:v1:"+id+":"+plan};
}
const inicial=()=>({sucursal:1,personal:["propietario"]});
function validar(c,d){
 if(!d||!Number.isInteger(d.sucursal)||d.sucursal<1||d.sucursal>c.sucursales||!Array.isArray(d.personal)||d.personal.length<1||d.personal.length>c.usuarios||d.personal[0]!=="propietario"||d.personal.slice(1).some(r=>!roles.slice(1).includes(r)))throw Error("Configuración de práctica inválida.");
 return {sucursal:d.sucursal,personal:[...d.personal]};
}
export function almacenEmpresa(c,storage){
 return {
 leer(){try{const s=storage?.getItem(c.clave);return s?validar(c,JSON.parse(s)):inicial();}catch{return inicial();}},
 guardar(d){const v=validar(c,d);if(!storage)throw Error("Almacenamiento no disponible.");storage.setItem(c.clave,JSON.stringify(v));return v;},
 restaurar(){if(!storage)throw Error("Almacenamiento no disponible.");storage.removeItem(c.clave);return inicial();}
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
 sucursal.replaceChildren(...Array.from({length:c.sucursales},(_,i)=>option(i?"Sucursal ficticia "+(i+1):"Sucursal principal",String(i+1))));
 rol.replaceChildren(...roles.slice(1).map(r=>option(r,r)));
 $("#empresa-limites").textContent=c.paquete.nombre+" · Hasta "+c.usuarios+" usuarios y "+c.sucursales+" sucursales (límites propuestos)";
 function render(d){
  sucursal.value=String(d.sucursal);
  $("#empresa-personal").replaceChildren(...d.personal.map((r,i)=>{const li=el("li","Empleado ficticio "+(i+1)+" · "+r);if(i){const b=el("button","Quitar");b.type="button";b.onclick=()=>cambiar({...d,personal:d.personal.filter((_,j)=>j!==i)});li.append(" ",b);}return li;}));
  $("#empresa-agregar").disabled=d.personal.length>=c.usuarios;
 }
 function cambiar(d){try{render(a.guardar(d));aviso.textContent="Cambio guardado en este navegador.";}catch(e){render(a.leer());aviso.textContent=e.message;}}
 sucursal.onchange=()=>cambiar({...a.leer(),sucursal:Number(sucursal.value)});
 $("#empresa-agregar").onclick=()=>{const d=a.leer();cambiar({...d,personal:[...d.personal,rol.value]});};
 $("#empresa-restaurar").onclick=()=>{if(confirm("¿Restaurar solo personal y contexto de este negocio y plan?"))try{render(a.restaurar());aviso.textContent="Contexto restaurado.";}catch(e){aviso.textContent=e.message;}};
 $("#empresa-modulos").replaceChildren(...c.modulos.map(m=>el("li",m.nombre+" — "+({disponible:"Práctica disponible",en_desarrollo:"En desarrollo",otro_plan:"Plan superior",ejemplo:"Vista previa"}[m.estadoEfectivo]))));
 render(a.leer());
}
