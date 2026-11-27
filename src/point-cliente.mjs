import {construirOrdenPoint} from "./point-orders-preparacion.mjs";
// Transporte inyectado obligatorio: sin fetch global ni rutas de producción.
export class ErrorMercadoPago extends Error {
 constructor(status,incierto=false){super("Mercado Pago: "+(status?"HTTP "+status:"respuesta no confirmada"));this.name="ErrorMercadoPago";this.status=status;this.incierto=incierto;}
}
const base="https://api.mercadopago.com";
const idValido=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
const claveValida=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{16,64}$/.test(x);
export function crearClientePoint({token,transporte,timeout=10000,permitirEscrituras=false}={}){
 if(typeof token!=="string"||!token||/[\r\n]/.test(token)||typeof transporte!=="function"||!Number.isSafeInteger(timeout)||timeout<100||timeout>30000)throw Error("Configuración Point inválida.");
 async function solicitar(method,path,body,clave){
  const escritura=method!=="GET";
  if(escritura&&permitirEscrituras!==true)throw Error("Escrituras Point deshabilitadas.");
  if(escritura&&!claveValida(clave))throw Error("Clave de idempotencia inválida.");
  const headers={Authorization:"Bearer "+token,Accept:"application/json",...(escritura?{"Content-Type":"application/json","X-Idempotency-Key":clave}:{})};
  const controller=new AbortController();let timer;
  try{
   return await Promise.race([new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new ErrorMercadoPago(0,escritura));},timeout);}), (async()=>{
    const r=await transporte(base+path,{method,headers,redirect:"error",signal:controller.signal,...(body!==undefined?{body:JSON.stringify(body)}:{})});
    if(!r.ok)throw new ErrorMercadoPago(r.status,escritura&&(r.status>=500||[408,409,429].includes(r.status)));
    const data=await r.json();if(!data||typeof data!=="object")throw new ErrorMercadoPago(0,escritura);
    return data;
   })()]);
  }catch(e){if(e instanceof ErrorMercadoPago)throw e;throw new ErrorMercadoPago(0,escritura);}
  finally{clearTimeout(timer);}
 }
 return Object.freeze({
  listarTerminales({limit=50,offset=0}={}){if(!Number.isSafeInteger(limit)||limit<1||limit>50||!Number.isSafeInteger(offset)||offset<0)throw Error("Paginación inválida.");return solicitar("GET","/terminals/v1/list?limit="+limit+"&offset="+offset);},
  consultarOrden(id){if(!idValido(id))throw Error("Orden inválida.");return solicitar("GET","/v1/orders/"+id);},
  crearOrden(datos,clave){return solicitar("POST","/v1/orders",construirOrdenPoint(datos),clave);},
  cancelarOrden(id,clave){if(!idValido(id))throw Error("Orden inválida.");return solicitar("POST","/v1/orders/"+id+"/cancel",undefined,clave);}
 });
}
