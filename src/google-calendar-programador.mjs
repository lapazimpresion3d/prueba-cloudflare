// Internal Cloudflare scheduled candidate. Persisted cursor is supplied by trusted host.
// Not registered in wrangler or worker until real commercial sources and security gates exist.
export function crearProgramadorGoogle({servicio,cursor,habilitado=false}){
 return async function scheduled(event,env,ctx){
 if(!habilitado)return;
 const ejecutar=async()=>{const lease=await cursor.reservar();if(!lease)return;try{const r=await servicio.lote(lease.valor??"");await cursor.confirmar(lease,r.cursor);}finally{await cursor.liberar(lease);}};
 const tarea=ejecutar();if(ctx?.waitUntil)ctx.waitUntil(tarea);return tarea;
 };
}
