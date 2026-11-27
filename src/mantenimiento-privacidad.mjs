// Internal maintenance only. No HTTP route. No customer/financial record deletion.
export const politicaRetencion=Object.freeze({sesionesDias:7,invitacionesDias:30,loteMaximo:100});
const DIA=86400000;
export async function crearMantenimientoPrivacidad(env,{habilitado=false,reloj=Date.now}={}){
 const db=env.COMMERCE_DB;
 if(!db||[env.DB,env.DEMO_DB,env.PROVIDER_DB].includes(db))throw Error("Base comercial no configurada.");
 if(!(await db.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first()))throw Error("Esquema incorrecto.");
 const q=(sql,...args)=>db.prepare(sql).bind(...args);
 function parametros(limite){if(habilitado!==true)throw Error("Mantenimiento deshabilitado.");const n=reloj();if(!Number.isSafeInteger(n)||n<30*DIA||!Number.isSafeInteger(limite)||limite<1||limite>politicaRetencion.loteMaximo)throw Error("Parámetros inválidos.");return [n-7*DIA,n-30*DIA,limite];}
 // Conservatively retain even idle sessions until absolute expiry + grace period.
 const sesiones="expira<=? OR (revocado IS NOT NULL AND revocado<=?)";
 // consumed is a unique consumption marker, not a timestamp; use absolute expiry only.
 const invitaciones="expira<=?";
 return Object.freeze({
 async estimar({limite=100}={}){const [s,i,l]=parametros(limite);const r=await q("SELECT (SELECT count(*) FROM comercio_sesiones WHERE "+sesiones+") AS sesiones,(SELECT count(*) FROM comercio_invitaciones WHERE "+invitaciones+") AS invitaciones",s,s,i).first();return {...r,limite:l};},
 async limpiar({limite=100,confirmar=false}={}){const [s,i,l]=parametros(limite);if(confirmar!==true)throw Error("Confirmación requerida.");
 const r=await db.batch([
 q("DELETE FROM comercio_sesiones WHERE hash IN (SELECT hash FROM comercio_sesiones WHERE "+sesiones+" ORDER BY expira,hash LIMIT ?) AND ("+sesiones+")",s,s,l,s,s),
 q("DELETE FROM comercio_invitaciones WHERE hash IN (SELECT hash FROM comercio_invitaciones WHERE "+invitaciones+" ORDER BY expira,hash LIMIT ?) AND ("+invitaciones+")",i,l,i)
 ]);return {sesiones:r[0].meta.changes,invitaciones:r[1].meta.changes};
 }
 });
}
