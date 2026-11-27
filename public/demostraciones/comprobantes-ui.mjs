import {formatosComprobante,identidadComprobante,textoComprobante,archivoComprobante} from "./comprobantes-practica.mjs";
const el=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n;};
export function montarComprobante(root,id,plan){
 const formatos=formatosComprobante(localStorage,id,plan);let c=null,f=formatos.leer();
 const toolbar=el("div");toolbar.className="comprobante-controles";const ancho=el("select");ancho.setAttribute("aria-label","Ancho de papel");for(const n of [58,80])ancho.append(new Option(n+" mm",n));const logo=el("input");logo.type="checkbox";const label=el("label");label.append(logo," Mostrar logotipo");const pie=el("input");pie.maxLength=180;pie.setAttribute("aria-label","Texto de pie");const save=el("button","Guardar formato"),print=el("button","Imprimir / guardar PDF"),download=el("button","Descargar TXT"),status=el("p");status.setAttribute("role","status");for(const b of [save,print,download])b.type="button";toolbar.append(ancho,label,pie,save,print,download,status);
 const paper=el("article");paper.className="comprobante-papel";root.replaceChildren(toolbar,paper);
 const leer=()=>({ancho:Number(ancho.value),logo:logo.checked,pie:pie.value});
 ancho.value=f.ancho;logo.checked=f.logo;pie.value=f.pie;
 function dibujar(){if(!c)return;f=leer();const m=identidadComprobante(id,localStorage);paper.dataset.ancho=String(f.ancho);paper.replaceChildren();if(f.logo&&m.logo){const img=el("img");img.src=m.logo;img.alt="";img.onerror=()=>img.remove();paper.append(img);}paper.append(el("h3",m.nombre),el("p",m.ubicacion),el("p",m.contacto),el("h4",c.tipo),el("p","DEMOSTRACIÓN · SIN VALIDEZ FISCAL"));
 const pares=lista=>{const box=el("dl");for(const [a,b] of lista){box.append(el("dt",a),el("dd",b));}return box;};paper.append(pares(c.datos));if(c.productos.length){const sec=el("section");for(const p of c.productos){const item=el("div");item.append(el("strong",p.nombre),el("p",p.cantidad+" × "+p.unitario+" = "+p.importe));for(const o of p.opciones)item.append(el("p",o));sec.append(item);}paper.append(sec);}paper.append(pares(c.totales),el("p",c.nota),el("p",f.pie));}
 ancho.onchange=logo.onchange=pie.oninput=dibujar;
 save.onclick=()=>{try{f=formatos.guardar(leer());status.textContent="Formato guardado para este negocio y paquete.";}catch(e){status.textContent=e.message;}};
 print.onclick=()=>{if(!c)return;const style=el("style");style.textContent="@page { size: "+leer().ancho+"mm auto; margin: 0; }";document.head.append(style);try{window.print();}finally{style.remove();}};
 download.onclick=()=>{if(!c)return;const blob=new Blob([textoComprobante(c,identidadComprobante(id,localStorage),leer())],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download=archivoComprobante(c);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return {mostrar(v){c=v;dibujar();},limpiar(){c=null;paper.replaceChildren();}};
}
