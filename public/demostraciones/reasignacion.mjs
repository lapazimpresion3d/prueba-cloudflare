import {calcularAsignacion} from "./division-cuentas.mjs";
import {movimientosActivos} from "./pagos-multiples.mjs";
export function reasignarDivision(plan,d,partidas,personas,fecha=Date.now()){
 if(!plan.division)throw Error("No existe división.");
 if(typeof d.id!=="string"||!/^[a-zA-Z0-9_-]{1,80}$/.test(d.id))throw Error("Identificador inválido.");
 if(!["Asignación incorrecta","Cambio de comensal","Producto compartido"].includes(d.motivo))throw Error("Motivo de reasignación inválido.");
 const a=calcularAsignacion(partidas,d.asignaciones,personas);
 if(a.pendiente.length||a.totales.reduce((s,n)=>s+n,0)!==plan.consumoCentavos)throw Error("Asigna todos los productos antes de cobrar.");
 const nueva={totales:a.totales,detalle:a.detalle.sort((x,y)=>x.id.localeCompare(y.id))};
 const historial=plan.reasignaciones||[];
 const previo=historial.find(x=>x.id===d.id);
 if(previo){if(previo.motivo===d.motivo&&JSON.stringify(previo.nueva)===JSON.stringify(nueva))return plan;throw Error("Identificador ya utilizado.");}
 if(plan.movimientos.some(m=>m.id===d.id)||(plan.anulaciones||[]).some(m=>m.id===d.id))throw Error("Identificador ya utilizado.");
 if(d.revision!==plan.revision)throw Error("La cuenta cambió. Actualiza.");
 if(plan.revision>=100)throw Error("Límite de movimientos de práctica.");
 const protegidos=new Set(movimientosActivos(plan).map(m=>m.comensal));
 const firma=(div,i)=>JSON.stringify(div.detalle.flatMap(p=>p.partes.filter(x=>x.comensal===i).map(x=>[p.id,x.importeCentavos])).sort((x,y)=>x[0].localeCompare(y[0])));
 for(const i of protegidos)if(firma(plan.division,i)!==firma(nueva,i))throw Error("No se puede cambiar el consumo de un comensal con pagos activos.");
 return {...plan,division:nueva,revision:plan.revision+1,reasignaciones:[...historial,{id:d.id,motivo:d.motivo,fecha,anterior:plan.division,nueva}]};
}
