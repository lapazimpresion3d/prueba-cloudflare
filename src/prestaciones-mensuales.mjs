// Internal commercial proposal, not a published offer or contractual entitlement.
// No existing plan, price, subscription or operational quota is changed.
import {catalogoInicial} from "./catalogo-contractual.mjs";
const congelar=x=>{if(x&&typeof x==="object"){Object.values(x).forEach(congelar);Object.freeze(x);}return x;};
export const propuestaPrestaciones=congelar({
 version:1,estado:"borrador",moneda:"MXN",aprobada:false,
 comunes:["alojamiento","https","mantenimiento_correctivo","seguridad","actualizaciones_generales","almacenamiento","respaldos","monitoreo","autogestion","soporte_tecnico","diseno_adaptable"],
 condiciones:{horarioSoporte:"lunes a viernes, horario comercial local, por definir",respuesta:"objetivo de primera respuesta en días hábiles, no plazo de resolución ni SLA garantizado",incidenciasPlataforma:"sin descontar de la asistencia de uso",exceso:"avisar y cotizar ampliación antes de aplicar cambios; sin cobro automático ni borrado",respaldo:"objetivo técnico sujeto a pruebas de restauración",dominio:"subdominio incluido; dominio personalizado y renovación por separado",exportacion:"según política de baja y privacidad, pendiente de implementación"},
 extras:["redisenio","captura_masiva","desarrollo_personalizado","fotografia","redes_sociales","publicidad","dominio_personalizado","comisiones_pago","productos_fisicos","capacitacion_adicional"],
 niveles:{
 p1:{productos:100,imagenesMiB:250,datosMiB:100,asistenciaMinutos:15,respuestaDiasHabiles:3,respaldoHoras:168,retencionDias:14},
 p2:{productos:300,imagenesMiB:500,datosMiB:250,asistenciaMinutos:30,respuestaDiasHabiles:2,respaldoHoras:24,retencionDias:14},
 p3:{productos:1000,imagenesMiB:1000,datosMiB:500,asistenciaMinutos:45,respuestaDiasHabiles:2,respaldoHoras:24,retencionDias:30},
 p4:{productos:2500,imagenesMiB:2000,datosMiB:1000,asistenciaMinutos:60,respuestaDiasHabiles:1,respaldoHoras:24,retencionDias:30}
 }
});
export function consultarPropuestaPrestaciones(plan,version=1){
 const contrato=catalogoInicial.find(p=>p.id===plan&&p.version===version);
 if(!contrato||!Object.hasOwn(propuestaPrestaciones.niveles,plan))throw Error("Propuesta no disponible para esa versión.");
 return congelar({estado:"borrador",aprobada:false,plan,version,usuarios:contrato.usuarios,sucursales:contrato.sucursales,comunes:propuestaPrestaciones.comunes,condiciones:propuestaPrestaciones.condiciones,extras:propuestaPrestaciones.extras,limites:propuestaPrestaciones.niveles[plan]});
}
