// Pure lifecycle model, independent of access permissions and billing.
export function estadoComercial(s,n){
 if(!Number.isSafeInteger(n)||n<0)throw Error("Fecha inválida.");
 if(!s)return "sin_contratar";
 if(!["activa","prueba","suspendida","cancelada"].includes(s.estado)||!Number.isSafeInteger(s.inicio)||!Number.isSafeInteger(s.vence)||s.vence<=s.inicio)throw Error("Contrato inválido.");
 if(["suspendida","cancelada"].includes(s.estado))return s.estado;
 return n<s.inicio?"programada":n>=s.vence?"vencida":s.estado;
}
export function resolverTransicionComercial(s,accion,n){
 const actual=estadoComercial(s,n);
 if(!s||actual==="cancelada")throw Error("Transición no permitida.");
 if(accion==="suspender"&&["activa","prueba","vencida","programada"].includes(actual))return "suspendida";
 if(accion==="cancelar")return "cancelada";
 // No trial-to-paid conversion or renewal by a lifecycle operation.
 if(accion==="reactivar"&&actual==="suspendida"&&["activa","prueba"].includes(s.estado_previo)&&s.inicio<=n&&n<s.vence)return s.estado_previo;
 throw Error("Transición no permitida.");
}
