import {comprobanteCorte} from "../comprobantes-practica.mjs";
import {montarComprobante} from "../comprobantes-ui.mjs";
import {crearPosPractica,motivosCaja} from "../pos-practica.mjs";
import {centavosCobro} from "../cobros-practica.mjs";
import {obtenerEstablecimiento} from "../establecimientos.mjs";
import {importe} from "../config.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
const $=id=>document.getElementById(id),el=(tag,t)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;return e;},opt=(t,v)=>new Option(t,v);
const q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan");
try{
 const store=crearPosPractica(sessionStorage,id,plan,{empresaStorage:localStorage}),e=obtenerEstablecimiento(id),d=store.empresa();
 $("titulo").textContent="Caja y cortes · "+e.nombre;$("volver").href=enlacesDemo(id,plan).administracion;
 $("sucursal").replaceChildren(...d.activas.map(s=>opt("Sucursal "+s,s)));$("sucursal").value=d.activas.includes(Number(q.get("sucursal")))?q.get("sucursal"):d.sucursal;
 const actor=()=>[Number($("sucursal").value),Number($("empleado").value)];
 function empleados(){const d=store.empresa(),s=Number($("sucursal").value);$("empleado").replaceChildren(...d.personal.flatMap((r,i)=>d.asignaciones[i]===null||d.asignaciones[i]===s?[opt("Empleado "+(i+1)+" · "+r,i)]:[]));}
 empleados();if([...$("empleado").options].some(o=>o.value===q.get("empleado")))$("empleado").value=q.get("empleado");
 const aviso=t=>$("aviso").textContent=t;
 const campos={fondo:"Fondo inicial",efectivo:"Ventas efectivo",transferencia:"Transferencias",tarjeta_externa:"Tarjeta",ingresos:"Ingresos",retiros:"Retiros",totalVentas:"Ventas netas",esperado:"Efectivo esperado"};
 const recibo=montarComprobante($("corte-texto"),id,plan);
 let actual=null;
 function motivos(){$("motivo").replaceChildren(...motivosCaja[$("tipo").value].map(m=>opt(m,m)));}
 function diferencia(){try{$("diferencia").textContent=actual?"Diferencia: "+importe(centavosCobro($("contado").value)-actual.resumen.esperado):"";}catch{$("diferencia").textContent="Introduce el efectivo contado.";}}
 function corte(t){$("corte").hidden=false;recibo.mostrar(comprobanteCorte(t));}
 function render(){
  const a=actor(),ctx=store.contexto(...a),ts=store.consultarCaja(...a);actual=ts.find(t=>t.estado==="abierto")??null;
  $("pos").href="../pos/?"+new URLSearchParams({negocio:id,plan,sucursal:a[0],empleado:a[1]});
  $("apertura").hidden=!!actual;$("activo").hidden=!actual;
  if(actual){$("turno").textContent=actual.id+" · Empleado "+(actual.empleado+1);$("movimientos").hidden=ctx.rol==="cajero";$("cerrar").disabled=ctx.rol==="cajero"&&actual.empleado!==a[1];$("totales").replaceChildren(...Object.entries(campos).map(([k,n])=>{const div=el("div");div.append(el("span",n),el("strong",importe(actual.resumen[k])));return div;}));$("lista-movimientos").replaceChildren(...actual.movimientos.map(m=>el("p",m.tipo+" · "+m.motivo+" · "+importe(m.importe))));diferencia();}
  $("historial").replaceChildren(...ts.filter(t=>t.estado==="cerrado").map(t=>{const div=el("div"),b=el("button","Ver corte");b.type="button";b.onclick=()=>corte(t);div.append(el("p",t.id+" · "+importe(t.resumen.totalVentas)+" · Diferencia "+importe(t.cierre.diferencia)),b);return div;}));
 }
 function hacer(fn){try{fn();render();aviso("Operación ficticia registrada.");}catch(e){aviso(e.message);}}
 $("sucursal").onchange=()=>{empleados();$("corte").hidden=true;$("contado").value="";render();};$("empleado").onchange=render;$("tipo").onchange=motivos;$("contado").oninput=diferencia;
 $("abrir").onclick=()=>hacer(()=>store.abrir(...actor(),centavosCobro($("fondo").value)));
 $("mover").onclick=()=>hacer(()=>{store.mover(...actor(),$("tipo").value,centavosCobro($("importe").value),$("motivo").value);$("importe").value="";});
 $("cerrar").onclick=()=>{if(confirm("¿Cerrar turno ficticio? No podrá modificarse después."))hacer(()=>{const t=store.cerrar(...actor(),centavosCobro($("contado").value));corte({...t,resumen:t.cierre.resumen});$("contado").value="";});};
 motivos();render();$("contenido").hidden=false;
}catch(e){$("aviso").textContent=e.message;}
