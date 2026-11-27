import {estadoExistencia} from "../inventario-practica.mjs";
import {comprobanteVenta} from "../comprobantes-practica.mjs";
import {montarComprobante} from "../comprobantes-ui.mjs";
import {admitePos,crearPosPractica,resumirVenta} from "../pos-practica.mjs";
import {obtenerEstablecimiento,filtrarCatalogo} from "../establecimientos.mjs";
import {crearCatalogosLocales,imagenOfertaSegura} from "../catalogo-local.mjs";
import {importe} from "../config.mjs";
import {enlacesDemo} from "../presentaciones.mjs";
import {clientesDemo} from "../clientes-practica.mjs";
import {metodosCobroDemo,centavosCobro,motivosAnulacion} from "../cobros-practica.mjs";
import {normalizarOpciones,opcionesComal,claveLinea,textoLinea} from "../menu-comal-practica.mjs";
const $=id=>document.getElementById(id),el=(tag,t)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;return e;},opt=(t,v)=>new Option(t,v);
const q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan"),e=obtenerEstablecimiento(id);
try{
 if(!admitePos(id,plan))throw Error("Punto de venta disponible en P3 y P4.");
 const store=crearPosPractica(sessionStorage,id,plan,{empresaStorage:localStorage}),catalogo=crearCatalogosLocales(sessionStorage).leer(id);
 $("titulo").textContent="Punto de venta · "+e.nombre;$("volver").href=enlacesDemo(id,plan).administracion;
 const recibo=montarComprobante($("ticket-texto"),id,plan);
 let lineas=[],resumen=null;
 const d=store.empresa();$("sucursal").replaceChildren(...d.activas.map(s=>opt("Sucursal "+s,s)));$("sucursal").value=d.sucursal;
 const actor=()=>({sucursal:Number($("sucursal").value),empleado:Number($("empleado").value)});
 function empleados(){const d=store.empresa(),s=Number($("sucursal").value);$("empleado").replaceChildren(...d.personal.flatMap((r,i)=>d.asignaciones[i]===null||d.asignaciones[i]===s?[opt("Empleado "+(i+1)+" · "+r,i)]:[]));}
 empleados();
 if(d.activas.includes(Number(q.get("sucursal")))){$("sucursal").value=q.get("sucursal");empleados();}if([...$("empleado").options].some(o=>o.value===q.get("empleado")))$("empleado").value=q.get("empleado");
 $("cliente").replaceChildren(opt("Público general",""),...clientesDemo.map(c=>opt(c.nombre,c.id)));
 $("categoria").replaceChildren(opt("Todas",""),...[...new Set(catalogo.map(p=>p.categoria))].map(c=>opt(c,c)));
 $("metodo").replaceChildren(...Object.entries(metodosCobroDemo).map(([k,v])=>opt(v,k)));
 $("referencia").replaceChildren(...Array.from({length:60},(_,i)=>{const s="DEMO-"+String(100001+i);return opt(s,s);}));
 const aviso=t=>$("aviso").textContent=t;
 function boton(t,fn){const b=el("button",t);b.type="button";b.onclick=fn;return b;}
 function renderCatalogo(){
  const stocks=store.consultarInventario(actor().sucursal,actor().empleado).productos;
  $("productos").replaceChildren(...filtrarCatalogo({...e,catalogo},{busqueda:$("buscar").value,categoria:$("categoria").value}).map(p=>{
   const c=el("article");if(imagenOfertaSegura(p.imagen)){const im=el("img");im.src=p.imagen;im.alt="";im.loading="lazy";im.onerror=()=>im.remove();c.append(im);}
   c.append(el("strong",p.nombre),el("span",importe(p.precioCentavos)));const stock=stocks.find(x=>x.id===p.id&&x.activo);if(stock)c.append(el("small",stock.sku+" · "+stock.existencias+" unidades"+(estadoExistencia(stock)==="bajo"?" · Bajo mínimo":stock.existencias===0?" · Agotado":"")));
   const o=opcionesComal(id,p,catalogo),ins=[],extras=[];let variante=null;
   if(o){const det=el("details"),sum=el("summary","Personalizar");det.append(sum);
    if(o.requiereVariante){variante=el("select");variante.setAttribute("aria-label",o.etiqueta);variante.replaceChildren(...o.variantes.map(v=>opt(v.nombre+" ("+importe(v.centavos)+")",v.id)));det.append(variante);}
    for(const [lista,dest] of [[o.ingredientes,ins],[o.extras,extras]])for(const x of lista){const l=el("label"),ch=el("input");ch.type="checkbox";ch.checked=x.incluido===true;ch.disabled=x.obligatorio===true;l.append(ch,document.createTextNode(x.nombre+(x.centavos?" +"+importe(x.centavos):"")));det.append(l);dest.push({x,ch});}c.append(det);
   }
   const b=boton("Agregar",()=>{try{const opciones=o?normalizarOpciones(id,p,catalogo,{omitir:ins.filter(x=>x.x.incluido&&!x.ch.checked).map(x=>x.x.id),extras:extras.filter(x=>x.ch.checked).map(x=>x.x.id),variante:variante?.value||""}).seleccion:undefined;const l={id:p.id,cantidad:1,...(opciones?{opciones}:{})},prev=lineas.find(x=>claveLinea(x)===claveLinea(l));if(prev){if(prev.cantidad>=20)throw Error("Máximo 20 por partida.");prev.cantidad++;}else{if(lineas.length>=30)throw Error("Máximo 30 partidas.");lineas.push(l);}render();}catch(err){aviso(err.message);}});b.disabled=p.disponible===false||stock?.existencias===0;c.append(b);return c;
  }));
 }
 function pago(){const m=$("metodo").value;$("campo-folio").hidden=m==="efectivo"||!resumen?.total;$("recibido").disabled=m!=="efectivo"||!resumen?.total;let n=0;try{n=centavosCobro($("recibido").value);}catch{}$("cambio").textContent="Cambio: "+importe(m==="efectivo"?Math.max(0,n-(resumen?.total??0)):0);}
 function render(){
  const turno=store.consultarCaja(actor().sucursal,actor().empleado).find(t=>t.estado==="abierto");$("estado-turno").textContent=turno?"Turno activo: "+turno.id:"Caja cerrada. Abre un turno antes de vender.";$("abrir-caja").href="../caja/?"+new URLSearchParams({negocio:id,plan,sucursal:actor().sucursal,empleado:actor().empleado});
  $("abrir-inventario").href="../inventario/?"+new URLSearchParams({negocio:id,plan,sucursal:actor().sucursal,empleado:actor().empleado});
  const a=store.contexto(actor().sucursal,actor().empleado);$("descuento").disabled=a.rol==="cajero";if(a.rol==="cajero")$("descuento").value=0;
  try{resumen=resumirVenta(id,catalogo,lineas,Number($("descuento").value));}catch(err){resumen=null;aviso(err.message);}
  $("lineas").replaceChildren(...lineas.map((l,i)=>{const row=el("div"),p=catalogo.find(x=>x.id===l.id);row.className="pos-linea";row.append(el("span",resumen?textoLinea(resumen.detalle[i]):p.nombre),boton("−",()=>{if(--l.cantidad===0)lineas.splice(i,1);render();}),el("strong",String(l.cantidad)),boton("+",()=>{if(l.cantidad<20){l.cantidad++;render();}}));return row;}));
  $("subtotal").textContent=importe(resumen?.subtotal??0);$("rebaja").textContent=importe(resumen?.descuentoCentavos??0);$("total").textContent=importe(resumen?.total??0);$("recibido").value=((resumen?.total??0)/100).toFixed(2);$("cobrar").disabled=!resumen||!lineas.length||!turno||turno.empleado!==a.empleado&&a.rol==="cajero";pago();
 }
 function ticket(v){$("ticket").hidden=false;recibo.mostrar(comprobanteVenta(v));}
 function historial(){const a=actor(),rol=store.contexto(a.sucursal,a.empleado).rol;$("historial").replaceChildren(...store.leer(a).map(v=>{const row=el("article");row.className="pos-historial";row.append(el("strong",v.folio+" · "+importe(v.total)+" · "+v.estado),boton("Ver ticket",()=>ticket(v)));if(v.estado==="vendido"&&rol!=="cajero"&&(!v.turno||store.consultarCaja(a.sucursal,a.empleado).some(t=>t.id===v.turno&&t.estado==="abierto"))){const m=el("select");m.setAttribute("aria-label","Motivo de cancelación");m.replaceChildren(...motivosAnulacion.map(x=>opt(x,x)));row.append(m,boton("Cancelar",()=>{if(confirm("¿Cancelar venta de prueba? No devuelve dinero real."))try{ticket(store.cancelar(v.folio,a.sucursal,a.empleado,m.value));renderCatalogo();historial();}catch(err){aviso(err.message);}}));}return row;}));}
 $("sucursal").onchange=()=>{lineas=[];$("ticket").hidden=true;empleados();renderCatalogo();render();historial();};$("empleado").onchange=()=>{renderCatalogo();render();historial();};$("buscar").oninput=renderCatalogo;$("categoria").onchange=renderCatalogo;$("descuento").oninput=render;$("metodo").onchange=pago;$("recibido").oninput=pago;$("vaciar").onclick=()=>{lineas=[];render();};
 $("cobrar").onclick=()=>{try{if(!resumen)throw Error("Revisa la venta.");const metodo=$("metodo").value,v=store.vender(catalogo,lineas,{...actor(),cliente:$("cliente").value,descuento:Number($("descuento").value),totalEsperado:resumen.total,metodo,recibidoCentavos:resumen.total===0?0:metodo==="efectivo"?centavosCobro($("recibido").value):resumen.total,referencia:$("referencia").value});lineas=[];renderCatalogo();render();ticket(v);historial();aviso("Venta de prueba registrada.");}catch(err){aviso(err.message);}};
 renderCatalogo();render();historial();$("contenido").hidden=false;
}catch(err){$("aviso").textContent=err.message;}
