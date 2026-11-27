import {calcularAsignacion} from "./division-cuentas.mjs";
import {agregarMovimiento} from "./pagos-multiples.mjs";
// La división se fija con el primer abono; comparte el mismo libro y revisión.
export function movimientoIndividual(plan,d,partidas,personas){
 if(!plan.division&&d.asignaciones===undefined){
  if(d.comensal!==undefined)throw Error("Primero asigna los productos.");
  return agregarMovimiento(plan,d);
 }
 if(!plan.division&&plan.movimientos.length)throw Error("No se puede dividir una cuenta con abonos previos.");
 let division=plan.division;
 if(!division){
  const a=calcularAsignacion(partidas,d.asignaciones,personas);
  if(a.pendiente.length||a.totales.reduce((s,n)=>s+n,0)!==plan.consumoCentavos)throw Error("Asigna todos los productos antes de cobrar.");
  division={totales:a.totales,detalle:a.detalle};
 }else if(d.asignaciones!==undefined){
  const a=calcularAsignacion(partidas,d.asignaciones,personas);
  if(a.pendiente.length||JSON.stringify({totales:a.totales,detalle:a.detalle})!==JSON.stringify(division))throw Error("La división ya está fijada.");
 }
 if(!Number.isSafeInteger(d.comensal)||d.comensal<1||d.comensal>division.totales.length)throw Error("Selecciona un comensal.");
 const previo=plan.movimientos.find(m=>m.id===d.id);
 if(previo&&previo.comensal!==d.comensal)throw Error("Identificador ya utilizado.");
 const saldo=division.totales[d.comensal-1]-plan.movimientos.filter(m=>m.comensal===d.comensal).reduce((s,m)=>s+m.consumoCentavos,0);
 if(!previo&&d.consumoCentavos>saldo)throw Error("El abono excede el saldo individual.");
 const nuevo=agregarMovimiento(plan,d);
 if(nuevo===plan)return plan;
 return {...nuevo,division,movimientos:nuevo.movimientos.map(m=>m.id===d.id?{...m,comensal:d.comensal}:m)};
}
export function subcuentas(plan){
 if(!plan.division)return [];
 return plan.division.totales.map((total,i)=>{
  const movimientos=plan.movimientos.filter(m=>m.comensal===i+1);
  const abonado=movimientos.reduce((s,m)=>s+m.consumoCentavos,0);
  return {comensal:i+1,total,abonado,saldo:total-abonado,propina:movimientos.reduce((s,m)=>s+m.propinaCentavos,0),liquidada:total===abonado,movimientos};
 });
}
