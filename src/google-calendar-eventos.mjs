// Only deterministic integration-owned events. ETags protect against concurrent remote changes.
const validId=x=>typeof x==="string"&&/^[0-9a-f]{64}$/.test(x);
export function crearClienteEventosGoogle({token,transporte,habilitado=false}){
 if(typeof token!=="function"||typeof transporte!=="function")throw Error("Cliente inválido.");
 async function peticion(empresa,cal,id,method,body,etag){
  if(!habilitado||!validId(id)||typeof cal!=="string"||!cal||cal.length>1024)throw Error("Operación no permitida.");
  const access=await token(empresa);if(typeof access!=="string"||!access||/[\r\n]/.test(access))throw Error("Credencial inválida.");
  const url="https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(cal)+"/events"+(method==="POST"?"":"/"+id)+(method==="GET"?"":"?sendUpdates=none");
  return transporte(url,{method,redirect:"error",signal:AbortSignal.timeout(10000),headers:{Authorization:"Bearer "+access,"Content-Type":"application/json",...(etag?{"If-Match":etag}:{})},...(body?{body:JSON.stringify(body)}:{})});
 }
 async function consultar(e,c,id){const r=await peticion(e,c,id,"GET");if(r.status===404||r.status===410)return null;if(!r.ok)throw Error("Consulta no confirmada.");const x=await r.json();if(x.id!==id||x.extendedProperties?.private?.lapaz!==id||typeof x.etag!=="string"||!x.etag)throw Error("Evento ajeno o sin revisión.");return x;}
 return {
 async upsertPropio(e,c,id,b){if(b?.id!==id||b.extendedProperties?.private?.lapaz!==id)throw Error("Identidad inválida.");let x=await consultar(e,c,id);if(!x){const r=await peticion(e,c,id,"POST",b);if(r.ok)return;if(r.status!==409)throw Error("Alta no confirmada.");x=await consultar(e,c,id);if(!x)throw Error("Conflicto no confirmado.");}const {id:ignorado,...patch}=b;const r=await peticion(e,c,id,"PATCH",patch,x.etag);if(!r.ok)throw Error("Actualización no confirmada.");},
 async eliminarPropio(e,c,id){const x=await consultar(e,c,id);if(!x)return;const r=await peticion(e,c,id,"DELETE",undefined,x.etag);if(!r.ok&&r.status!==404&&r.status!==410)throw Error("Baja no confirmada.");}
 };
}
