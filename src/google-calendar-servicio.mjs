import {crearGoogleOAuth} from "./google-calendar-oauth.mjs";
import {crearClienteEventosGoogle} from "./google-calendar-eventos.mjs";
import {crearSincronizadorGoogle} from "./google-calendar-sync.mjs";
// Dependency-injected private service. No demo data, public routes or automatic activation.
export function crearServicioGoogle({almacen,autorizar,fuente,transporte,config,habilitado=false}){
 const oauth=crearGoogleOAuth({...config,almacen,autorizar,transporte,habilitado});
 const sync=crearSincronizadorGoogle({almacen,fuente,habilitado,crearCliente:async(empresa,l)=>crearClienteEventosGoogle({habilitado,transporte,token:async e=>{if(e!==empresa)throw Error("Empresa inválida.");const c=await almacen.configuracion(l);if(!c.activo)throw Error("Sincronización pausada.");return oauth.tokenBajoReserva(empresa,l);}})});
 const origen=new URL(config.redirectUri).origin;
 async function contexto(r,e,metodo){if(!habilitado||r.method!==metodo||new URL(r.url).origin!==origen||metodo==="POST"&&r.headers.get("Origin")!==origen)throw Error("No disponible.");const a=await autorizar(r,e);if(a?.empresa!==e||a.rol!=="propietario"||!["p2","p3","p4"].includes(a.plan))throw Error("No autorizado.");return a;}
 return Object.freeze({
 async estado(r,e){const a=await contexto(r,e,"GET");return {...await almacen.estado(e),plan:a.plan,historial:await almacen.historial(e)};},
 async iniciar(r,e){await contexto(r,e,"POST");return oauth.iniciar(r,e);},
 async completar(r,e){await contexto(r,e,"GET");return oauth.completar(r,e);},
 async listar(r,e){await contexto(r,e,"GET");return oauth.listar(r,e);},
 async crear(r,e,n){await contexto(r,e,"POST");return oauth.crear(r,e,n);},
 async configurar(r,e,d){await contexto(r,e,"POST");return oauth.configurar(r,e,d);},
 async sincronizar(r,e){await contexto(r,e,"POST");return sync(e);},
 async desconectar(r,e){await contexto(r,e,"POST");return oauth.desconectar(r,e);},
 // Trusted scheduled handler only; cursor must be persisted by host across invocations.
 async lote(cursor=""){if(!habilitado)throw Error("No disponible.");const rows=await almacen.pendientes(cursor,10),resultados=[];for(const {empresa} of rows){try{resultados.push({empresa,...await sync(empresa)});}catch{resultados.push({empresa,estado:"reintentar"});}}return {cursor:rows.length===10?rows.at(-1).empresa:"",resultados};}
 });
}
