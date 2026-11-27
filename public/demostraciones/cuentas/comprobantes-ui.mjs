import {importe} from "../config.mjs";
import {metodosCobroDemo} from "../cobros-practica.mjs";
import {movimientosActivos} from "../pagos-multiples.mjs";
const el=(t,s)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;return n;};
export function imprimirComprobante(c,datos,comensal=null){
 const {plan,resumen}=datos,sub=comensal===null?null:datos.subcuentas.find(s=>s.comensal===comensal);
 if(comensal!==null&&!sub)return;
 const w=window.open("","_blank");if(!w){alert("Permite ventanas emergentes para imprimir.");return;}
 w.opener=null;
 const doc=w.document;doc.title="Comprobante de práctica";
 const style=doc.createElement("style");style.textContent="body{font:13px monospace;max-width:76mm;margin:16px auto;color:#111}h1{font-size:18px}p{overflow-wrap:anywhere}hr{border:0;border-top:1px dashed}button{padding:8px}@media print{button{display:none}body{margin:0 auto}}";doc.head.append(style);
 const add=(t,s)=>{const n=doc.createElement(t);n.textContent=s;doc.body.append(n);};
 add("h1","TAQUERÍA EL COMAL");add("p","COMPROBANTE DE PRÁCTICA · NO FISCAL");add("p","Mesa "+c.mesa+(sub?" · Comensal "+comensal:" · Cuenta general"));add("p","Cuenta "+c.cuenta_id+" · Revisión "+plan.revision);add("p",new Date().toLocaleString("es-MX"));add("hr","");
 if(sub){for(const p of plan.division.detalle){const x=p.partes.find(x=>x.comensal===comensal);if(x)add("p",p.nombre+" · "+importe(x.importeCentavos));}}
 else for(const p of datos.partidas||[])add("p",p.nombre+" · "+importe(p.precioCentavos));
 add("hr","");add("p","Consumo: "+importe(sub?sub.total:resumen.consumoCentavos));add("p","Abonado: "+importe(sub?sub.abonado:resumen.abonadoCentavos));add("p","Propina: "+importe(sub?sub.propina:resumen.propinaCentavos));add("p","Saldo: "+importe(sub?sub.saldo:resumen.saldoCentavos));
 for(const m of movimientosActivos(plan).filter(m=>!sub||m.comensal===comensal))add("p",metodosCobroDemo[m.metodo]+" · "+importe(m.consumoCentavos+m.propinaCentavos)+(m.referencia?" · "+m.referencia:""));
 for(const a of plan.anulaciones||[]){const m=plan.movimientos.find(m=>m.id===a.movimiento);if(m&&(!sub||m.comensal===comensal))add("p","ANULADO · "+importe(m.consumoCentavos+m.propinaCentavos)+" · "+a.motivo);}
 add("p","No acredita pago bancario ni sustituye factura.");const b=doc.createElement("button");b.textContent="Imprimir";b.onclick=()=>w.print();doc.body.append(b);
}
export function panelReasignacion(c,datos,enviar){
 const {plan,partidas,personas}=datos,box=el("details");box.append(el("summary","Corregir asignaciones"));
 if(partidas.length>200){box.append(el("p","Límite visual: 200 unidades."));return box;}
 const protegidos=new Set(movimientosActivos(plan).map(m=>m.comensal)),map=new Map(plan.division.detalle.map(p=>[p.id,new Set(p.partes.map(x=>x.comensal))]));
 box.append(el("p","Las partidas vinculadas a comensales con pagos activos se bloquean. Anula el registro correspondiente para corregirlas."));
 for(const p of partidas){const f=el("fieldset");f.append(el("legend",p.nombre+" · "+importe(p.precioCentavos)));const a=map.get(p.id);const bloqueada=[...a].some(i=>protegidos.has(i));for(let i=1;i<=personas;i++){const l=el("label","C"+i),ch=el("input");ch.type="checkbox";ch.style.width="auto";ch.checked=a.has(i);ch.disabled=bloqueada||protegidos.has(i);ch.onchange=()=>{if(ch.checked)a.add(i);else a.delete(i);};l.append(ch);f.append(l);}box.append(f);}
 const motivo=el("select");for(const t of ["Asignación incorrecta","Cambio de comensal","Producto compartido"]){const o=el("option",t);o.value=t;motivo.append(o);}motivo.setAttribute("aria-label","Motivo de reasignación");const b=el("button","Guardar reasignación");b.type="button";b.onclick=()=>{if([...map.values()].some(a=>!a.size)){alert("Asigna todas las partidas.");return;}if(confirm("¿Guardar la corrección de asignaciones?"))enviar({accion:"reasignar",id:crypto.randomUUID(),revision:plan.revision,motivo:motivo.value,asignaciones:[...map].map(([id,a])=>({id,personas:[...a]}))});};box.append(motivo,b);return box;
}
