import {importe} from "../config.mjs";
import {centavosCobro,metodosCobroDemo} from "../cobros-practica.mjs";
import {dividirImporte} from "../pagos-multiples.mjs";
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function panelPagosMultiples(c,datos,{enviar,cerrar}){
 const panel=el("section");panel.className="pagos-multiples";
 const {plan,resumen}=datos;
 panel.append(el("h4","Pagos múltiples · práctica"),el("p","Consumo: "+importe(resumen.consumoCentavos)),el("p","Abonado: "+importe(resumen.abonadoCentavos)+" · Propinas: "+importe(resumen.propinaCentavos)),el("strong","Saldo: "+importe(resumen.saldoCentavos)));
 const lista=el("ul");for(const m of plan.movimientos)lista.append(el("li",metodosCobroDemo[m.metodo]+" · Consumo "+importe(m.consumoCentavos)+" · Propina "+importe(m.propinaCentavos)+" · Recibido "+importe(m.recibidoCentavos)+" · Cambio "+importe(m.cambioCentavos)+(m.referencia?" · "+m.referencia:"")));panel.append(lista);
 if(c.cerrado!==null)return panel;
 const aviso=el("p");aviso.setAttribute("role","status");
 if(resumen.liquidada&&plan.revision>0){const b=el("button","Cerrar cuenta liquidada");b.className="principal";b.addEventListener("click",()=>{if(confirm("¿Cerrar la cuenta y liberar la mesa?"))cerrar(plan.revision);});panel.append(b);return panel;}
 if(!resumen.saldoCentavos)return panel;
 const form=el("form"),metodo=el("select"),abono=el("input"),propina=el("input"),recibido=el("input"),folio=el("input"),partes=el("input"),dividir=el("button","Dividir saldo en partes iguales"),enviarBtn=el("button","Registrar abono ficticio");
 function campo(t,n){const l=el("label",t);l.append(n);form.append(l);return l;}
 for(const [k,v] of Object.entries(metodosCobroDemo)){const o=el("option",v);o.value=k;metodo.append(o);}
 for(const n of [abono,propina,recibido]){n.inputMode="decimal";n.maxLength=10;n.required=true;}
 abono.value=(resumen.saldoCentavos/100).toFixed(2);propina.value="0.00";recibido.value=abono.value;
 partes.type="number";partes.min="1";partes.max="100";partes.value=String(c.personas||1);
 dividir.type="button";enviarBtn.type="submit";enviarBtn.className="principal";folio.maxLength=11;folio.placeholder="DEMO-123456";
 campo("Método",metodo);campo("Abono al consumo (MXN)",abono);campo("Propina voluntaria (MXN)",propina);campo("Importe recibido (MXN)",recibido);const lf=campo("Folio ficticio",folio);campo("Personas para dividir el saldo restante",partes);form.append(dividir,aviso,enviarBtn);
 const cambio=()=>{const efectivo=metodo.value==="efectivo";lf.hidden=efectivo;folio.required=!efectivo;try{const total=centavosCobro(abono.value)+centavosCobro(propina.value);if(!efectivo)recibido.value=(total/100).toFixed(2);recibido.readOnly=!efectivo;const dif=centavosCobro(recibido.value)-total;aviso.textContent=dif<0?"Faltan "+importe(-dif):"Cambio: "+importe(dif);}catch(e){aviso.textContent=e.message;}};
 for(const n of [metodo,abono,propina,recibido])n.addEventListener("input",cambio);
 dividir.addEventListener("click",()=>{try{const a=dividirImporte(resumen.saldoCentavos,Number(partes.value));abono.value=(a[0]/100).toFixed(2);recibido.value=((a[0]+centavosCobro(propina.value))/100).toFixed(2);cambio();aviso.textContent="Partes: "+a.map(x=>importe(x)).join(" / ");}catch(e){aviso.textContent=e.message;}});
 form.addEventListener("submit",e=>{e.preventDefault();try{const consumoCentavos=centavosCobro(abono.value),propinaCentavos=centavosCobro(propina.value),recibidoCentavos=centavosCobro(recibido.value);if(consumoCentavos<=0||consumoCentavos>resumen.saldoCentavos||recibidoCentavos<consumoCentavos+propinaCentavos)throw Error("Revisa el abono y el importe recibido.");if(!confirm("¿Registrar este abono ficticio?"))return;enviar({id:crypto.randomUUID(),revision:plan.revision,metodo:metodo.value,consumoCentavos,propinaCentavos,recibidoCentavos,referencia:folio.value.trim()});}catch(e){aviso.textContent=e.message;}});
 cambio();panel.append(form);return panel;
}
