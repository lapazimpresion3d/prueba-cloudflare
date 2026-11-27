// Tarifas ficticias, independientes de preferencias_entrega del restaurante original.
export const zonasEntregaDemo=Object.freeze([
 {id:"zona-a",nombre:"Colonia de demostración A",direccion:"domicilio-1",envioCentavos:2500,minimoCentavos:10000},
 {id:"zona-b",nombre:"Colonia de demostración B",direccion:"domicilio-2",envioCentavos:3500,minimoCentavos:15000},
 {id:"zona-c",nombre:"Colonia de demostración C",direccion:"domicilio-3",envioCentavos:5000,minimoCentavos:20000}
].map(Object.freeze));
export const horarioEntregaDemo="Martes a domingo, 12:00–21:30 (hora de La Paz)";
export function horarioEntregaAbierto(ms=Date.now()){
 const f=new Intl.DateTimeFormat("en-US",{timeZone:"America/Mazatlan",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 const p=Object.fromEntries(f.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 const m=Number(p.hour)*60+Number(p.minute);
 return p.weekday!=="Mon"&&m>=720&&m<1290;
}
export function cotizarEntregaDemo(direccion,subtotal,horario="actual",ms=Date.now()){
 if(!Number.isSafeInteger(subtotal)||subtotal<0)throw Error("Subtotal inválido.");
 if(!["actual","simulado"].includes(horario))throw Error("Modo de horario inválido.");
 const zona=zonasEntregaDemo.find(z=>z.direccion===direccion);
 if(!zona)return {zona:null,envioCentavos:null,minimoCentavos:null,faltante:null,abierto:false,horario,error:"Selecciona una colonia y dirección con cobertura."};
 const abierto=horario==="simulado"||horarioEntregaAbierto(ms),faltante=Math.max(0,zona.minimoCentavos-subtotal);
 return {zona:zona.id,colonia:zona.nombre,envioCentavos:zona.envioCentavos,minimoCentavos:zona.minimoCentavos,faltante,abierto,horario,error:!abierto?"El servicio a domicilio está fuera de horario.":faltante?"El pedido no alcanza el mínimo de la colonia.":""};
}
export function entregaConfirmada(q){
 if(!q||q.error||!q.zona||!q.abierto||q.faltante!==0)throw Error(q?.error||"Selecciona una dirección de entrega.");
 return {zona:q.zona,colonia:q.colonia,envioCentavos:q.envioCentavos,minimoCentavos:q.minimoCentavos,horario:q.horario};
}
