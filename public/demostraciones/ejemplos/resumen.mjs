// Selección editorial de funciones visibles. No concede acceso ni modifica capacidades.
const destacados={
 "cafe-mirador":["web","catalogo"],
 "barberia-elite":["web","catalogo","citas","agendas"],
 "auto-servicio-bahia":["web","catalogo","citas","agendas"],
 "mundo-mascotas":["catalogo","pedidos","pos","inventario"],
 "taqueria-el-comal":["catalogo","pedidos","mesas","pos","reservaciones"],
 "bahia-tours":["turismo_bilingue","turismo_reservas","turismo_recursos","turismo_cobros","turismo_costos"]
};
const etiquetas={
 web:"Página web e identidad",catalogo:"Catálogo editable",citas:"Reservación de citas",agendas:"Agenda del personal",
 pedidos:"Pedidos y seguimiento",pos:"Punto de venta",inventario:"Control de inventario",mesas:"Servicio y cuentas de mesa",
 reservaciones:"Reservaciones de mesas",turismo_bilingue:"Página bilingüe y experiencias",turismo_reservas:"Reservaciones y disponibilidad",
 turismo_recursos:"Salidas, guías y embarcaciones",turismo_cobros:"Pagos, anticipos y caja",turismo_costos:"Rentabilidad y promociones"
};
export function resumenFicha(id,modulos){
 const disponibles=modulos.filter(m=>m.estadoEfectivo==="disponible"),porId=new Map(disponibles.map(m=>[m.id,m]));
 const orden=destacados[id]??[];
 const seleccion=orden.map(k=>porId.get(k)).filter(Boolean);
 const principales=(seleccion.length?seleccion:disponibles).slice(0,5);
 const ids=new Set(principales.map(m=>m.id));
 return {principales:principales.map(m=>({...m,etiqueta:etiquetas[m.id]??m.nombre})),
 adicionales:disponibles.filter(m=>!ids.has(m.id)),
 pendientes:modulos.filter(m=>["en_desarrollo","ejemplo"].includes(m.estadoEfectivo))};
}
