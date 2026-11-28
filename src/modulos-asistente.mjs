import {idsModulos} from "./catalogo-contractual.mjs";
// Guidance describes missing evidence, never operational authority.
// Only web has a complete existing configuration validator at this stage.
const guias={
 web:["perfil","presentacion"],catalogo:["oferta_comercial"],qr_nfc:["credenciales_qr_nfc"],administracion:["politicas_administrativas"],pedidos:["oferta_comercial","canales_pedidos"],seguimiento:["estados_pedidos"],citas:["servicios_publicos","agenda_disponible"],reservaciones:["capacidad_reservas"],qr_mesa:["identificadores_mesa"],agendas:["servicios_publicos","agenda_disponible"],clientes:["directorio_clientes"],cocina:["flujo_cocina"],pagos:["medios_pago"],pos:["oferta_comercial","configuracion_pos"],caja:["configuracion_caja"],comprobantes:["configuracion_comprobantes"],inventario:["catalogo_inventariable"],almacen:["almacenes"],compras:["proveedores"],reportes:["configuracion_reportes"],mesas:["mesas_configuradas"],cotizaciones:["oferta_comercial","configuracion_cotizaciones"],ordenes_servicio:["flujo_ordenes"],fidelizacion:["reglas_fidelizacion"],costos:["estructura_costos"],recetas:["recetas_configuradas"],automatizaciones:["reglas_automatizacion"]
};
export function evaluarModulosAsistente(ruta,perfil,organizacion,empresa,anterior=null){
 if(!ruta.contrato)return {referencia:{empresa,contrato:null,modulos:[]},cambios:null,modulos:[],excluidos:[],paso:{estado_configuracion:"no_aplicable",estado_validacion:"pendiente",faltantes:["contrato_pendiente"]}};
 const mapa=new Map(ruta.modulos.map(m=>[m.id,m])),evaluados=new Map();
 function evaluar(id){
  if(evaluados.has(id))return evaluados.get(id);
  const m=mapa.get(id),requisitos=guias[id]??["configuracion_especifica"];
  const comprobaciones=requisitos.map(k=>({id:k,estado:id==="web"?(perfil.pasos[k]?.estado_validacion==="valido"?"valido":"pendiente"):"sin_integracion"}));
  const faltantes=comprobaciones.filter(v=>v.estado!=="valido").map(v=>v.id);
  if(organizacion.pasos.sucursales.estado_validacion!=="valido")faltantes.push("sucursales");
  const dependencias=m.dependencias.map(evaluar);
  const pendientesDependencias=dependencias.filter(d=>d.estado_validacion!=="valido").map(d=>d.id);
  const configurado=faltantes.length===0,validado=configurado&&pendientesDependencias.length===0;
  const bloqueos=[...(!ruta.contrato.vigente?["contrato_no_vigente"]:[]),...(!m.disponibleTecnico?["pendiente_tecnico"]:[]),...(!m.seleccionado?["seleccion_central_pendiente"]:[]),...dependencias.filter(d=>!d.habilitado).map(d=>"dependencia_no_habilitada:"+d.id)];
  const v={...m,configurado,estado_configuracion:configurado?"configurado":comprobaciones.some(v=>v.estado==="sin_integracion")?"sin_integracion":"incompleto",estado_validacion:validado?"valido":"pendiente",comprobaciones,faltantes,dependencias_pendientes:pendientesDependencias,bloqueos};
  evaluados.set(id,v);return v;
 }
 const modulos=ruta.modulos.map(m=>evaluar(m.id));
 const referencia={empresa,contrato:ruta.contrato,modulos:modulos.map(m=>({id:m.id,seleccionado:m.seleccionado,disponibleTecnico:m.disponibleTecnico,habilitado:m.habilitado,estado_validacion:m.estado_validacion}))};
 const cambios=anterior===null?null:{contrato:anterior.empresa!==empresa||JSON.stringify(anterior.contrato)!==JSON.stringify(referencia.contrato),modulos:anterior.empresa!==empresa||JSON.stringify(anterior.modulos)!==JSON.stringify(referencia.modulos)};
 const faltantes=modulos.filter(m=>m.estado_validacion!=="valido").map(m=>m.id);
 return {referencia,cambios,modulos,excluidos:ruta.excluidos,no_contratados:idsModulos.filter(id=>!mapa.has(id)&&!ruta.excluidos.some(m=>m.id===id)),paso:{estado_configuracion:faltantes.length?"incompleto":"configurado",estado_validacion:faltantes.length?"pendiente":"valido",faltantes}};
}
