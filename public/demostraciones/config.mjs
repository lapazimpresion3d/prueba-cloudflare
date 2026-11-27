// Configuración comercial compartida del escaparate inicial. Importes en centavos, MXN + IVA.
// No es autorización del SaaS. Sin sesiones, D1, datos reales ni operaciones de escritura.
export const planes = [
  { id:"p1", nombre:"Presencia digital", implementacion:75000, mensualidad:14900, moneda:"MXN", descripcion:"Página web y catálogo informativo." },
  { id:"p2", nombre:"Negocio interactivo", implementacion:150000, mensualidad:29900, moneda:"MXN", descripcion:"Interacción con clientes mediante pedidos o citas, según el giro." },
  { id:"p3", nombre:"Gestión comercial", implementacion:250000, mensualidad:44900, moneda:"MXN", descripcion:"Operación interna, punto de venta, caja y gestión comercial." },
  { id:"p4", nombre:"Gestión profesional", implementacion:350000, mensualidad:64900, moneda:"MXN", descripcion:"Administración avanzada y módulos especializados." }
];

// Estado central del escaparate: disponible = realmente utilizable aquí;
// en_desarrollo = requiere implementación/adaptación; ejemplo = vista previa sin operación.
// No elevar un estado hasta contar con pruebas y un adaptador aislado.
export const modulos = [
  {id:"web", nombre:"Página e identidad visual", desde:1, estado:"disponible", detalle:"Identidad, horarios e información ficticia del negocio."},
  {id:"catalogo", nombre:"Catálogo de productos y servicios", desde:1, estado:"disponible", detalle:"Consulta, filtrado y editor de práctica local; no es administración SaaS."},
  {id:"qr_nfc", nombre:"QR y NFC", desde:1, estado:"en_desarrollo", detalle:"Acceso opcional por enlace, QR o NFC; generación y gestión pendientes."},
  {id:"pedidos", nombre:"Pedidos", desde:2, estado:"disponible", giros:["cafeteria","tienda","restaurante"], detalle:"Carrito y pedidos ficticios, en local o sesión privada en servidor cuando esté configurado. Operación real pendiente."},
  {id:"seguimiento", nombre:"Seguimiento de pedidos", desde:2, estado:"disponible", giros:["cafeteria","tienda","restaurante"], depende:["pedidos"], detalle:"Consulta y cambios de estado de práctica; servidor opcional entre pestañas del mismo navegador."},
  {id:"citas", nombre:"Citas de servicios", desde:2, estado:"disponible", giros:["barberia","taller"], detalle:"Reserva ficticia por servicio, profesional, fecha y horario. Modo local o servidor si está configurado."},
  {id:"reservaciones", nombre:"Reservaciones de mesas", desde:2, estado:"disponible", giros:["restaurante"], detalle:"Cinco mesas, horarios, capacidad y agenda privada; servidor opcional."},
  {id:"qr_mesa", nombre:"Pedidos por QR de mesa", desde:2, estado:"disponible", giros:["restaurante"], depende:["pedidos"], detalle:"Enlaces individuales por mesa y QR del Preview P4; no son credenciales de acceso."},
  {id:"agendas", nombre:"Agendas de empleados", desde:2, estado:"disponible", giros:["barberia","taller"], depende:["citas"], detalle:"Agenda de práctica por profesional con horarios y descansos de ejemplo, modo servidor opcional; configuración editable pendiente."},
  {id:"clientes", nombre:"Gestión de clientes", desde:2, estado:"en_desarrollo", detalle:"Registros y permisos por establecimiento."},
  {id:"administracion", nombre:"Panel administrativo", desde:1, estado:"en_desarrollo", detalle:"Edición autorizada y persistente en servidor pendiente. Hay un editor de práctica local del catálogo."},
  {id:"cocina", nombre:"Cocina", desde:2, estado:"disponible", giros:["restaurante","cafeteria"], depende:["pedidos"], detalle:"Comandas activas, preparación y pedido listo, sincronizados en la sesión de práctica."},
  {id:"pagos", nombre:"Registro de pagos", desde:2, estado:"disponible", giros:["restaurante","cafeteria","tienda"], depende:["pedidos"], detalle:"Cobros simulados, efectivo, transferencias y conciliación por pedido; no procesa dinero real."},
  {id:"pos", nombre:"Punto de venta", desde:3, estado:"disponible", detalle:"Ventas de mostrador ficticias, productos y servicios, cobro simulado y ticket local. Sin caja real ni sincronización con cocina."},
  {id:"caja", nombre:"Caja y cortes", desde:3, estado:"disponible", depende:["pos"], detalle:"Turnos locales de práctica, fondo inicial, movimientos, arqueo y corte vinculados al POS. Sin dinero real."},
  {id:"comprobantes", nombre:"Tickets y comprobantes", desde:3, estado:"disponible", depende:["pos","caja"], detalle:"Tickets, cancelaciones y cortes ficticios; formatos térmicos 58/80 mm, descarga TXT e impresión mediante navegador."},
  {id:"inventario", nombre:"Inventario", desde:3, estado:"en_desarrollo", detalle:"Existencias y movimientos de productos e insumos."},
  {id:"reportes", nombre:"Reportes", desde:3, estado:"en_desarrollo", detalle:"Métricas y exportaciones por establecimiento."},
  {id:"mesas", nombre:"Servicio y comandas por mesa", desde:3, estado:"disponible", giros:["restaurante"], depende:["cocina","qr_mesa"], detalle:"Agrupación de pedidos activos por mesa y entrega individual. Cuenta abierta en servidor, captura de comandas y cierre conciliado."},
  {id:"cotizaciones", nombre:"Cotizaciones", desde:3, estado:"en_desarrollo", giros:["taller","barberia","tienda"], detalle:"Propuestas, vigencia y aceptación."},
  {id:"ordenes_servicio", nombre:"Órdenes de servicio", desde:3, estado:"en_desarrollo", giros:["taller"], detalle:"Trabajos, refacciones, mano de obra e historial."},
  {id:"fidelizacion", nombre:"Fidelización", desde:4, estado:"en_desarrollo", depende:["clientes"], detalle:"Beneficios e historial de clientes."},
  {id:"costos", nombre:"Costos y administración avanzada", desde:4, estado:"en_desarrollo", detalle:"Costos, compras y reportes profesionales."},
  {id:"recetas", nombre:"Recetas e insumos", desde:4, estado:"en_desarrollo", giros:["restaurante","cafeteria"], depende:["inventario"], detalle:"Consumo, mermas y costos de alimentos."},
  {id:"automatizaciones", nombre:"Automatizaciones", desde:4, estado:"en_desarrollo", detalle:"Flujos especializados y notificaciones."}
];

export function capacidades(establecimiento, planId, registro = modulos) {
  const nivel = planes.findIndex(p => p.id === planId) + 1;
  if (!establecimiento || !nivel) return [];
  const aplicables = registro.filter(m => !m.giros || m.giros.includes(establecimiento.giro));
  const porId = new Map(aplicables.map(m => [m.id,m]));
  function disponible(m, visitados = new Set()) {
    if (!m || m.desde > nivel || m.estado !== "disponible" || visitados.has(m.id)) return false;
    const ruta = new Set([...visitados,m.id]);
    return (m.depende || []).every(id => disponible(porId.get(id),ruta));
  }
  return aplicables.map(m => ({
    ...m,
    estadoEfectivo: m.desde > nivel ? "otro_plan" : disponible(m) ? "disponible" : m.estado === "ejemplo" ? "ejemplo" : "en_desarrollo"
  }));
}
export function importe(centavos, moneda = "MXN") {
  return new Intl.NumberFormat("es-MX",{style:"currency",currency:moneda}).format(centavos/100);
}

// Límites iniciales provisionales; los contratos versionados conservan sus propios valores.
export const limitesPlanes=Object.freeze(Object.fromEntries(Object.entries({p1:[1,1],p2:[3,1],p3:[5,2],p4:[10,3]}).map(([k,v])=>[k,Object.freeze(v)])));
