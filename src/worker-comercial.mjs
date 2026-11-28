// Dedicated commercial worker candidate. No public assets, demo imports, or private routes.
import {validarEntornoComercial} from "./entorno-comercial.mjs";
const json=(data,status)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'"}});
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.protocol!=="https:")return json({error:"Solicitud no permitida."},403);
 if(url.pathname!=="/"&&url.pathname!=="/api/comercial/estado")return json({error:"Ruta no disponible."},404);
 if(request.method!=="GET")return json({error:"Método no permitido."},405);
 // Public response does not disclose bindings, configuration, or schema health.
 try{validarEntornoComercial(env);}catch{return json({estado:"no_disponible"},503);}
 return json({estado:"no_disponible"},503);
}};
