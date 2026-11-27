const entero=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const reloj=new Intl.DateTimeFormat("en-US",{timeZone:"America/Mazatlan",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
export function normalizarCampana(d,catalogo){
 const codigo=String(d.codigo??"").trim().toUpperCase(),dias=d.dias??[],tipo=d.tipo,alcance=d.alcance,objetivo=d.objetivo??"",cliente=d.cliente??"todos";
 if(!/^[A-Z0-9-]{2,20}$/.test(codigo)||typeof d.activo!=="boolean"||typeof d.automatico!=="boolean"||!["porcentaje","2x1","3x2"].includes(tipo)||!["todos","producto","categoria"].includes(alcance)||!["todos","primera","frecuente"].includes(cliente)||!entero(d.minimo,0,100000000)||!entero(d.unidades,1,600)||!entero(d.limite,1,50)||!Number.isSafeInteger(d.inicio)||!Number.isSafeInteger(d.fin)||d.fin<=d.inicio||!Array.isArray(dias)||new Set(dias).size!==dias.length||dias.some(x=>!entero(x,0,6))||!entero(d.desde,0,1439)||!entero(d.hasta,1,1440)||d.desde>=d.hasta||tipo==="porcentaje"&&!entero(d.porcentaje,1,100)||alcance==="producto"&&!catalogo.some(x=>x.id===objetivo)||alcance==="categoria"&&!catalogo.some(x=>x.categoria===objetivo))throw Error("Regla promocional inválida.");
 return {codigo,activo:d.activo,automatico:d.automatico,tipo,alcance,objetivo:alcance==="todos"?"":objetivo,cliente,minimo:d.minimo,unidades:d.unidades,limite:d.limite,inicio:d.inicio,fin:d.fin,dias:[...dias],desde:d.desde,hasta:d.hasta,porcentaje:tipo==="porcentaje"?d.porcentaje:0};
}
export function descuentoCampana(p,ventas,r,d,fecha,catalogo,clientes){
 if(!p.activo||fecha<p.inicio||fecha>=p.fin||r.subtotal<p.minimo||ventas.filter(v=>v.estado==="vendido"&&v.beneficio?.codigo===p.codigo).length>=p.limite)return null;
 const t=Object.fromEntries(reloj.formatToParts(fecha).map(x=>[x.type,x.value])),dia=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(t.weekday),min=Number(t.hour)*60+Number(t.minute);
 if(p.dias.length&&!p.dias.includes(dia)||min<p.desde||min>=p.hasta)return null;
 if(p.cliente!=="todos"){if(!clientes.some(c=>c.id===d.cliente&&c.activo!==false))return null;const n=ventas.filter(v=>v.estado==="vendido"&&v.cliente===d.cliente).length;if(p.cliente==="primera"?n!==0:n<3)return null;}
 const ls=r.detalle.filter(l=>p.alcance==="todos"||p.alcance==="producto"&&l.id===p.objetivo||p.alcance==="categoria"&&catalogo.some(c=>c.id===l.id&&c.categoria===p.objetivo));
 const n=ls.reduce((s,l)=>s+l.cantidad,0);if(n<p.unidades)return null;
 if(p.tipo==="porcentaje")return Math.round(ls.reduce((s,l)=>s+l.subtotal,0)*p.porcentaje/100);
 // Se bonifican las unidades más baratas de cada grupo, sin excluirlas del inventario.
 const grupo=p.tipo==="2x1"?2:3,gratis=Math.floor(n/grupo),precios=ls.flatMap(l=>Array(l.cantidad).fill(l.precioCentavos)).sort((a,b)=>a-b);return precios.slice(0,gratis).reduce((s,x)=>s+x,0);
}
export function elegirCampana(promos,ventas,r,d,fecha,catalogo,clientes){return promos.filter(p=>p.tipo&&p.automatico).map(p=>({codigo:p.codigo,rebaja:descuentoCampana(p,ventas,r,d,fecha,catalogo,clientes)})).filter(x=>x.rebaja>0).sort((a,b)=>b.rebaja-a.rebaja||a.codigo.localeCompare(b.codigo))[0]??null;}
