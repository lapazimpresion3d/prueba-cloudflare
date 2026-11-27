import {importe} from "../config.mjs";
// Solicitudes persistentes de práctica. Nunca conecta una terminal física.
export function abrirPointSimulado(d,enviar,cuenta){
 const q=new URLSearchParams(location.search),ruta="/api/demo/terminales?"+new URLSearchParams({negocio:q.get("negocio"),plan:q.get("plan")});
 const total=d.consumoCentavos+d.propinaCentavos,dialog=document.createElement("dialog");
 dialog.className="point-simulado";dialog.setAttribute("aria-label","Point simulado");
 const add=(t,s)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;dialog.append(n);return n;};
 add("h3","Mercado Pago Point · simulación");add("p","Sin conexión bancaria ni cargos reales.");add("strong",importe(total));
 const estado=add("p","Consultando terminales…");estado.setAttribute("role","status");
 const selector=add("select");selector.setAttribute("aria-label","Terminal disponible");
 const iniciar=add("button","Enviar solicitud"),aprobar=add("button","Simular aprobación"),rechazar=add("button","Simular rechazo"),cancelar=add("button","Cancelar solicitud"),salir=add("button","Cerrar");
 const botones=[iniciar,aprobar,rechazar,cancelar,salir];for(const b of botones)b.type="button";
 let op=null,ocupado=false,intentada=false;
 const key="lapaz:demo:point:"+cuenta;
 async function api(method="GET",body){const r=await fetch(ruta,{method,credentials:"same-origin",cache:"no-store",...(body?{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{})});const v=await r.json();if(!r.ok)throw Error(v.error||"No se pudo verificar la terminal.");return v;}
 function controles(){iniciar.hidden=!!op;selector.disabled=ocupado||intentada;iniciar.disabled=ocupado||!selector.value;aprobar.hidden=!op||!["pendiente","aprobado"].includes(op.estado);rechazar.hidden=cancelar.hidden=!op||op.estado!=="pendiente";for(const b of [aprobar,rechazar,cancelar,salir])b.disabled=ocupado;}
 async function trabajar(fn){if(ocupado)return;ocupado=true;controles();try{await fn();}catch(e){estado.textContent=e.message+" · No repitas con otro identificador.";}finally{ocupado=false;controles();}}
 const consultar=async()=>{const v=await api();for(const t of v.terminales.filter(t=>t.proveedor==="point_simulado"&&t.estado==="disponible"))selector.append(new Option(t.nombre,t.terminal_id));const guardado=JSON.parse(sessionStorage.getItem(key)||"null");if(guardado){if(guardado.expira!==v.expira){sessionStorage.removeItem(key);}else{d=guardado.d;intentada=true;op=v.operaciones.find(o=>o.operacion_id===d.id&&o.cuenta_id===cuenta)||null;if(!op){selector.replaceChildren(new Option("Terminal de solicitud anterior",guardado.terminal));estado.textContent="Solicitud anterior sin confirmar; reintenta con el mismo ID.";return;}if(op.estado==="aprobado"){estado.textContent="Aprobación anterior localizada. Recupera el abono.";aprobar.hidden=false;aprobar.textContent="Recuperar abono";}else if(op.estado!=="pendiente"){sessionStorage.removeItem(key);estado.textContent="Solicitud anterior "+op.estado;return;}else estado.textContent="Solicitud pendiente recuperada.";return;}}estado.textContent=selector.value?"Selecciona terminal.":"No hay terminal Point disponible. Configúrala en Terminales.";};
 async function abonar(){await api("PATCH",{accion:"conciliar",operacion_id:d.id});sessionStorage.removeItem(key);dialog.close();location.reload();}
 iniciar.onclick=()=>trabajar(async()=>{const v=await api();const guardado=JSON.parse(sessionStorage.getItem(key)||"null");const terminal=guardado?.terminal||selector.value;sessionStorage.setItem(key,JSON.stringify({d,terminal,expira:v.expira}));intentada=true;op=(await api("POST",{accion:"solicitar",operacion_id:d.id,terminal_id:terminal,cuenta_id:cuenta,importe_centavos:d.consumoCentavos+d.propinaCentavos,revision_cuenta:d.revision,pago:{...d,metodo:"tarjeta_externa"}})).operacion;estado.textContent="Solicitud "+op.estado;if(op.estado==="aprobado")await abonar();});
 async function resolver(resultado){if(op.estado==="aprobado"&&resultado==="aprobado"){await abonar();return;}const v=await api("PATCH",{accion:"resolver",operacion_id:op.operacion_id,estado:resultado});op={...op,...v.operacion};estado.textContent="Solicitud "+op.estado;if(op.estado==="aprobado")await abonar();else{sessionStorage.removeItem(key);dialog.close();}}
 aprobar.onclick=()=>trabajar(()=>resolver("aprobado"));rechazar.onclick=()=>trabajar(()=>resolver("rechazado"));cancelar.onclick=()=>trabajar(()=>resolver("cancelado"));salir.onclick=()=>dialog.close();
 dialog.addEventListener("cancel",e=>{if(ocupado)e.preventDefault();});dialog.addEventListener("close",()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
 // Una operación aprobada recuperada necesita botón visible.
 const base=controles;trabajar(consultar).then(()=>{if(op?.estado==="aprobado"){aprobar.hidden=false;aprobar.textContent="Recuperar abono";}});
}
