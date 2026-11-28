// Presentación por giro: no habilita capacidades ni modifica datos.
const perfiles={
 turismo:{catalogo:"Experiencias turísticas",intro:"Organiza las experiencias, reservaciones y operación de Bahía Tours desde un solo lugar.",prioridad:["admin-turismo","admin-salidas","admin-abordaje","admin-economia-turismo","admin-rentabilidad-turismo","admin-catalogo","admin-perfil","admin-empresa"]},
 cafeteria:{catalogo:"Menú y productos",intro:"Actualiza tu menú y atiende los pedidos de tu cafetería.",prioridad:["admin-catalogo","admin-pedidos","admin-pos","admin-cocina","admin-inventario","admin-perfil"]},
 barberia:{catalogo:"Servicios y productos",intro:"Organiza las citas, los servicios y la atención de tu barbería.",prioridad:["admin-citas","admin-catalogo","admin-pos","admin-inventario","admin-empresa","admin-perfil"]},
 tienda:{catalogo:"Productos",intro:"Controla tus productos, ventas y reposición de mercancía.",prioridad:["admin-pos","admin-inventario","admin-catalogo","admin-pedidos","admin-compras","admin-perfil"]},
 taller:{catalogo:"Servicios y refacciones",intro:"Organiza las citas, los servicios y las refacciones del taller.",prioridad:["admin-cotizaciones","admin-citas","admin-catalogo","admin-inventario","admin-pos","admin-compras","admin-perfil"]},
 restaurante:{catalogo:"Menú y platillos",intro:"Atiende los pedidos, organiza las mesas y administra las ventas.",prioridad:["admin-pedidos","admin-cuentas","admin-cocina","admin-pos","admin-mesas","admin-catalogo"]}
};
export function perfilPanel(giro,plan){const p=perfiles[giro]??perfiles.tienda;return {...p,intro:plan==="p1"?"Mantén actualizada la información y el catálogo de tu página.":p.intro,prioridad:plan==="p1"?["admin-catalogo","admin-perfil","admin-empresa"]:p.prioridad};}
export function tituloAdmin(giro,id,defecto){const p=perfilPanel(giro);if(giro==="turismo"&&titulosTurismo[id])return titulosTurismo[id][0];if(id==="admin-catalogo")return p.catalogo;if(id==="admin-recetas"&&!["restaurante","cafeteria"].includes(giro))return "Materiales y costos";return defecto;}
export function priorizarTareas(tareas,giro,plan){const p=perfilPanel(giro,plan),rank=id=>{const n=p.prioridad.indexOf(id);return n<0?999:n;};return [...tareas].sort((a,b)=>rank(a.id)-rank(b.id)).slice(0,plan==="p1"?3:4);}

// Agrupación visual únicamente: cada entrada conserva su ruta, permiso y disponibilidad.
const titulosTurismo={
 "admin-catalogo":["Experiencias","Editar recorridos, tarifas, fotos e información bilingüe"],
 "admin-turismo":["Reservaciones y pasajeros","Consultar reservas, manifiestos y lista de espera"],
 "admin-salidas":["Salidas y recursos","Organizar calendario, guías, embarcaciones y bloqueos"],
 "admin-abordaje":["Control de abordaje","Verificar boletos QR y registrar pasajeros"],
 "admin-economia-turismo":["Pagos, caja y reportes","Registrar anticipos, saldos y movimientos; consultar ventas"],
 "admin-rentabilidad-turismo":["Rentabilidad y promociones","Consultar costos, comisiones y resultados por salida"],
 "admin-calendario":["Calendario externo","Consultar sincronización y conflictos de agenda"]
};
const gruposTurismo=[["General",["admin-resumen"]],["Experiencias y reservaciones",["admin-catalogo","admin-turismo","admin-salidas","admin-abordaje"]],["Finanzas",["admin-economia-turismo","admin-rentabilidad-turismo"]],["Configuración",["admin-perfil","admin-empresa","admin-calendario","admin-auditoria"]],["Mi servicio digital",["admin-suscripcion","admin-soporte"]]];
export function gruposPorGiro(giro,grupos){if(giro!=="turismo")return grupos;const mapa=new Map(grupos.flatMap(([,items])=>items.map(x=>[x[0],x])));return gruposTurismo.map(([g,ids])=>[g,ids.map(id=>mapa.get(id)).filter(Boolean).map(([id,n,d])=>[id,...(titulosTurismo[id]??[n,d])])]);}
