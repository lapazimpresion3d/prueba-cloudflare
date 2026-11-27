// Preparación aislada. No importar desde las rutas de práctica ni habilitar cargos.
export function construirOrdenPoint({id,terminal,centavos}){
 if(typeof id!=="string"||!/^[A-Za-z0-9_-]{1,64}$/.test(id)||typeof terminal!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(terminal)||!Number.isSafeInteger(centavos)||centavos<1||centavos>100000000)throw Error("Solicitud Point inválida.");
 return {type:"point",processing_mode:"automatic",external_reference:id,transactions:{payments:[{amount:String(Math.floor(centavos/100))+"."+String(centavos%100).padStart(2,"0")}]},config:{point:{terminal_id:terminal,print_on_terminal:"no_ticket"}}};
}
export function verificarOrdenPoint(o,esperado){
 const p=o?.transactions?.payments;
 if(!o||o.type!=="point"||o.id!==esperado.orderId||String(o.user_id)!==String(esperado.vendedor)||o.external_reference!==esperado.id||o.currency!=="MXN"||o.country_code!=="MEX"||o.config?.point?.terminal_id!==esperado.terminal||!Array.isArray(p)||p.length!==1)return false;
 const importe=construirOrdenPoint(esperado).transactions.payments[0].amount;
 return o.status==="processed"&&o.status_detail==="accredited"&&p[0].status==="processed"&&p[0].status_detail==="accredited"&&typeof p[0].id==="string"&&p[0].id.length>0&&p[0].amount===importe;
}
