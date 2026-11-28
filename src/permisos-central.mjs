const lectura=["inicio","comercios","prospectos","planes","implementaciones","ciclo","auditoria"];
export const rolesCentral=Object.freeze({
 administrador:Object.freeze([...lectura,"operadores","prospectos.escribir","planes.escribir","implementaciones.escribir","ciclo.escribir","operadores.escribir","auditoria.exportar"]),
 comercial:Object.freeze(["inicio","comercios","prospectos","planes","ciclo","prospectos.escribir"]),
 implementacion:Object.freeze(["comercios","implementaciones","implementaciones.escribir"]),
 consulta:Object.freeze(["inicio","comercios","planes","implementaciones","ciclo"])
});
export function permiteCentral(rol,permiso){return Object.hasOwn(rolesCentral,rol)&&rolesCentral[rol].includes(permiso);}
