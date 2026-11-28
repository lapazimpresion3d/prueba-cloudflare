import {crearSucursalesComerciales} from "./sucursales-comerciales.mjs";
import {crearEmpleadosComerciales} from "./empleados-comerciales.mjs";
import {crearRolesOperativos} from "./roles-operativos.mjs";
import {crearAsignacionesPersonal} from "./asignaciones-personal.mjs";
import {crearDisponibilidadLaboral,validarTurnos} from "./disponibilidad-laboral.mjs";
import {validarContacto} from "./contacto-comercial.mjs";
import {validarHorario} from "./horarios-comerciales.mjs";
const paso=faltantes=>({estado_configuracion:faltantes.length?"incompleto":"configurado",estado_validacion:faltantes.length?"pendiente":"valido",faltantes});
// Bounded reads: never certify an incomplete page as complete.
async function pagina(fn,clave){
 const resultado=[];let despues="";
 for(let i=0;i<4;i++){
  const p=await fn(despues);resultado.push(...p[clave]);
  if(p.siguiente===null)return {datos:resultado,truncado:false};
  if(!p.siguiente||p.siguiente===despues)throw Error("Paginación inválida.");
  despues=p.siguiente;
 }
 return {datos:resultado,truncado:true};
}
export async function crearOrganizacionAsistente(env,opciones){
 const [suc,emp,roles,asig,disp]=await Promise.all([crearSucursalesComerciales(env,opciones),crearEmpleadosComerciales(env,opciones),crearRolesOperativos(env,opciones),crearAsignacionesPersonal(env,opciones),crearDisponibilidadLaboral(env,opciones)]);
 return async function consultar(r,empresa,ruta,resumen){
  const b=await pagina(despues=>suc.listar(r,{empresa,despues}),"sucursales");
  const activas=b.datos.filter(v=>v.activa===1),ids=new Set(activas.map(v=>v.id));
  for(const v of b.datos){if(v.contacto!==null)validarContacto(v.contacto);if(v.horario!==null)validarHorario(v.horario);}
  const limite=ruta.contrato?.sucursales??1,fs=[];
  if(b.truncado||activas.length!==resumen.sucursales_activas)fs.push("lectura_sucursales_incompleta");
  if(activas.filter(v=>v.principal===1).length!==1)fs.push("principal_activa");
  if(resumen.sucursales_activas>limite)fs.push("limite_sucursales");
  const sucursales={datos:b.datos,truncado:b.truncado,activas:resumen.sucursales_activas,limite};
  const pasos={sucursales:paso(fs)};
  if(!ruta.pasos.some(p=>p.id==="personal"))return {sucursales,personal:null,pasos};
  const [e,ro,se]=await Promise.all([pagina(despues=>emp.listar(r,{empresa,despues}),"empleados"),roles.listar(r,{empresa}),pagina(despues=>asig.listarServicios(r,{empresa,despues}),"servicios")]);
  const empleados=[],fp=[],recursos=[];
  // Detailed reads are capped to prevent excessive database operations; partial data cannot validate.
  const activos=e.datos.filter(v=>v.activo===1),maxDetalles=20;
  if(e.truncado||se.truncado||ro.length>=100||activos.length>maxDetalles||activas.length>maxDetalles)fp.push("lectura_personal_incompleta");
  if(resumen.usuarios_activos>(ruta.contrato?.usuarios??1))fp.push("limite_usuarios");
  for(const v of activos.slice(0,maxDetalles)){
   const asignacion=await asig.consultar(r,{empresa,empleado:v.id});
   const turno=await disp.consultarTurnos(r,{empresa,empleado:v.id});
   if(turno.turnos)validarTurnos(turno.turnos);
   const faltantes=[];
   if(!asignacion.principal||!asignacion.sucursales_efectivas.includes(asignacion.principal)||asignacion.sucursales.some(k=>!ids.has(k)))faltantes.push("asignacion_laboral");
   if(asignacion.servicios.length!==asignacion.servicios_efectivos.length)faltantes.push("servicios_inactivos");
   if(turno.turnos?.sucursales.some(k=>!asignacion.sucursales_efectivas.includes(k.sucursal)))faltantes.push("turnos_sin_asignacion");
   const acceso=asignacion.acceso;
   if(v.usuario&&acceso?.activa===1&&acceso.alcance==="sucursales"&&(!acceso.sucursales.length||acceso.sucursales.some(k=>!ids.has(k))))faltantes.push("alcance_acceso");
   if(faltantes.length)fp.push("empleado:"+v.id);
   empleados.push({id:v.id,revision:v.revision,asignacion,turno,faltantes});
  }
  for(const v of activas.slice(0,maxDetalles)){
   const p=await pagina(despues=>disp.listarRecursos(r,{empresa,sucursal:v.id,despues}),"recursos");
   if(p.truncado)fp.push("lectura_recursos_incompleta");
   recursos.push({sucursal:v.id,...p});
  }
  pasos.personal=paso(fp);
  return {sucursales,personal:{fichas:e.datos,detalles:empleados,roles:ro,servicios:se.datos,recursos,usuarios_activos:resumen.usuarios_activos,limite_usuarios:ruta.contrato?.usuarios??1,permisos_efectivos_verificados:false},pasos};
 };
}
