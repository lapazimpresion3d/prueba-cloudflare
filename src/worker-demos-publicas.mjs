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
 if(p.startsWith("/api/demo/"))return await atenderDemo(request,{},url,json)??json({error:"Ruta no disponible"},404);
 if((request.method==="GET"||request.method==="HEAD")&&(p.startsWith("/demostraciones/")&&!p.startsWith("/demostraciones/administrador-central")||/^\/imagenes\/[a-z0-9_-]+\.webp$/i.test(p)))return env.ASSETS.fetch(request);
 return json({error:"Ruta no disponible"},404);
}};
