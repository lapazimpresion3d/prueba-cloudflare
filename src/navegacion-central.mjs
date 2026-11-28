// Closed navigation manifest. No capability inferred from a menu entry.
const secciones=[
 ["inicio","Inicio","Resumen general", "disponible"],
 ["comercios","Comercios","Directorio y expedientes","disponible"],
 ["prospectos","Prospectos y altas","Contratación autorizada","disponible"],
 ["planes","Paquetes y versiones","Catálogo contractual","pendiente"],
 ["implementaciones","Implementación y entrega","Seguimiento comercial","pendiente"],
 ["ciclo","Ciclo de vida","Suspensión, recuperación y baja","pendiente"],
 ["operadores","Operadores y seguridad","Accesos administrativos","pendiente"],
 ["auditoria","Auditoría y exportaciones","Historial y conservación","pendiente"]
];
export const navegacionCentral=Object.freeze(secciones.map(([id,nombre,descripcion,estado])=>Object.freeze({id,nombre,descripcion,estado})));
export function seccionCentral(id){return navegacionCentral.find(s=>s.id===id)??null;}
