import {contextoEmpresa} from "../empresa-practica.mjs";
import {contextoVista} from "../vista-rol.mjs";
import {leerAuditoria} from "../auditoria-practica.mjs";
import {montarHistorial} from "../historial-ui.mjs";
const q=new URLSearchParams(location.search),id=q.get("negocio"),plan=q.get("plan"),c=contextoEmpresa(id,plan),v=contextoVista(id,plan,q,localStorage);
if(v.activa||v.invalida)throw Error("Solo la vista del propietario puede consultar este historial de práctica.");
montarHistorial(document.getElementById("historial"),leerAuditoria(localStorage,c.clave),{nombre:c.negocio.nombre});
