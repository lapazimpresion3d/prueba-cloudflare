import {crearTerminalSimulada} from "../terminal-simulada.mjs";
import {importe} from "../config.mjs";
// La aprobación es explícitamente ficticia. No representa autorización bancaria.
export function abrirPointSimulado(d,enviar){
 const terminal=crearTerminalSimulada(),total=d.consumoCentavos+d.propinaCentavos;
 terminal.solicitar({id:d.id,importeCentavos:total});
 const dialog=document.createElement("dialog");
 dialog.className="point-simulado";dialog.setAttribute("aria-label","Terminal Point simulada");
 const add=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;dialog.append(n);return n;};
 add("h3","Mercado Pago Point · simulación");add("p","Sin conexión bancaria. No acerques ninguna tarjeta.");
 add("strong",importe(total));const status=add("p","Esperando resultado simulado");status.setAttribute("role","status");
 function finalizar(estado){const op=terminal.resolver(d.id,estado);dialog.close();if(op.estado==="aprobado")enviar({...d,metodo:"tarjeta_externa",terminal:{proveedor:terminal.proveedor,estado:op.estado,id:op.id,importeCentavos:op.importeCentavos}});}
 for(const [titulo,estado] of [["Simular aprobación","aprobado"],["Simular rechazo","rechazado"],["Cancelar","cancelado"]]){const b=add("button",titulo);b.type="button";b.onclick=()=>finalizar(estado);}
 dialog.addEventListener("cancel",e=>{e.preventDefault();finalizar("cancelado");});
 dialog.addEventListener("close",()=>dialog.remove(),{once:true});
 document.body.append(dialog);dialog.showModal();
}
