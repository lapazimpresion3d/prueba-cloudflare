// Núcleo de práctica: importes enteros en centavos, sin procesar dinero.
export const metodosPago = Object.freeze(["efectivo","transferencia","tarjeta_externa"]);
const max = 100000000;
function importe(n, minimo=0) {
  if (!Number.isSafeInteger(n)||n<minimo||n>max) throw Error("Importe inválido.");
  return n;
}
function identificador(s) {
  if (typeof s!=="string"||!/^[a-zA-Z0-9_-]{1,80}$/.test(s)) throw Error("Identificador inválido.");
}
export function crearPlanCobro(consumoCentavos) {
  return {consumoCentavos:importe(consumoCentavos),revision:0,movimientos:[]};
}
export function resumenPlanCobro(plan) {
  const consumo=importe(plan.consumoCentavos);
  let abonado=0,propina=0,recibido=0,cambio=0;
  for (const m of movimientosActivos(plan)) {
    abonado+=m.consumoCentavos;propina+=m.propinaCentavos;
    recibido+=m.recibidoCentavos;cambio+=m.cambioCentavos;
  }
  return {consumoCentavos:consumo,abonadoCentavos:abonado,propinaCentavos:propina,
    recibidoCentavos:recibido,cambioCentavos:cambio,saldoCentavos:consumo-abonado,
    liquidada:consumo===abonado};
}
export function agregarMovimiento(plan,d,fecha=Date.now()) {
  identificador(d.id);
  const previo=plan.movimientos.find(m=>m.id===d.id);
  const consumo=importe(d.consumoCentavos,1),propina=importe(d.propinaCentavos??0);
  const total=importe(consumo+propina,1),recibido=importe(d.recibidoCentavos??total,1);
  if (!metodosPago.includes(d.metodo)) throw Error("Método no disponible en práctica.");
  if (recibido<total||(d.metodo!=="efectivo"&&recibido!==total)) throw Error("Importe recibido incorrecto.");
  const referencia=d.metodo==="efectivo"?"":d.referencia;
  if(d.metodo!=="efectivo"&&(typeof referencia!=="string"||!/^DEMO-[0-9]{6}$/.test(referencia))) throw Error("Usa un folio ficticio DEMO-123456.");
  const movimiento={id:d.id,metodo:d.metodo,consumoCentavos:consumo,propinaCentavos:propina,recibidoCentavos:recibido,cambioCentavos:recibido-total,referencia};
  if((plan.reasignaciones||[]).some(a=>a.id===d.id)||(plan.anulaciones||[]).some(a=>a.id===d.id))throw Error("Identificador ya utilizado.");
  if(previo){
    if(Object.keys(movimiento).every(k=>previo[k]===movimiento[k])) return plan;
    throw Error("Identificador ya utilizado.");
  }
  if(d.revision!==plan.revision) throw Error("La cuenta cambió. Actualiza.");
  if(plan.revision>=100) throw Error("Límite de movimientos de práctica.");
  if(consumo>resumenPlanCobro(plan).saldoCentavos) throw Error("El abono excede el saldo.");
  if(referencia&&movimientosActivos(plan).some(m=>m.referencia===referencia)) throw Error("Folio repetido.");
  return {...plan,revision:plan.revision+1,movimientos:[...plan.movimientos,{...movimiento,fecha}]};
}
// División aritmética exacta; no registra movimientos.
export function dividirImporte(centavos,personas) {
  importe(centavos);
  if(!Number.isSafeInteger(personas)||personas<1||personas>100) throw Error("Número de personas inválido.");
  const base=Math.floor(centavos/personas),resto=centavos%personas;
  return Array.from({length:personas},(_,i)=>base+(i<resto?1:0));
}

export const motivosAnulacionMultiple=Object.freeze(["Importe incorrecto","Método incorrecto","Propina incorrecta","Folio incorrecto","Asignación incorrecta","Otro error de registro"]);
export function movimientosActivos(plan){
 const anulados=new Set((plan.anulaciones||[]).map(a=>a.movimiento));
 return plan.movimientos.filter(m=>!anulados.has(m.id));
}
export function anularMovimiento(plan,d,fecha=Date.now()){
 identificador(d.id);identificador(d.movimiento);
 if(!motivosAnulacionMultiple.includes(d.motivo))throw Error("Motivo de anulación inválido.");
 const anterior=(plan.anulaciones||[]).find(a=>a.id===d.id);
 if(anterior){if(anterior.movimiento===d.movimiento&&anterior.motivo===d.motivo)return plan;throw Error("Identificador ya utilizado.");}
 if((plan.reasignaciones||[]).some(m=>m.id===d.id)||plan.movimientos.some(m=>m.id===d.id))throw Error("Identificador ya utilizado.");
 if(d.revision!==plan.revision)throw Error("La cuenta cambió. Actualiza.");
 if(plan.revision>=100)throw Error("Límite de movimientos de práctica.");
 if(!movimientosActivos(plan).some(m=>m.id===d.movimiento))throw Error("Pago inexistente o ya anulado.");
 return {...plan,revision:plan.revision+1,anulaciones:[...(plan.anulaciones||[]),{id:d.id,movimiento:d.movimiento,motivo:d.motivo,fecha}]};
}
