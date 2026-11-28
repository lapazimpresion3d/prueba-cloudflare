import {crearTurismo,clientes} from "./turismo-practica.mjs";
import {fechaTurismo} from "./turismo-catalogo.mjs";
export function crearEsperaTurismo(storage,plan,hoy){
 if(!["p3","p4"].includes(plan))throw Error("Lista de espera desde P3.");
 const r=crearTurismo(storage,plan,hoy),key="lapaz:turismo:espera:v1:"+plan;
 function leer(){const raw=storage.getItem(key);if(raw===null)return [];if(raw.length>60000)throw Error("Lista inválida.");const d=JSON.parse(raw);if(d.version!==1||d.plan!==plan||!Array.isArray(d.items)||d.items.length>100||new Set(d.items.map(x=>x.id)).size!==d.items.length||d.items.some(x=>!/^LE-[1-9]\d{0,5}$/.test(x.id)||!fechaTurismo(x.fecha)||typeof x.experiencia!=="string"||!Number.isInteger(x.adultos)||x.adultos<1||!Number.isInteger(x.menores)||x.menores<0||x.adultos+x.menores>50||!Number.isInteger(x.cliente)||!clientes[x.cliente]||!["espera","retirada","promovida"].includes(x.estado)))throw Error("Lista inválida.");return d.items;}
 const guardar=items=>storage.setItem(key,JSON.stringify({version:1,plan,items}));
 function agregar(d){const l=leer();if(l.length>=100||!r.agenda.consultar(d.experiencia,d.fecha)||!Number.isInteger(d.cliente)||!clientes[d.cliente])throw Error("Solicitud inválida.");const c=r.cotizar(d.experiencia,d.adultos,d.menores,d.fecha);if(r.disponibles(d.experiencia,d.fecha)>=c.pasajeros)throw Error("Hay cupo; registra la reserva directamente.");if(l.some(x=>x.estado==="espera"&&x.experiencia===d.experiencia&&x.fecha===d.fecha&&x.cliente===d.cliente))throw Error("Solicitud duplicada.");const x={id:"LE-"+(Math.max(0,...l.map(x=>Number(x.id.slice(3))))+1),experiencia:d.experiencia,fecha:d.fecha,adultos:d.adultos,menores:d.menores,cliente:d.cliente,estado:"espera"};guardar([...l,x]);return x;}
 function retirar(id){const l=leer(),x=l.find(x=>x.id===id);if(!x||x.estado!=="espera")throw Error("Solicitud no disponible.");x.estado="retirada";guardar(l);}
 function cerrar(id,reserva){const l=leer(),x=l.find(x=>x.id===id),b=r.leer().find(y=>y.id===reserva);if(!x||x.estado!=="espera"||!b||b.estado!=="confirmada"||["experiencia","fecha","adultos","menores","cliente"].some(k=>x[k]!==b[k])||l.some(y=>y.reserva===reserva))throw Error("Reserva no corresponde.");x.estado="promovida";x.reserva=reserva;guardar(l);}
 return {leer,agregar,retirar,cerrar};
}
