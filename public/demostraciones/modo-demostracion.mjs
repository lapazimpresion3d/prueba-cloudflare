// El modo automático conserva historiales separados; no migra operaciones.
export function elegirModo({preferencia=null,locales=0,pendiente=false,personalizado=false,configurado=false,sesion=false,encargado=false,restringida=false}={}){
 if(restringida)return "local";
 if(pendiente||preferencia==="servidor")return "servidor";
 if(preferencia==="local"||locales>0||personalizado)return "local";
 return configurado&&(sesion||!encargado)?"servidor":"local";
}
export function textoDemostracion({ocupado=false,verificado=true,servidor=false,locales=0}={}){
 if(ocupado)return "Preparando tu demostración…";
 if(!verificado)return "No se pudo actualizar. Intenta nuevamente.";
 return "Demostración privada. Tus operaciones son de prueba."; puedes consultarlos en opciones avanzadas.":"Demostración privada. Tus operaciones son de prueba.";
}

export function origenDemostracion({visita=false,pendiente=false,cuenta=false}={}){return visita||pendiente||cuenta?"servidor":"local";}
