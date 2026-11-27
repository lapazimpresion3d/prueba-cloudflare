// Preparación aislada: no importar en worker ni registrar rutas hasta autorización.
export function crearPanelPrivado({sesiones,nucleo,suscripciones,habilitado=false}={}){
 return async function consultar(request,empresa,sucursal=null){
  if(habilitado!==true||request.method!=="GET"||!sesiones||!nucleo||!suscripciones)throw Error("Panel privado deshabilitado.");
  if(!await sesiones.autenticar(request))throw Error("Autenticación requerida.");
  await nucleo.autorizar(request,{empresa,...(sucursal===null?{}:{sucursal}),permiso:"empresa.ver"});
  const plan=await suscripciones.consultar(request,empresa,sucursal);
  if(!plan.vigente)throw Error("Suscripción no vigente.");
  return {empresa,sucursal,plan:plan.plan,estado:plan.estado,usuarios:plan.usuarios,sucursales:plan.sucursales};
 };
}
