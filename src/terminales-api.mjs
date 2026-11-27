import {admiteCuentas} from "../public/demostraciones/cuentas-practica.mjs";
import {leerJsonLimitado,ErrorSolicitud} from "./seguridad.mjs";
import {terminalesListas,listarTerminales,configurarTerminal,solicitarTerminal,resolverTerminal} from "./terminales-demo.mjs";
import {pagosMultiplesListos} from "./pagos-multiples-demo.mjs";
export async function atenderTerminales(request,db,s,ctx,json){
 const err=(error,status)=>json({error},status);
 if(!admiteCuentas(ctx.establecimiento.id,ctx.plan.id))return err("Terminales no incluidas.",403);
 try{
 if(!await terminalesListas(db)||!await pagosMultiplesListos(db))return err("Falta configurar migraciones de terminales y cobros.",503);
 if(request.method==="GET")return json({...await listarTerminales(db,s),expira:s.expira});
 if(!["POST","PATCH"].includes(request.method))return err("Método no permitido.",405);
 const d=await leerJsonLimitado(request,4096);
 if(!d||typeof d!=="object"||Array.isArray(d))return err("Solicitud inválida.",400);
 if(request.method==="POST"&&d.accion==="configurar")return json({terminal:await configurarTerminal(db,s,d),modo:"simulado"});
 if(request.method==="POST"&&d.accion==="solicitar")return json({operacion:await solicitarTerminal(db,s,d),modo:"simulado"});
 if(request.method==="PATCH"&&d.accion==="resolver")return json({operacion:await resolverTerminal(db,s,d),modo:"simulado"});
 return err("Acción inválida.",400);
 }catch(e){
 if(e instanceof ErrorSolicitud)return err(e.message,e.status);
 const seguros=["Terminal inválida.","Terminal ocupada, proveedor distinto o límite alcanzado.","Solicitud terminal inválida.","Identificador ya utilizado.","Terminal o cuenta ocupada, revisión distinta o límite alcanzado.","Resultado terminal inválido.","Operación inexistente o ya resuelta."];
 if(seguros.includes(e.message))return err(e.message,409);
 if(String(e.message).includes("Terminal no disponible"))return err("Terminal no disponible.",409);
 return err("No se pudo verificar la operación de terminal.",503);
 }
}
