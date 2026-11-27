import {admiteCuentas} from "../public/demostraciones/cuentas-practica.mjs";
import {leerJsonLimitado,ErrorSolicitud} from "./seguridad.mjs";
import {terminalesListas,listarTerminales,configurarTerminal,solicitarTerminal,resolverTerminal,conciliarTerminal,resolverHistorica} from "./terminales-demo.mjs";
import {pagosMultiplesListos} from "./pagos-multiples-demo.mjs";
export async function atenderTerminales(request,db,s,ctx,json){
 const err=(error,status)=>json({error},status);
 if(!admiteCuentas(ctx.establecimiento.id,ctx.plan.id))return err("Terminales no incluidas.",403);
 try{
 if(!await terminalesListas(db)||!await pagosMultiplesListos(db))return err("Falta configurar migraciones de terminales y cobros.",503);
 if(request.method==="GET")return json({...await listarTerminales(db,s),expira:s.expira});
 if(!["POST","PATCH"].includes(request.method))return err("Método no permitido.",405);
 const d=await leerJsonLimitado(request,160000);
 if(!d||typeof d!=="object"||Array.isArray(d))return err("Solicitud inválida.",400);
 if(request.method==="POST"&&d.accion==="configurar")return json({terminal:await configurarTerminal(db,s,d),modo:"simulado"});
 if(request.method==="POST"&&d.accion==="solicitar")return json({operacion:await solicitarTerminal(db,s,d),modo:"simulado"});
 if(request.method==="PATCH"&&d.accion==="resolver_historica"&&d.confirmacion==="SIN_ABONO_FICTICIO")return json(await resolverHistorica(db,s,d.operacion_id));
 if(request.method==="PATCH"&&d.accion==="conciliar")return json(await conciliarTerminal(db,s,d.operacion_id));
 if(request.method==="PATCH"&&d.accion==="resolver"){const operacion=await resolverTerminal(db,s,d);let conciliacion=null;if(operacion.estado==="aprobado"){try{conciliacion=await conciliarTerminal(db,s,d.operacion_id);}catch{await db.prepare("INSERT INTO demo_terminal_incidencias(sesion_id,operacion_id,fecha,codigo) VALUES(?,?,?,?) ON CONFLICT DO NOTHING").bind(s.id,d.operacion_id,Date.now(),"CONCILIACION_PENDIENTE").run();conciliacion={registrado:false,incidencia:"Aprobación pendiente de conciliación."};}}return json({operacion,conciliacion,modo:"simulado"});}
 return err("Acción inválida.",400);
 }catch(e){
 if(e instanceof ErrorSolicitud)return err(e.message,e.status);
 const seguros=["Terminal inválida.","Terminal ocupada, proveedor distinto o límite alcanzado.","Solicitud terminal inválida.","Identificador ya utilizado.","Terminal o cuenta ocupada, revisión distinta o límite alcanzado.","Solicitud de abono inválida.","Operación no aprobada.","Solicitud anterior sin datos recuperables.","Resultado terminal inválido.","Operación inexistente o ya resuelta."];
 if(seguros.includes(e.message))return err(e.message,409);
 if(/Resolucion ficticia no permitida|Resolución ficticia no permitida/.test(String(e.message)))return err("Resolución ficticia no permitida.",409);
 if(String(e.message).includes("Bloqueo financiero terminal"))return err("Cuenta o terminal bloqueada por una operación sin conciliar.",409);
 if(String(e.message).includes("Terminal no disponible"))return err("Terminal no disponible.",409);
 return err("No se pudo verificar la operación de terminal.",503);
 }
}
