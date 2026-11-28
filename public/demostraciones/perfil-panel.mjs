// Presentación por giro: no habilita capacidades ni modifica datos.
const perfiles={
 turismo:{catalogo:"Experiencias turísticas",intro:"Administra experiencias bilingües, reservaciones, salidas y las herramientas turísticas disponibles en tu paquete.",prioridad:["admin-turismo","admin-salidas","admin-abordaje","admin-economia-turismo","admin-rentabilidad-turismo","admin-catalogo","admin-perfil","admin-empresa"]},
 cafeteria:{catalogo:"Menú y productos",intro:"Actualiza tu menú y atiende los pedidos de tu cafetería.",prioridad:["admin-catalogo","admin-pedidos","admin-pos","admin-cocina","admin-inventario","admin-perfil"]},
 barberia:{catalogo:"Servicios y productos",intro:"Organiza las citas, los servicios y la atención de tu barbería.",prioridad:["admin-citas","admin-catalogo","admin-pos","admin-inventario","admin-empresa","admin-perfil"]},
 tienda:{catalogo:"Productos",intro:"Controla tus productos, ventas y reposición de mercancía.",prioridad:["admin-pos","admin-inventario","admin-catalogo","admin-pedidos","admin-compras","admin-perfil"]},
 taller:{catalogo:"Servicios y refacciones",intro:"Organiza las citas, los servicios y las refacciones del taller.",prioridad:["admin-cotizaciones","admin-citas","admin-catalogo","admin-inventario","admin-pos","admin-compras","admin-perfil"]},
 restaurante:{catalogo:"Menú y platillos",intro:"Atiende los pedidos, organiza las mesas y administra las ventas.",prioridad:["admin-pedidos","admin-cuentas","admin-cocina","admin-pos","admin-mesas","admin-catalogo"]}
};
export function perfilPanel(giro,plan){const p=perfiles[giro]??perfiles.tienda;return {...p,intro:plan==="p1"?"Mantén actualizada la información y el catálogo de tu página.":p.intro,prioridad:plan==="p1"?["admin-catalogo","admin-perfil","admin-empresa"]:p.prioridad};}
export function tituloAdmin(giro,id,defecto){const p=perfilPanel(giro);if(id==="admin-catalogo")return p.catalogo;if(id==="admin-recetas"&&!["restaurante","cafeteria"].includes(giro))return "Materiales y costos";return defecto;}
export function priorizarTareas(tareas,giro,plan){const p=perfilPanel(giro,plan),rank=id=>{const n=p.prioridad.indexOf(id);return n<0?999:n;};return [...tareas].sort((a,b)=>rank(a.id)-rank(b.id)).slice(0,plan==="p1"?3:4);}
