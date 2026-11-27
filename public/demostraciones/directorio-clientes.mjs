import {clientesDemo} from "./clientes-practica.mjs";
import {contextoEmpresa,almacenEmpresa} from "./empresa-practica.mjs";
import {tienePermiso} from "./permisos-practica.mjs";
export const preferenciasCliente=["Sin preferencia","Productos","Servicios","Promociones","Atención personalizada"];
export const notasCliente=["Sin notas","Solicita información","Dar seguimiento","Cliente frecuente","Prefiere atención programada"];
const copia=x=>JSON.parse(JSON.stringify(x));
export function leerDirectorio(storage,id){const raw=storage.getItem("lapaz:directorio:v1:"+id);if(!raw)return clientesDemo.map(c=>({...c,activo:true,preferencia:preferenciasCliente[0],nota:notasCliente[0]}));if(raw.length>100000)throw Error("Directorio inválido.");const v=JSON.parse(raw);if(!Array.isArray(v)||v.length>100||v.some(x=>!x||typeof x.id!=="string")||new Set(v.map(x=>x.id)).size!==v.length||clientesDemo.some(c=>!v.some(x=>x.id===c.id)))throw Error("Directorio inválido.");
 return v.map((x,i)=>{const base=clientesDemo.find(c=>c.id===x.id);if(!base&&!/^CLI-[a-zA-Z0-9-]{1,80}$/.test(x.id)||typeof x.activo!=="boolean"||!preferenciasCliente.includes(x.preferencia)||!notasCliente.includes(x.nota))throw Error("Directorio inválido.");
 const identidad=base??{id:x.id,nombre:"Cliente de ejemplo "+(i+1),telefono:"000 000 0000",correo:"cliente-"+(i+1)+"@example.invalid"};
 // Never propagate arbitrary stored personal fields or additional properties.
 return {...identidad,activo:x.activo,preferencia:x.preferencia,nota:x.nota};});}
export function crearDirectorio(storage,empresaStorage,id,plan,{folio=()=>crypto.randomUUID()}={}){
 if(!["p2","p3","p4"].includes(plan))throw Error("Clientes incluidos desde P2.");
 const empresa=almacenEmpresa(contextoEmpresa(id,plan),empresaStorage),key="lapaz:directorio:v1:"+id;
 function autorizar(s,e,p){const d=empresa.leer();if(!d.activas.includes(s)||!Number.isInteger(e)||!d.personal[e]||d.asignaciones[e]!==null&&d.asignaciones[e]!==s||!tienePermiso(d,e,p))throw Error("Acceso a clientes no autorizado.");return d.personal[e];}
 function leer(s,e){autorizar(s,e,"clientes.ver");return leerDirectorio(storage,id);}
 function guardar(s,e,cliente,d){autorizar(s,e,"clientes.editar");const v=leerDirectorio(storage,id),prev=v.find(x=>x.id===cliente);if(cliente&&!prev||!preferenciasCliente.includes(d.preferencia)||!notasCliente.includes(d.nota)||typeof d.activo!=="boolean")throw Error("Ficha inválida.");
 // Solo identidades ficticias, sin campos de datos personales libres.
 const nuevoId=prev?.id??"CLI-"+folio();if(!prev&&(!/^CLI-[a-zA-Z0-9-]{1,80}$/.test(nuevoId)||v.some(x=>x.id===nuevoId)||v.length>=100))throw Error("Límite o ID duplicado.");
 const n=prev??{id:nuevoId,nombre:"Cliente de ejemplo "+(v.length+1),telefono:"000 000 0000",correo:"cliente-"+(v.length+1)+"@example.invalid"};
 const x={...n,activo:d.activo,preferencia:d.preferencia,nota:d.nota};storage.setItem(key,JSON.stringify(prev?v.map(y=>y.id===cliente?x:y):[...v,x]));return copia(x);}
 return {leer,guardar,autorizar,empresa:()=>empresa.leer()};
}
export function fichaCliente(c,{ventas=[],cotizaciones=[],pedidos=[],citas=[],reservas=[],ahora=Date.now()}={}){
 const v=ventas.filter(x=>x.cliente===c.id),compras=v.filter(x=>x.estado==="vendido"),cot=cotizaciones.filter(x=>x.cliente===c.id),filtrar=l=>l.filter(x=>x.datosCliente?.cliente?.id===c.id),p=filtrar(pedidos),ci=filtrar(citas),re=filtrar(reservas),fechas=[...compras.map(x=>x.creado),...p.map(x=>x.creado),...ci.map(x=>x.historial?.[0]?.fecha),...re.map(x=>x.historial?.[0]?.fecha)].filter(Number.isFinite),ultima=fechas.length?Math.max(...fechas):null;
 return {...c,ventas:v,cotizaciones:cot,pedidos:p,citas:ci,reservas:re,compras:compras.length,importe:compras.reduce((n,x)=>n+x.total,0),ultima,clasificacion:!c.activo||ultima!==null&&ahora-ultima>90*86400000?"Inactivo":compras.length>=3?"Frecuente":"Nuevo",anticipos:cot.reduce((n,x)=>n+(x.anticipos??[]).filter(y=>!y.anulado).reduce((a,y)=>a+y.importe,0),0),saldoTrabajos:cot.filter(x=>x.orden&&x.orden.estado!=="vendida").reduce((n,x)=>n+x.total-(x.anticipos??[]).filter(y=>!y.anulado).reduce((a,y)=>a+y.importe,0),0)};
}
