// División por partidas de comandas confirmadas. Valores monetarios en centavos.
export function partidasCuenta(pedidos){
 const out=[];
 for(const p of pedidos){
  if(p.estado==="cancelado")continue;
  if(p.estado!=="entregado"||p.cargo!==0||!Array.isArray(p.detalle))throw Error("Comanda no apta para división.");
  let total=0;
  p.detalle.forEach((l,i)=>{
   if(!Number.isSafeInteger(l.cantidad)||l.cantidad<1||l.cantidad>20||!Number.isSafeInteger(l.precioCentavos)||l.precioCentavos<0||l.subtotal!==l.cantidad*l.precioCentavos)throw Error("Partida inválida.");
   total+=l.subtotal;
   for(let u=0;u<l.cantidad;u++)out.push({id:p.solicitud+":"+i+":"+u,nombre:l.nombre,precioCentavos:l.precioCentavos});
  });
  if(total!==p.total)throw Error("Consumo no conciliado.");
 }
 if(new Set(out.map(x=>x.id)).size!==out.length)throw Error("Partidas repetidas.");
 return out;
}
// Una unidad puede compartirse en partes iguales. El orden de comensales
// determina quién recibe el centavo residual, de manera reproducible.
export function calcularAsignacion(partidas,asignaciones,personas){
 if(!Number.isSafeInteger(personas)||personas<1||personas>8||!Array.isArray(asignaciones)||asignaciones.length>partidas.length)throw Error("Asignación inválida.");
 const mapa=new Map(partidas.map(p=>[p.id,p])),vistos=new Set(),totales=Array(personas).fill(0),detalle=[];
 for(const a of asignaciones){
  const p=mapa.get(a?.id);
  if(!p||vistos.has(a.id)||!Array.isArray(a.personas)||!a.personas.length||new Set(a.personas).size!==a.personas.length||a.personas.some(i=>!Number.isSafeInteger(i)||i<1||i>personas))throw Error("Producto o comensal inválido o repetido.");
  vistos.add(a.id);
  const ids=[...a.personas].sort((x,y)=>x-y),base=Math.floor(p.precioCentavos/ids.length),resto=p.precioCentavos%ids.length;
  const partes=ids.map((id,i)=>{const importeCentavos=base+(i<resto?1:0);totales[id-1]+=importeCentavos;return {comensal:id,importeCentavos};});
  detalle.push({id:p.id,nombre:p.nombre,partes});
 }
 const pendiente=partidas.filter(p=>!vistos.has(p.id));
 return {totales,detalle,pendiente,pendienteCentavos:pendiente.reduce((n,p)=>n+p.precioCentavos,0)};
}
