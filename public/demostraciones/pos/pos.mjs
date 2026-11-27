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
 let lineas=[],resumen=null;
 const d=store.empresa();$("sucursal").replaceChildren(...d.activas.map(s=>opt("Sucursal "+s,s)));$("sucursal").value=d.sucursal;
 const actor=()=>({sucursal:Number($("sucursal").value),empleado:Number($("empleado").value)});
 function empleados(){const d=store.empresa(),s=Number($("sucursal").value);$("empleado").replaceChildren(...d.personal.flatMap((r,i)=>d.asignaciones[i]===null||d.asignaciones[i]===s?[opt("Empleado "+(i+1)+" · "+r,i)]:[]));}
 empleados();
 $("cliente").replaceChildren(opt("Público general",""),...clientesDemo.map(c=>opt(c.nombre,c.id)));
 $("categoria").replaceChildren(opt("Todas",""),...[...new Set(catalogo.map(p=>p.categoria))].map(c=>opt(c,c)));
 $("metodo").replaceChildren(...Object.entries(metodosCobroDemo).map(([k,v])=>opt(v,k)));
 $("referencia").replaceChildren(...Array.from({length:60},(_,i)=>{const s="DEMO-"+String(100001+i);return opt(s,s);}));
 const aviso=t=>$("aviso").textContent=t;
 function boton(t,fn){const b=el("button",t);b.type="button";b.onclick=fn;return b;}
 function renderCatalogo(){
  $("productos").replaceChildren(...filtrarCatalogo({...e,catalogo},{busqueda:$("buscar").value,categoria:$("categoria").value}).map(p=>{
   const c=el("article");if(imagenOfertaSegura(p.imagen)){const im=el("img");im.src=p.imagen;im.alt="";im.loading="lazy";im.onerror=()=>im.remove();c.append(im);}
   c.append(el("strong",p.nombre),el("span",importe(p.precioCentavos)));
   const o=opcionesComal(id,p,catalogo),ins=[],extras=[];let variante=null;
   if(o){const det=el("details"),sum=el("summary","Personalizar");det.append(sum);
    if(o.requiereVariante){variante=el("select");variante.setAttribute("aria-label",o.etiqueta);variante.replaceChildren(...o.variantes.map(v=>opt(v.nombre+" ("+importe(v.centavos)+")",v.id)));det.append(variante);}
    for(const [lista,dest] of [[o.ingredientes,ins],[o.extras,extras]])for(const x of lista){const l=el("label"),ch=el("input");ch.type="checkbox";ch.checked=x.incluido===true;ch.disabled=x.obligatorio===true;l.append(ch,document.createTextNode(x.nombre+(x.centavos?" +"+importe(x.centavos):"")));det.append(l);dest.push({x,ch});}c.append(det);
   }
   const b=boton("Agregar",()=>{try{const opciones=o?normalizarOpciones(id,p,catalogo,{omitir:ins.filter(x=>x.x.incluido&&!x.ch.checked).map(x=>x.x.id),extras:extras.filter(x=>x.ch.checked).map(x=>x.x.id),variante:variante?.value||""}).seleccion:undefined;const l={id:p.id,cantidad:1,...(opciones?{opciones}:{})},prev=lineas.find(x=>claveLinea(x)===claveLinea(l));if(prev){if(prev.cantidad>=20)throw Error("Máximo 20 por partida.");prev.cantidad++;}else{if(lineas.length>=30)throw Error("Máximo 30 partidas.");lineas.push(l);}render();}catch(err){aviso(err.message);}});b.disabled=p.disponible===false;c.append(b);return c;
  }));
 }
 function pago(){const m=$("metodo").value;$("campo-folio").hidden=m==="efectivo"||!resumen?.total;$("recibido").disabled=m!=="efectivo"||!resumen?.total;let n=0;try{n=centavosCobro($("recibido").value);}catch{}$("cambio").textContent="Cambio: "+importe(m==="efectivo"?Math.max(0,n-(resumen?.total??0)):0);}
 function render(){
  const a=store.contexto(actor().sucursal,actor().empleado);$("descuento").disabled=a.rol==="cajero";if(a.rol==="cajero")$("descuento").value=0;
  try{resumen=resumirVenta(id,catalogo,lineas,Number($("descuento").value));}catch(err){resumen=null;aviso(err.message);}
  $("lineas").replaceChildren(...lineas.map((l,i)=>{const row=el("div"),p=catalogo.find(x=>x.id===l.id);row.className="pos-linea";row.append(el("span",resumen?textoLinea(resumen.detalle[i]):p.nombre),boton("−",()=>{if(--l.cantidad===0)lineas.splice(i,1);render();}),el("strong",String(l.cantidad)),boton("+",()=>{if(l.cantidad<20){l.cantidad++;render();}}));return row;}));
  $("subtotal").textContent=importe(resumen?.subtotal??0);$("rebaja").textContent=importe(resumen?.descuentoCentavos??0);$("total").textContent=importe(resumen?.total??0);$("recibido").value=((resumen?.total??0)/100).toFixed(2);$("cobrar").disabled=!resumen||!lineas.length;pago();
 }
 function ticket(v){$("ticket").hidden=false;$("ticket-texto").textContent=[e.nombre,"TICKET FICTICIO · NO FISCAL",v.folio,"Sucursal "+v.sucursal,"Empleado "+(v.empleado+1)+" · "+v.rol,new Date(v.creado).toLocaleString("es-MX"),...v.detalle.map(l=>l.cantidad+" × "+textoLinea(l)+"  "+importe(l.subtotal)),"Subtotal "+importe(v.subtotal),"Descuento "+importe(v.descuentoCentavos),"TOTAL "+importe(v.total),v.estado==="cancelado"?"CANCELADO":v.cobro?metodosCobroDemo[v.cobro.metodo]+" · Cambio "+importe(v.cobro.cambioCentavos):"Sin cargo"].join("\n");}
 function historial(){const a=actor(),rol=store.contexto(a.sucursal,a.empleado).rol;$("historial").replaceChildren(...store.leer(a).map(v=>{const row=el("article");row.className="pos-historial";row.append(el("strong",v.folio+" · "+importe(v.total)+" · "+v.estado),boton("Ver ticket",()=>ticket(v)));if(v.estado==="vendido"&&rol!=="cajero"){const m=el("select");m.setAttribute("aria-label","Motivo de cancelación");m.replaceChildren(...motivosAnulacion.map(x=>opt(x,x)));row.append(m,boton("Cancelar",()=>{if(confirm("¿Cancelar venta ficticia? No devuelve dinero real."))try{ticket(store.cancelar(v.folio,a.sucursal,a.empleado,m.value));historial();}catch(err){aviso(err.message);}}));}return row;}));}
 $("sucursal").onchange=()=>{lineas=[];$("ticket").hidden=true;empleados();render();historial();};$("empleado").onchange=()=>{render();historial();};$("buscar").oninput=renderCatalogo;$("categoria").onchange=renderCatalogo;$("descuento").oninput=render;$("metodo").onchange=pago;$("recibido").oninput=pago;$("vaciar").onclick=()=>{lineas=[];render();};
 $("cobrar").onclick=()=>{try{if(!resumen)throw Error("Revisa la venta.");const metodo=$("metodo").value,v=store.vender(catalogo,lineas,{...actor(),cliente:$("cliente").value,descuento:Number($("descuento").value),totalEsperado:resumen.total,metodo,recibidoCentavos:resumen.total===0?0:metodo==="efectivo"?centavosCobro($("recibido").value):resumen.total,referencia:$("referencia").value});lineas=[];render();ticket(v);historial();aviso("Venta ficticia registrada.");}catch(err){aviso(err.message);}};
 $("imprimir").onclick=()=>window.print();renderCatalogo();render();historial();$("contenido").hidden=false;
}catch(err){$("aviso").textContent=err.message;}
