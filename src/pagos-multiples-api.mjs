// API privada de práctica. No es una integración bancaria.
import {admiteCuentas,cuentaIdValida} from "../public/demostraciones/cuentas-practica.mjs";
import {leerJsonLimitado,ErrorSolicitud} from "./seguridad.mjs";
import {pagosMultiplesListos,leerPlanCobro,guardarMovimiento,cerrarCuentaMultiple} from "./pagos-multiples-demo.mjs";
export async function atenderPagosMultiples(request,db,s,ctx,url,json){
 const err=(error,status)=>json({error},status);
 if(!admiteCuentas(ctx.establecimiento.id,ctx.plan.id))return err("Pagos múltiples no incluidos.",403);
 if(!await pagosMultiplesListos(db))return err("Falta configurar las migraciones de pagos múltiples.",503);
 const cuenta=url.searchParams.get("cuenta");
 if(!cuentaIdValida(cuenta))return err("Cuenta inválida.",400);
 const metodo=request.method;
 if(!["GET","POST","PATCH"].includes(metodo))return err("Método no permitido.",405);
 try{
  if(metodo==="GET")return json({cuenta,modo:"simulado",...await leerPlanCobro(db,s,cuenta)});
  const d=await leerJsonLimitado(request,160000);
  if(!d||typeof d!=="object"||Array.isArray(d)||!Number.isSafeInteger(d.revision)||d.revision<0||d.revision>100)return err("Solicitud o revisión inválida.",400);
  if(metodo==="POST"){
   if(d.accion!==undefined||typeof d.id!=="string"||!Number.isSafeInteger(d.consumoCentavos)||!["efectivo","transferencia","tarjeta_externa"].includes(d.metodo))return err("Movimiento inválido.",400);
   const resultado=await guardarMovimiento(db,s,cuenta,d);
   return json({cuenta,modo:"simulado",...resultado},resultado.repetido?200:201);
  }
  if(["anular","reasignar"].includes(d.accion)){const resultado=await guardarMovimiento(db,s,cuenta,d);return json({cuenta,modo:"simulado",...resultado});}
  if(d.accion!=="cerrar"||d.revision<1)return err("Acción inválida.",400);
  return json({modo:"simulado",cuenta:await cerrarCuentaMultiple(db,s,cuenta,d.revision)});
 }catch(e){
  if(e instanceof ErrorSolicitud)return err(e.message,e.status);
  // Solo mensajes de dominio conocidos; nunca exponer errores internos de D1.
  const m=e?.message||"";
  const seguros=["Cuenta no disponible.","La cuenta tiene cobros anteriores o comandas pendientes.","La cuenta cerrada no tiene pagos múltiples.","El consumo cambió; requiere conciliación.","La cuenta cambió o expiró. Actualiza antes de reintentar.","La cuenta cambió o tiene saldo pendiente.","La cuenta cambió o la sesión expiró.","Importe inválido.","Identificador inválido.","Método no disponible en práctica.","Importe recibido incorrecto.","Usa un folio ficticio DEMO-123456.","Identificador ya utilizado.","La cuenta cambió. Actualiza.","Límite de movimientos de práctica.","El abono excede el saldo.","Folio repetido.","Primero asigna los productos.","No se puede dividir una cuenta con abonos previos.","Asigna todos los productos antes de cobrar.","La división ya está fijada.","Selecciona un comensal.","El abono excede el saldo individual.","Asignación inválida.","Producto o comensal inválido o repetido.","Motivo de anulación inválido.","Pago inexistente o ya anulado.","No existe división.","Aprobación de terminal no verificada.","Aprobación simulada inválida.","Motivo de reasignación inválido.","No se puede cambiar el consumo de un comensal con pagos activos."];
  if(m.includes('Bloqueo financiero terminal'))return err('Cuenta bloqueada por una operación de terminal sin conciliar.',409);
  if(seguros.includes(m))return err(m,409);
  return err("No fue posible completar la operación. Actualiza antes de reintentar.",503);
 }
}
