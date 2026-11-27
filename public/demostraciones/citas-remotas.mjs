// Modo remoto explícito, misma cookie privada que las demás prácticas.
export function crearCitasRemotas(id,plan,peticion=fetch){
 const q=new URLSearchParams({negocio:id,plan});
 async function api(ruta,method="GET",datos){
  const res=await peticion("/api/demo/"+ruta,{method,credentials:"same-origin",cache:"no-store",...(datos===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(datos)})});
  let cuerpo;try{cuerpo=await res.json();}catch{throw Error("No se pudo verificar la respuesta. Actualiza o reintenta.");}
  if(!res.ok){const e=Error(cuerpo.error||"Operación no disponible.");e.status=res.status;throw e;}return cuerpo;
 }
 async function leer(){
  const r=await api("citas?"+q);
  if(r.establecimiento!==id||!Array.isArray(r.citas)||!Number.isSafeInteger(r.expira))throw Error("Respuesta de agenda inválida.");
  return r;
 }
 async function disponibilidad(){const ctx=await api("contexto?"+q);return ctx.citasConfiguradas===true;}
 async function conectar(){
  if(!await disponibilidad())throw Error("Agenda en servidor pendiente de configuración. Usa práctica local.");
  await api("sesion","POST");return leer();
 }
 return {leer,conectar,disponibilidad,crear:d=>api("citas?"+q,"POST",d),cambiar:(solicitud,esperado,destino)=>api("citas?"+q,"PATCH",{solicitud,esperado,destino})};
}
export function prepararCita(datos,p,personalizada,solicitud){
 return {...datos,solicitud,catalogo:personalizada?"personalizado":"original",precioEsperado:p.precioCentavos,duracionEsperada:p.duracionMinutos};
}
