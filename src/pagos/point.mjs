// Adaptador servidor de Mercado Pago Point Orders API.
// No está enlazado a rutas públicas. El llamador debe autorizar al comercio,
// guardar el intento ANTES de POST y reconciliar únicamente contra su proveedor.
const API="https://api.mercadopago.com";
const uuid=x=>typeof x==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(x);
const ordenId=x=>typeof x==="string"&&/^ORD[A-Z0-9]{5,80}$/.test(x);
const terminalId=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{3,120}$/.test(x);
export function pesosPoint(centavos){
 if(!Number.isSafeInteger(centavos)||centavos<1||centavos>100000000)throw Error("Importe fuera del rango admitido por esta aplicación.");
 return (centavos/100).toFixed(2);
}
function centavos(s){
 if(typeof s!=="string"||!/^\d{1,7}(\.\d{1,2})?$/.test(s))return null;
 const [a,b=""]=s.split(".");return Number(a)*100+Number(b.padEnd(2,"0"));
}
export function crearIntentoPoint({intento,terminal,importeCentavos,comercio}){
 if(!uuid(intento)||!terminalId(terminal)||typeof comercio!=="string"||!/^\d{1,32}$/.test(comercio))throw Error("Identificador de intento, terminal o comercio inválido.");
 pesosPoint(importeCentavos);
 return Object.freeze({intento,terminal,importeCentavos,comercio,referencia:"lapaz-"+intento,moneda:"MXN"});
}
export function cuerpoPoint(i){
 const v=crearIntentoPoint(i);
 if(i.referencia!==v.referencia||i.moneda!==v.moneda)throw Error("Intento alterado.");
 return {type:"point",external_reference:v.referencia,expiration_time:"PT10M",transactions:{payments:[{amount:pesosPoint(v.importeCentavos)}]},config:{point:{terminal_id:v.terminal,print_on_terminal:"seller_ticket"}},description:"Cobro en punto de venta"};
}
// Solo una respuesta obtenida en servidor con la credencial del comercio es válida.
// Este resultado NO escribe cobros ni autoriza entregar pedidos automáticamente.
export function verificarOrdenPoint(i,o,idEsperado=null){
 cuerpoPoint(i);
 const p=o?.transactions?.payments;
 if(!ordenId(o?.id)||idEsperado!==null&&o.id!==idEsperado||o.type!=="point"||String(o.user_id)!==i.comercio||(o.currency!==undefined&&o.currency!=="MXN")||o.country_code!=="MEX"||o.external_reference!==i.referencia||o.config?.point?.terminal_id!==i.terminal||!Array.isArray(p)||p.length!==1||centavos(p[0].amount)!==i.importeCentavos||typeof p[0].id!=="string"||!/^PAY[A-Z0-9]{5,80}$/.test(p[0].id))throw Error("Orden no coincide con el intento autorizado. Revisión manual.");
 const pago=p[0],base={orden:o.id,pago:pago.id,estado:o.status,detalle:o.status_detail??null};
 if(o.status==="processed"){
  if(o.status_detail!=="accredited"||pago.status!=="processed"||pago.status_detail!=="accredited"||centavos(pago.paid_amount)!==i.importeCentavos||(o.total_paid_amount!==undefined&&centavos(o.total_paid_amount)!==i.importeCentavos)||(pago.refunded_amount!==undefined&&centavos(pago.refunded_amount)!==0)||(pago.tip_amount!==undefined&&centavos(pago.tip_amount)!==0)||(o.transactions.refunds!==undefined&&(!Array.isArray(o.transactions.refunds)||o.transactions.refunds.length>0)))throw Error("Importe o acreditación no conciliados. Revisión manual.");
  return {...base,resultado:"acreditado",importeCentavos:i.importeCentavos};
 }
 if(["failed","canceled","expired","refunded"].includes(o.status))return {...base,resultado:o.status};
 if(["created","at_terminal","action_required","processing"].includes(o.status))return {...base,resultado:"pendiente"};
 return {...base,resultado:"revision_manual"};
}
export class ErrorPoint extends Error{
 constructor(status){super("Mercado Pago no confirmó la solicitud. Consulta o reintenta con la misma clave de idempotencia.");this.name="ErrorPoint";this.status=status;}
}
// Inyección de transporte obligatoria: no hay activación implícita de red.
// Nunca se registran tokens ni respuestas crudas.
export function clientePoint({accessToken,transporte}){
 if(typeof accessToken!=="string"||accessToken.length<20||/\s/.test(accessToken)||typeof transporte!=="function")throw Error("Configuración privada de Point inválida.");
 async function llamar(path,method="GET",body,clave){
  const headers={Authorization:"Bearer "+accessToken,Accept:"application/json"};
  if(body!==undefined)headers["Content-Type"]="application/json";
  if(clave)headers["X-Idempotency-Key"]=clave;
  let r;try{r=await transporte(API+path,{method,headers,redirect:"error",...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{throw new ErrorPoint(0);}
  if(!r.ok)throw new ErrorPoint(r.status);
  try{return await r.json();}catch{throw new ErrorPoint(r.status);}
 }
 return Object.freeze({
  async terminales(){const v=await llamar("/terminals/v1/list?limit=50&offset=0");if(!Array.isArray(v?.data?.terminals))throw Error("Respuesta de terminales inválida.");return v.data.terminals.filter(t=>terminalId(t.id)&&t.operating_mode==="PDV").map(t=>({id:t.id,modo:t.operating_mode}));},
  async crear(i){return verificarOrdenPoint(i,await llamar("/v1/orders","POST",cuerpoPoint(i),i.intento));},
  async consultar(i,id){if(!ordenId(id))throw Error("Orden inválida.");return verificarOrdenPoint(i,await llamar("/v1/orders/"+id),id);}
 });
}
