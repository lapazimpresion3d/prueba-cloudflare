import {mesasComal} from "./mesas-practica.mjs";
export const admiteCuentas=(id,plan)=>id==="taqueria-el-comal"&&["p3","p4"].includes(plan);
export const cuentaIdValida=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
export function validarApertura(d){
 const mesa=mesasComal.find(m=>m.id===d?.mesa);
 if(!cuentaIdValida(d?.cuenta)||!mesa||!Number.isSafeInteger(d.personas)||d.personas<1||d.personas>mesa.capacidad)throw Error("Selecciona una mesa y cantidad de personas válida.");
}
export function consumoCuenta(c,pedidos){
 const todos=pedidos.filter(p=>p.cuenta===c.cuenta_id),activos=todos.filter(p=>p.estado!=="cancelado");
 const total=activos.reduce((n,p)=>n+p.total,0),cobrado=activos.reduce((n,p)=>n+(p.cobro?.importeCentavos===p.total?p.total:0),0);
 return {todos,total,cobrado,pendiente:total-cobrado,porEntregar:activos.filter(p=>p.estado!=="entregado").length,puedeCerrar:c.cerrado===null&&total===cobrado&&activos.every(p=>p.estado==="entregado")};
}
export function enlaceComanda(c,plan,origen="mesero"){
 if(!cuentaIdValida(c.cuenta_id)||!admiteCuentas("taqueria-el-comal",plan)||!["mesero","cliente"].includes(origen))throw Error("Cuenta inválida.");
 return "/demostraciones/negocio/?"+new URLSearchParams({negocio:"taqueria-el-comal",plan,mesa:c.mesa,cuenta:c.cuenta_id,captura:origen});
}
