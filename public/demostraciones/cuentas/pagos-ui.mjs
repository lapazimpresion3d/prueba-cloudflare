import {abrirPointSimulado} from "./point-ui.mjs";
import {imprimirComprobante,panelReasignacion} from "./comprobantes-ui.mjs";
import {calcularAsignacion} from "../division-cuentas.mjs";
import {importe} from "../config.mjs";
import {centavosCobro,metodosCobroDemo} from "../cobros-practica.mjs";
import {dividirImporte,motivosAnulacionMultiple} from "../pagos-multiples.mjs";
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function panelPagosMultiples(c,datos,{enviar,cerrar,anular,reasignar}){
 const panel=el("section");panel.className="pagos-multiples";
 const {plan,resumen}=datos;
 panel.append(el("h4","Pagos múltiples · práctica"),el("p","Consumo: "+importe(resumen.consumoCentavos)),el("p","Abonado: "+importe(resumen.abonadoCentavos)+" · Propinas: "+importe(resumen.propinaCentavos)),el("strong","Saldo: "+importe(resumen.saldoCentavos)));
 const lista=el("ul");for(const m of plan.movimientos){const item=el("li",(m.comensal?"Comensal "+m.comensal+" · ":"")+(m.terminal?.proveedor==="point_simulado"?"Point simulado":metodosCobroDemo[m.metodo])+" · Consumo "+importe(m.consumoCentavos)+" · Propina "+importe(m.propinaCentavos)+" · Recibido "+importe(m.recibidoCentavos)+" · Cambio "+importe(m.cambioCentavos)+(m.referencia?" · "+m.referencia:""));const a=(plan.anulaciones||[]).find(x=>x.movimiento===m.id);if(a){item.append(el("p","ANULADO · "+a.motivo+" · "+new Date(a.fecha).toLocaleString("es-MX")));}else if(c.cerrado===null){const motivo=el("select"),b=el("button","Anular registro");const inicial=el("option","Selecciona motivo");inicial.value="";motivo.append(inicial);for(const t of motivosAnulacionMultiple){const o=el("option",t);o.value=t;motivo.append(o);}motivo.setAttribute("aria-label","Motivo de anulación");b.type="button";b.addEventListener("click",()=>{if(!motivo.value){motivo.reportValidity();return;}if(confirm("¿Anular este registro ficticio? No implica devolución bancaria."))anular({accion:"anular",id:crypto.randomUUID(),movimiento:m.id,motivo:motivo.value,revision:plan.revision});});motivo.required=true;item.append(motivo,b);}lista.append(item);}panel.append(lista);
 if(plan.division){
  for(const s of datos.subcuentas||[]){
   panel.append(el("p","Comensal "+s.comensal+" · Consumo "+importe(s.total)+" · Saldo "+importe(s.saldo)+" · Propina "+importe(s.propina)+(s.liquidada?" · Liquidado":"")));
   const items=el("ul");for(const p of plan.division.detalle){const parte=p.partes.find(x=>x.comensal===s.comensal);if(parte)items.append(el("li",p.nombre+" · "+importe(parte.importeCentavos)+(s.liquidada?" · Pagado":" · Asignado")));}panel.append(items);
  }
 }
 if(plan.revision>0){
 const ticket=el("button","Comprobante general");ticket.type="button";ticket.onclick=()=>imprimirComprobante(c,datos);panel.append(ticket);
 for(const s of datos.subcuentas||[]){const b=el("button","Comprobante comensal "+s.comensal);b.type="button";b.onclick=()=>imprimirComprobante(c,datos,s.comensal);panel.append(b);}
 }
 if(plan.reasignaciones?.length){const h=el("details");h.append(el("summary","Historial de reasignaciones"));for(const r of plan.reasignaciones)h.append(el("p",new Date(r.fecha).toLocaleString("es-MX")+" · "+r.motivo+" · Antes: "+r.anterior.totales.map(x=>importe(x)).join(" / ")+" · Después: "+r.nueva.totales.map(x=>importe(x)).join(" / ")));panel.append(h);}
 if(c.cerrado===null&&plan.division)panel.append(panelReasignacion(c,datos,reasignar));
 if(c.cerrado!==null)return panel;
 const aviso=el("p");aviso.setAttribute("role","status");
 if(resumen.liquidada&&plan.revision>0){const b=el("button","Cerrar cuenta liquidada");b.className="principal";b.addEventListener("click",()=>{if(confirm("¿Cerrar la cuenta y liberar la mesa?"))cerrar(plan.revision);});panel.append(b);return panel;}
 if(!resumen.saldoCentavos)return panel;
 const form=el("form"),metodo=el("select"),abono=el("input"),propina=el("input"),recibido=el("input"),folio=el("input"),partes=el("input"),dividir=el("button","Dividir saldo en partes iguales"),enviarBtn=el("button","Registrar abono ficticio");
 function campo(t,n){const l=el("label",t);l.append(n);form.append(l);return l;}
 for(const [k,v] of Object.entries(metodosCobroDemo)){const o=el("option",v);o.value=k;metodo.append(o);}
 const point=el("option","Mercado Pago Point · simulación");point.value="point_simulado";metodo.append(point);
 for(const n of [abono,propina,recibido]){n.inputMode="decimal";n.maxLength=10;n.required=true;}
 abono.value=(resumen.saldoCentavos/100).toFixed(2);propina.value="0.00";recibido.value=abono.value;
 partes.type="number";partes.min="1";partes.max="100";partes.value=String(c.personas||1);
 dividir.type="button";enviarBtn.type="submit";enviarBtn.className="principal";folio.maxLength=11;folio.placeholder="DEMO-123456";
 const selector=el("select"),modo=el("select"),asignador=el("div"),asignaciones=new Map();
 const opcion=(v,t)=>{const o=el("option",t);o.value=v;return o;};
 modo.append(opcion("libre","Importe libre"),opcion("productos","Por productos"));
 if(!plan.division&&plan.revision===0&&datos.partidas?.length){campo("Modalidad",modo);form.append(asignador);}
 if(plan.division||(!plan.revision&&datos.partidas?.length)){
  for(let i=1;i<=datos.personas;i++)selector.append(opcion(String(i),"Comensal "+i));
  const l=campo("Comensal",selector);l.hidden=!plan.division;
  if(!plan.division&&datos.partidas.length<=200){
   for(const p of datos.partidas){const fila=el("fieldset");fila.append(el("legend",p.nombre+" · "+importe(p.precioCentavos)));for(let i=1;i<=datos.personas;i++){const ch=el("input"),lab=el("label","C"+i);ch.type="checkbox";ch.style.width="auto";lab.append(ch);fila.append(lab);ch.addEventListener("change",()=>{const a=asignaciones.get(p.id)||new Set();if(ch.checked)a.add(i);else a.delete(i);asignaciones.set(p.id,a);actualizarIndividual();});}asignador.append(fila);}
  }else if(!plan.division){modo.options[1].disabled=true;asignador.append(el("p","División visual limitada a 200 unidades."));}
  modo.addEventListener("change",()=>{l.hidden=modo.value!=="productos";asignador.hidden=modo.value!=="productos";actualizarIndividual();});
  selector.addEventListener("change",()=>actualizarIndividual());
 }
 function listaAsignaciones(){return [...asignaciones].filter(([,a])=>a.size).map(([id,a])=>({id,personas:[...a].sort((x,y)=>x-y)}));}
 function actualizarIndividual(){try{
  if(!plan.division&&modo.value!=="productos")return;
  const n=Number(selector.value),saldo=plan.division?datos.subcuentas.find(s=>s.comensal===n).saldo:calcularAsignacion(datos.partidas,listaAsignaciones(),datos.personas).totales[n-1];
  abono.value=(saldo/100).toFixed(2);recibido.value=((saldo+centavosCobro(propina.value))/100).toFixed(2);cambio();
 }catch(e){aviso.textContent=e.message;}}
 asignador.hidden=true;
 campo("Método",metodo);campo("Abono al consumo (MXN)",abono);campo("Propina voluntaria (MXN)",propina);campo("Importe recibido (MXN)",recibido);const lf=campo("Folio ficticio",folio);campo("Personas para dividir el saldo restante",partes);form.append(dividir,aviso,enviarBtn);
 const cambio=()=>{enviarBtn.textContent=metodo.value==="point_simulado"?"Enviar a Point simulado":"Registrar abono ficticio";const efectivo=metodo.value==="efectivo";lf.hidden=efectivo;folio.required=!efectivo;try{const total=centavosCobro(abono.value)+centavosCobro(propina.value);if(!efectivo)recibido.value=(total/100).toFixed(2);recibido.readOnly=!efectivo;const dif=centavosCobro(recibido.value)-total;aviso.textContent=dif<0?"Faltan "+importe(-dif):"Cambio: "+importe(dif);}catch(e){aviso.textContent=e.message;}};
 for(const n of [metodo,abono,propina,recibido])n.addEventListener("input",cambio);
 dividir.addEventListener("click",()=>{try{const a=dividirImporte(resumen.saldoCentavos,Number(partes.value));abono.value=(a[0]/100).toFixed(2);recibido.value=((a[0]+centavosCobro(propina.value))/100).toFixed(2);cambio();aviso.textContent="Partes: "+a.map(x=>importe(x)).join(" / ");}catch(e){aviso.textContent=e.message;}});
 form.addEventListener("submit",e=>{e.preventDefault();try{const consumoCentavos=centavosCobro(abono.value),propinaCentavos=centavosCobro(propina.value),recibidoCentavos=centavosCobro(recibido.value);if(consumoCentavos<=0||consumoCentavos>resumen.saldoCentavos||recibidoCentavos<consumoCentavos+propinaCentavos)throw Error("Revisa el abono y el importe recibido.");const d={id:crypto.randomUUID(),revision:plan.revision,metodo:metodo.value,consumoCentavos,propinaCentavos,recibidoCentavos,referencia:folio.value.trim(),...(plan.division||modo.value==="productos"?{comensal:Number(selector.value),...(!plan.division?{asignaciones:listaAsignaciones()}: {})}:{})};if(metodo.value==="point_simulado"){if(!/^DEMO-[0-9]{6}$/.test(d.referencia))throw Error("Usa un folio ficticio DEMO-123456.");abrirPointSimulado(d,enviar);}else if(confirm("¿Registrar este abono ficticio?"))enviar(d);}catch(e){aviso.textContent=e.message;}});
 if(plan.division){partes.disabled=dividir.disabled=true;actualizarIndividual();}cambio();panel.append(form);return panel;
}
