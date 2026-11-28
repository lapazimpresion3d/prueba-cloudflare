// Server-side infrastructure gate. Production cannot be enabled by configuration alone.
const uuid=x=>typeof x==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
export function validarEntornoComercial(env){
 if(!env||env.COMERCIAL_ENTORNO!=="desarrollo"||env.COMERCIAL_HABILITADO!=="no")throw Error("Entorno comercial no autorizado.");
 if(env.DB!==undefined||env.DEMO_DB!==undefined||env.ASSETS!==undefined)throw Error("Binding incompatible.");
 if(env.COMMERCE_DB&&env.PROVIDER_DB&&env.COMMERCE_DB===env.PROVIDER_DB)throw Error("Bindings compartidos.");
 return {entorno:"desarrollo",habilitado:false};
}
// Offline manifest verification: compare operator-supplied identifiers, not D1 object identity.
// Must be run with verified identifiers before provisioning. Does not prove actual remote binding.
export function validarInventarioInfraestructura({original,demo,comercial,proveedor}={}){
 const ids=[original,demo,comercial,proveedor];
 if(!ids.every(uuid)||new Set(ids.map(x=>x.toLowerCase())).size!==ids.length)throw Error("Identificadores D1 inválidos o repetidos.");
 return {separacionDeclarada:true};
}
export async function verificarEsquemasComerciales(env){
 validarEntornoComercial(env);
 if(!env.COMMERCE_DB||!env.PROVIDER_DB)throw Error("Bindings pendientes.");
 const c=await env.COMMERCE_DB.prepare("SELECT clave FROM comercio_identidad WHERE clave='lapaz-comercios-v1'").first();
 const p=await env.PROVIDER_DB.prepare("SELECT clave FROM proveedor_identidad WHERE clave='lapaz-proveedores-v1'").first();
 if(c?.clave!=="lapaz-comercios-v1"||p?.clave!=="lapaz-proveedores-v1")throw Error("Esquema incorrecto.");
 const t=await env.COMMERCE_DB.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('comercio_movimientos_financieros','central_anulaciones_pago','membresia_permisos_denegados','comercio_sesiones')").first();
 if(t?.n!==4)throw Error("Esquema comercial incompleto.");
 return {esquemasSeleccionados:true,habilitado:false};
}
