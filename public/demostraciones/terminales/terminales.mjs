import {admiteCuentas} from "../cuentas-practica.mjs";
import {importe} from "../config.mjs";
const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),negocio=q.get("negocio"),plan=q.get("plan"),query=new URLSearchParams({negocio,plan});
const el=(t,s)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;return n;};
const aviso=s=>$("aviso").textContent=s;let ocupado=false;
$("cuentas").href="../cuentas/?"+query;
async function api(method="GET",d){const r=await fetch("/api/demo/terminales?"+query,{method,credentials:"same-origin",cache:"no-store",...(d?{headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}:{})});const v=await r.json();if(!r.ok)throw Error(v.error||"No se pudo consultar.");return v;}
async function cargar(){const v=await api();$("form").hidden=false;
 $("terminales").replaceChildren(...v.terminales.map(t=>{
 const c=el("article");c.className="cuenta-mesa";c.append(el("h3",t.nombre),el("p",t.proveedor+" · "+t.estado));
 const nombre=el("input");nombre.value=t.nombre;nombre.maxLength=80;nombre.setAttribute("aria-label","Nombre de terminal");
 const guardar=el("button","Guardar nombre"),conectar=el("button",t.conectada?"Desconectar":"Conectar");guardar.disabled=conectar.disabled=t.estado==="ocupada";
 guardar.onclick=()=>operar(()=>api("POST",{accion:"configurar",terminal_id:t.terminal_id,nombre:nombre.value,proveedor:t.proveedor,conectada:t.conectada}));
 conectar.onclick=()=>operar(()=>api("POST",{accion:"configurar",terminal_id:t.terminal_id,nombre:t.nombre,proveedor:t.proveedor,conectada:t.conectada?0:1}));
 c.append(nombre,guardar,conectar);return c;}));
 $("operaciones").replaceChildren(...v.operaciones.map(o=>{const c=el("article");c.className="cuenta-mesa";c.append(el("h3",o.estado+" · "+importe(o.importe_centavos)),el("p","Operación: "+o.operacion_id),el("p","Cuenta: "+o.cuenta_id),el("p","Terminal: "+o.terminal_id),el("p",new Date(o.creado).toLocaleString("es-MX")),el("p",o.conciliada?"Abono activo localizado":o.registrado?"Abono histórico anulado":o.estado==="aprobado"?"Aprobación pendiente de conciliación":"Sin abono activo conciliado"));
 if(o.estado==="aprobado"&&!o.registrado&&o.recuperable){const b=el("button","Recuperar abono");b.onclick=()=>operar(()=>api("PATCH",{accion:"conciliar",operacion_id:o.operacion_id}));c.append(b);}
 if(o.estado==="pendiente"&&o.recuperable){const b=el("button","Simular aprobación");b.onclick=()=>{if(confirm("¿Aprobar solicitud ficticia?"))operar(()=>api("PATCH",{accion:"resolver",operacion_id:o.operacion_id,estado:"aprobado"}));};c.append(b);}
 if(o.estado==="pendiente"){const b=el("button","Cancelar solicitud ficticia");b.onclick=()=>{if(confirm("¿Cancelar esta solicitud de práctica?"))operar(()=>api("PATCH",{accion:"resolver",operacion_id:o.operacion_id,estado:"cancelado"}));};c.append(b);}return c;}));
 if(!v.operaciones.length)$("operaciones").append(el("p","Sin operaciones registradas."));
 const log=el("article");log.className="cuenta-mesa";log.append(el("h3","Historial de incidencias"));for(const i of v.incidencias||[])log.append(el("p",new Date(i.fecha).toLocaleString("es-MX")+" · "+i.codigo+" · "+i.operacion_id));if(!v.incidencias?.length)log.append(el("p","Sin incidencias registradas."));$("operaciones").append(log);
}
async function operar(fn){if(ocupado)return;ocupado=true;try{await fn();await cargar();aviso("Estado actualizado.");}catch(e){aviso(e.message+" Actualiza o regresa a Cuentas para activar la sesión.");}finally{ocupado=false;}}
if(admiteCuentas(negocio,plan)){$("form").onsubmit=e=>{e.preventDefault();operar(async()=>{await api("POST",{accion:"configurar",terminal_id:crypto.randomUUID(),nombre:$("nombre").value,proveedor:$("proveedor").value,conectada:1});$("nombre").value="";});};$("actualizar").onclick=()=>operar(async()=>{});operar(async()=>{});}else{aviso("Terminales no incluidas en este plan.");$("actualizar").disabled=true;}
