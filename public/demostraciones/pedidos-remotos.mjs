// Adaptador de práctica: comparte cookie de sesión entre pestañas del mismo navegador.
// No usa credenciales ni rutas de pedidos operativos.
export function crearPedidosRemotos(id,plan,peticion=fetch){
  const query=new URLSearchParams({negocio:id,plan});
  async function api(ruta,method="GET",datos){
    const res=await peticion("/api/demo/"+ruta,{method,credentials:"same-origin",cache:"no-store",...(datos===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(datos)})});
    let cuerpo;try{cuerpo=await res.json();}catch{throw Error("No se pudo comprobar la respuesta del servidor. Actualiza o reintenta.");}
    if(!res.ok){const e=Error(cuerpo.error||"No se pudo completar la operación.");e.status=res.status;throw e;}
    return cuerpo;
  }
  async function leer(){
    const r=await api("pedidos?"+query);
    if(r.establecimiento!==id||!Array.isArray(r.pedidos)||!Number.isSafeInteger(r.expira))throw Error("Respuesta de pedidos inválida.");
    return r.pedidos;
  }
  async function conectar(){
    const ctx=await api("contexto?"+query);
    if(!ctx.pedidosConfigurados)throw Error("Pedidos en servidor pendientes de configuración. Puedes usar la práctica local.");
    await api("sesion","POST");return leer();
  }
  return {conectar,leer,crear:datos=>api("pedidos?"+query,"POST",datos),cambiar:(solicitud,esperado,destino)=>api("pedidos?"+query,"PATCH",{solicitud,esperado,destino})};
}
export function prepararSolicitudPedido(resumen,personalizado,solicitud){
  return {solicitud,catalogo:personalizado?"personalizado":"original",modalidad:resumen.modalidad,totalEsperado:resumen.total,lineas:resumen.detalle.map(l=>({id:l.id,cantidad:l.cantidad,precioEsperado:l.precioCentavos}))};
}
