// Proyección de un acuerdo estrictamente ficticio. No lee ni escribe contratos o pagos reales.
import {obtenerEstablecimiento} from "./establecimientos.mjs";
import {planes,capacidades,limitesPlanes} from "./config.mjs";
const bolsa=Object.freeze({p1:15,p2:30,p3:45,p4:60});
export const prestacionesEjemplo=Object.freeze(["Uso de la plataforma según el paquete","Alojamiento","Mantenimiento preventivo","Seguridad","Soporte técnico","Respaldos","Actualizaciones generales compatibles"]);
export const estadosModulo=Object.freeze({disponible:"Disponible en práctica",en_desarrollo:"Pendiente de desarrollo",ejemplo:"Ejemplo sin operación"});
// Fecha fija deliberada: el reloj no simula pagos ni renovaciones que nunca se registraron.
export function consultarSuscripcionPractica(id,planId){
 const e=obtenerEstablecimiento(id),p=planes.find(x=>x.id===planId);
 if(!e||!p)throw Error("Negocio o paquete de práctica desconocido.");
 const base=p.mensualidad,iva=Math.round(base*16/100),total=base+iva,[usuarios,sucursales]=limitesPlanes[p.id];
 const pagos=[["2026-09","2026-09-01"],["2026-10","2026-10-01"],["2026-11","2026-11-01"]].map(([periodo,fecha])=>({periodo,fecha,base,iva,total,estado:"registrado",ficticio:true}));
 return {modo:"demo-ficticia",negocio:{id:e.id,nombre:e.nombre,giro:e.giro},acuerdo:{version:"demo-v1",plan:p.id,nombre:p.nombre,estado:"activo",situacion:"al_corriente",fechaCorte:"2026-11-28",inicio:"2026-09-01",renovacion:"2026-12-01",moneda:p.moneda,base,iva,total,tasaIva:16},pagos,limites:{usuarios,sucursales,almacenamiento:null},prestaciones:[...prestacionesEjemplo],cambiosMenores:{minutos:bolsa[p.id],acumulable:false,consumo:null},modulos:capacidades(e,p.id).filter(m=>m.estadoEfectivo!=="otro_plan").map(m=>({id:m.id,nombre:m.nombre,estado:m.estadoEfectivo,detalle:m.detalle})),condiciones:["La autoadministración de funciones habilitadas no genera cargos ni consume minutos.","Los errores y el mantenimiento no descuentan automáticamente la bolsa de cambios menores.","Los cambios menores son complementarios y no acumulables; se aplican solo según el acuerdo.","El trabajo adicional requiere autorización previa.","Las actualizaciones generales compatibles no garantizan funciones nuevas cada mes ni desarrollo personalizado ilimitado.","No hay cargos automáticos ni suspensión automática por impago."]};
}
