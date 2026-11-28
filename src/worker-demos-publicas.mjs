import {incidenteSeguro} from "./diagnostico-plataforma.mjs";
import {ErrorSolicitud} from "./seguridad.mjs";
// Worker candidato separado: exclusivamente demos, sin bases ni secretos de producción.
import {destinoDemo} from "./rutas-publicas-demo.mjs";
import {atenderDemo} from "./demostraciones.mjs";
const json=(d,status=200)=>Response.json(d,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export default {async fetch(request,env){
 const url=new URL(request.url),p=url.pathname;
 if(request.method==="GET"||request.method==="HEAD"){
  if(p==="/")return Response.redirect(new URL("/demostraciones/ejemplos/",url),302);
  const destino=destinoDemo(url);if(destino)return Response.redirect(new URL(destino,url),302);
 }
 if(p.startsWith("/api/demo/")){try{return await atenderDemo(request,{},url,json)??json({error:"Ruta no disponible"},404);}catch(e){if(e instanceof ErrorSolicitud)return json({error:e.message},e.status);const incidente=incidenteSeguro("api_demo");console.error(JSON.stringify(incidente));return json({error:"Error interno de API.",incidente:incidente.id},500);}}
 if((request.method==="GET"||request.method==="HEAD")&&(p.startsWith("/demostraciones/")&&!p.startsWith("/demostraciones/administrador-central")||/^\/imagenes\/[a-z0-9_-]+\.webp$/i.test(p)))return env.ASSETS.fetch(request);
 return json({error:"Ruta no disponible"},404);
}};
