// Confirmed new-offer prices, separate from immutable historical contracts.
export const preciosConfirmados=Object.freeze(Object.fromEntries([["p1",75000,14900],["p2",150000,24900],["p3",250000,34900],["p4",350000,49900]].map(([id,implementacion,mensualidad])=>[id,Object.freeze({implementacion,mensualidad})])));
export function precioConfirmado(p){const x=Object.hasOwn(preciosConfirmados,p.id)?preciosConfirmados[p.id]:null;return !!x&&p.moneda==="MXN"&&p.implementacion===x.implementacion&&p.mensualidad===x.mensualidad;}
