import {filtrarAuditoria,csvAuditoria} from "./auditoria-practica.mjs";
const el=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n;};
export function montarHistorial(root,rows,{nombre="Negocio de ejemplo"}={}){
 root.replaceChildren();root.append(el("h2",nombre),el("p","Historial de práctica local, manipulable y no sincronizado. No es una auditoría de seguridad. Últimos 500 eventos disponibles. No incluye todos los módulos."));
 const f=el("div");f.className="inv-filtros";const filtros={},cont=el("section"),res=el("p");res.setAttribute("role","status");
 const opciones=(k)=>[...new Set(rows.map(r=>String(r[k]??"global")))].sort();
 for(const [k,label,tipo,opts] of [["texto","Buscar","search"],["modulo","Módulo",null,opciones("modulo")],["actor","Actor",null,opciones("actor")],["sucursal","Sucursal",null,opciones("sucursal")],["desde","Desde","date"],["hasta","Hasta","date"]]){
 const l=el("label",label),i=el(opts?"select":"input");if(opts){i.append(new Option("Todas / todos",""));for(const o of opts)i.append(new Option(o==="global"?"Global / sin asignar":o,o));}else i.type=tipo;i.addEventListener("input",()=>{filtros[k]=i.value;actualizar();});l.append(i);f.append(l);}
 const exportar=el("button","Exportar CSV filtrado");exportar.type="button";f.append(exportar);root.append(f,res,cont);
 let visibles=[];function actualizar(){visibles=filtrarAuditoria(rows,filtros);res.textContent=visibles.length+" registros de práctica";cont.replaceChildren();if(!visibles.length)cont.append(el("p","No hay eventos que coincidan."));for(const r of visibles){const d=el("details"),s=el("summary",r.fecha+" · "+r.modulo+" · "+r.objetivo),a=el("pre",JSON.stringify(r.anterior,null,2)??"Sin registro previo"),b=el("pre",JSON.stringify(r.posterior,null,2)??"Sin registro posterior");a.style.whiteSpace=b.style.whiteSpace="pre-wrap";d.append(s,el("p","Actor: "+r.actor+" · Sucursal: "+(r.sucursal??"Global / sin asignar")),el("h3","Anterior"),a,el("h3","Posterior"),b);cont.append(d);}exportar.disabled=!visibles.length;}
 exportar.onclick=()=>{const url=URL.createObjectURL(new Blob([csvAuditoria(visibles)],{type:"text/csv;charset=utf-8"})),a=el("a");a.href=url;a.download="auditoria-practica.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};actualizar();
}
