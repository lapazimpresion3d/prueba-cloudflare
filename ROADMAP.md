# ROADMAP — Plataforma SaaS multicomercio de Lapazimpresion3d
Actualización estratégica: 2026-11-26. Este documento sustituye la estrategia exclusivamente multirrestaurante y el orden anterior. Los informes históricos y las mejoras de El Comal se conservan.

## 1. Objetivo general
Construir una plataforma modular de gestión comercial reutilizable, rentable y competitiva para restaurantes y cafeterías, barberías y salones de belleza, tiendas minoristas, talleres mecánicos, negocios de servicios, emprendedores y otros giros configurables.
- Un código compartido, sin aplicaciones ni forks por cliente. Separar núcleo común, módulos de negocio y plantillas por giro.
- Arquitectura multiestablecimiento, multisucursal, aislamiento de datos, usuarios, permisos y módulos/planes desde las primeras etapas. El núcleo no depende de mesas, ingredientes, comandas o cocina.
- Taquería El Comal es el primer establecimiento de demostración, entorno principal de desarrollo/pruebas y futura demo restaurantera más avanzada. Conservar todas sus funciones y sus datos mediante adaptación progresiva y pruebas de regresión; no reescribir ni romper la versión estable.
- Cada versión comercial debe funcionar, ser segura, estable y vendible independientemente de módulos o giros futuros. No desarrollar todos los giros simultáneamente.
- QR/NFC y canales de autoservicio opcionales. Un comercio puede operar mediante atención tradicional, carta impresa, mostrador o empleados sin teléfono del cliente.
- Priorizar facilidad de uso, aprovisionamiento automático, mantenimiento compartido, costos operativos medidos, diferenciación y márgenes sostenibles.
- Trabajar en desarrollo. No modificar ni fusionar main, publicar producción, ejecutar migraciones remotas ni eliminar datos sin autorización y verificación del entorno. El escaparate temprano de demostraciones se permite en desarrollo sin tocar datos ni API operativas; la implementación del núcleo y migraciones sigue su orden y controles.

## 2. Planes comerciales vigentes
| Versión | Plan | Implementación MXN + IVA | Mensualidad MXN + IVA |
| --- | --- | ---: | ---: |
| P1 | Presencia digital | 750 | 149 |
| P2 | Negocio interactivo | 1500 | 299 |
| P3 | Gestión comercial | 2500 | 449 |
| P4 | Gestión profesional | 3500 | 649 |

El superadministrador podrá configurar planes, precios en centavos, moneda, condiciones fiscales, vigencia, módulos adicionales, límites por módulo (p. ej., sucursales, usuarios, almacenamiento), promociones y precios especiales. Los valores de límites, descuentos y reglas de permanencia no se fijan aquí. Distinguir precio publicado, oferta especial y condiciones de la suscripción contratada; no modificar contratos existentes automáticamente. Separar suscripción comercial SaaS de cobros internos del negocio. No prometer facturación CFDI o pagos automáticos hasta implementar y validar alcance.

### Alcance inicial propuesto (no implementado ni oferta final por módulo)
| Capacidad | P1 | P2 | P3 | P4 |
| --- | --- | --- | --- | --- |
| Perfil, página, marca, catálogo informativo, QR/NFC de acceso | Sí | Sí | Sí | Sí |
| Pedidos interactivos o citas/agenda, según giro | No | Sí | Sí | Sí |
| Clientes operativos, seguimiento y reportes básicos | No | Básico | Sí | Sí |
| POS, caja, tickets e inventario básico | No | No | Sí | Sí |
| Cotizaciones y órdenes de servicio, según giro | No | Según oferta adicional | Sí | Sí |
| Mesas/comandas/cocina, según giro | No | Cocina y pedidos básicos | Sí | Sí |
| Inventario/costos avanzados, fidelización y automatizaciones | No | No | Según oferta adicional | Sí |
| Reportes avanzados y administración profesional | No | No | No | Sí |

Los planes superiores pueden heredar capacidades, pero una capacidad contratada no obliga a activarla. El giro es una plantilla, no un mecanismo de autorización. No se incluye automáticamente un módulo aún no desarrollado o probado. El catálogo de planes debe permitir ampliar la oferta sin duplicar código.

## 3. Arquitectura objetivo
### Núcleo común
Establecimientos, sucursales, resolución de contexto por URL/dominio, usuarios, membresías, roles y permisos, sesiones revocables, suscripciones, catálogo de planes, clientes y empleados (identidad/datos básicos), configuraciones, personalización visual, seguridad, auditoría, respaldo/restauración, aprovisionamiento y administración central.
Los clientes y empleados tienen entidades base comunes; las operaciones de clientes, CRM/fidelización, agendas y otras funciones son módulos, no dependencias obligatorias del núcleo.
### Módulos independientes
- Presencia: páginas web, catálogos, productos y servicios, QR/NFC.
- Operación: pedidos, citas y reservaciones, agendas de empleados, POS, caja, inventarios, clientes (gestión ampliada), fidelización, cotizaciones, órdenes de servicio, reportes.
- Restauración: mesas, comandas, cocina, personalización de alimentos, modalidades de atención y reservas de mesa.
Módulos con identificador estable, versión, dependencias, permisos, contratos API, esquema propio, eventos y capacidades/limites; autorización explícita en servidor e interfaz. Separar canal, giro, rol, suscripción, módulo y sucursal.
Productos físicos, alimentos y servicios como tipos distintos de una oferta comercial común, con atributos y validaciones específicos. No exigir ingredientes, duración o inventario a todos. Reservaciones genéricas de recursos (empleados, mesas u otros) con políticas por módulo.
### Plantillas
Catálogo de plantillas por giro; sugerir módulos, configuración, datos ficticios/semilla, roles, navegación y textos. Aplicar solo la intersección de módulos disponibles/contratados, dependencias satisfechas y elección del comercio; nunca conceder derechos por plantilla. Permitir activar/desactivar módulos y modificar configuración conservando datos y auditoría. Aprovisionamiento idempotente.
### Aislamiento
Evaluar ADR entre D1 compartida con ámbito obligatorio/relaciones compuestas, D1 separadas y modelo híbrido con plano de control central. Verificar costos, límites, migración, recuperación y acceso cruzado; no decidir ni ejecutar prematuramente. La sucursal pertenece al establecimiento; validar contexto y pertenencia en cada consulta, token, foto, exportación, caché, QR, tarea y almacenamiento de navegador. Sin fallback a otro establecimiento.

## 4. Prioridades de desarrollo (orden de implementación del núcleo)
### Línea paralela temprana — Demostraciones comerciales
- [x] Escaparate compartido en /demostraciones/, con cinco identidades ficticias, catálogos tipados separados, selector de cuatro planes y registro común de capacidades.
- [x] Configuración de precios en centavos y estados de disponibilidad; enlaces a vistas originales de El Comal sin modificar su lógica.
- [x] Pruebas de las 20 combinaciones, filtros, dependencias y estados; pendientes navegador real y despliegue de desarrollo.
- [ ] Conectar el escaparate a un registro central de capacidades verificadas en servidor cuando el núcleo y el sistema de módulos estén listos. El selector no cambia suscripciones reales ni concede permisos.
- [ ] Reutilizar componentes operativos de El Comal mediante adaptadores con ámbito y datos ficticios, validar cada módulo antes de habilitarlo en giros compatibles.
- [x] Vista individual por negocio (?vista=negocio), editor de práctica local del catálogo con alta, edición, disponibilidad, baja y restauración por establecimiento. Persistencia en sessionStorage con fallback a memoria, sin datos reales ni API. 15 pruebas lógicas en total aprobadas; navegador/preview pendientes.
- [ ] Implementar administración autorizada en servidor y operaciones interactivas aisladas, sesiones y reinicio controlado de datos demo; nunca usar datos de clientes reales. El editor local no sustituye la administración SaaS. Las nuevas funciones verificadas se incorporarán al registro compartido, no a cinco copias independientes.
- La galería inicial no equivale a cinco instalaciones SaaS operativas ni a certificación de seguridad. No mostrar como funcional un módulo no implementado o no adaptado.
### Etapa 0 — Auditoría del código existente (prioridad 1, actual)
- [x] Verificar SHA de desarrollo/main, leer ROADMAP y auditoría previa; revisar módulos críticos de negocio, catálogo, pedidos, reservas y Worker.
- [x] Registrar ampliación multicomercio, identificar acoplamientos restauranteros y diseñar mapa conceptual de módulos en docs/arquitectura-multicomercio.md y docs/auditoria-multicomercio-2026-11-26.md.
- [ ] Completar inventario de rutas, consultas, activos, dependencias y esquema; pruebas de regresión de El Comal en entorno aislado.
- [ ] Confirmar bindings efectivos, entorno de preview, migraciones 0001–0018 y estado de 0018; respaldo y restauración en base separada. No dar por aplicado lo no verificado.

### Etapa 1 — Diseño de arquitectura multicomercio (prioridad 2)
- Definir ADR de aislamiento, entidades y relaciones, contexto establecimiento/sucursal, contrato de autorización, dominios modulares, identificadores y compatibilidad de API.
- Diseñar ofertas comerciales tipadas (físico, alimento, servicio), recursos/capacidades, políticas de agenda, precios, instantáneas históricas, separación de cobros de suscripción y de ventas.
- Contratos de módulos/dependencias, catálogo de plantillas, estrategia de habilitación y límites, configuración visual, arquitectura de provisión.
- Plan de migración no destructiva de El Comal a una base aislada; conservar folios, fotos, precios, estados, tokens, reservas, historial y preferencias; conteos, conciliación de importes, rollback y compatibilidad de URLs. No modificar base estable.
- Diseñar y probar casos de dos giros y dos sucursales con IDs coincidentes antes de autorizar datos reales. No esperar funciones avanzadas de todos los módulos.

### Etapa 2 — Implementar núcleo compartido (prioridad 3)
- Establecimientos, sucursales, dominio/slug, identidad, membresías, permisos por operación y alcance, sesiones revocables, cliente/empleado base, marca y configuración, auditoría, seguridad y respaldos.
- Resolver contexto en servidor y aplicar pertenencia obligatoria. Superadmin separado con acceso explícito y auditado. Configuración por sucursal con herencia explícita.
- Infraestructura de provisión, entornos separados para desarrollo, demos y producción, pruebas de aislamiento por API/URL/consulta/foto/token/CSV/cache y restauración.
- Migración incremental de datos y adaptadores de compatibilidad de El Comal solo en entorno aislado. No retirar funciones existentes.

### Etapa 3 — Sistema de módulos, planes y plantillas (prioridad 4)
- Registro modular, dependencias acíclicas, permisos, límites, activación efectiva, configuración y navegación. Rechazar API no contratada incluso por llamada directa.
- Panel superadministrador: establecimientos/sucursales, planes, suscripciones, asignaciones, módulos adicionales, límites, promociones, precios especiales, configuración y auditoría; aprovisionamiento idempotente.
- Cambios de plan sin pérdida de información, reglas explícitas de suspensión, exportación autorizada y reactivación. Límites de nuevas escrituras aplicados atómicamente; no borrar datos para cumplir límites.
- Plantillas por giro con activación automática de módulos disponibles y autorizados, personalización posterior, datos demo separados. Pruebas de activación, desactivación, dependencias, precio/contrato, concurrencia y permisos.

### Etapa 4 — Páginas web y catálogos (prioridad 5)
- Página adaptable, marca, horarios, sucursales, ubicación, contacto, catálogo opcional, productos físicos/alimentos/servicios y fotos con ámbito, panel editable, enlaces y QR/NFC opcionales.
- Generalizar el escaparate temprano de los cinco establecimientos al módulo web/catálogo autorizado en servidor. Café Mirador será piloto P1, sin esperar P2/P3/P4.
- Alta guiada, accesibilidad, móvil, respaldo de contenido, costo de operación, documentación comercial y soporte.

### Etapa 5 — Citas y agendas (prioridad 6)
- Recursos, empleados, horarios, duración, capacidad, bloqueos, disponibilidad, asignación, cancelación/reprogramación y prevención atómica de traslapes; clientes base y privacidad.
- Barbería Elite como primer piloto de agenda; reusar para servicios y, con adaptador, reservas de mesa. No exigir mesa/personas a una cita de empleado.
- P2 Negocio interactivo puede comercializarse con alcance de cita/agenda aprobado y probado, sin esperar pedidos restauranteros completos. No ofrecer módulos pendientes.

### Etapa 6 — Completar módulos restauranteros (prioridad 7)
- Reutilizar y adaptar El Comal: catálogo de alimentos, variantes, extras, combos, promociones, pedidos públicos/WhatsApp, mesa/recoger/domicilio, seguimiento, cotización de envío, agenda, cocina, estados, cobros y estadísticas.
- Mantener reglas de entrega, paginación, reintentos, historial 0018 y funciones existentes; validar diferencias entre agenda genérica y mesa, datos de demostración y comerciales. Mesas y comandas como extensiones; integración POS/caja se completa en etapa siguiente.
- Validar el canal tradicional y QR opcional. P2 restaurantero disponible cuando sus funciones estén probadas. Demos La Hamburguesería y Mariscos La Bahía anteriores quedan como candidatas opcionales, no compromisos de implementación simultánea.

### Etapa 7 — POS, caja e inventarios compartidos (prioridad 8)
- POS general para productos/servicios/alimentos, venta y cobro, cuentas, tickets, devoluciones autorizadas y conciliación, turnos, movimientos, cortes/arqueos, roles y auditoría; inventario básico por sucursal, movimientos, unidades, existencias y alertas.
- Mundo Mascotas como piloto de venta/stock. Integrar con restaurante para captura interna por empleado/mesero, mesas/cuentas, división de cuentas, comandas y cocina. Sin QR obligatorio.
- Pruebas de stock/cobro simultáneo, idempotencia, transacciones, reconexión, permisos, impresión y cierres. P3 Gestión comercial vendible por giro aprobado; no esperar P4.

### Etapa 8 — Módulos especializados progresivos (prioridad 9)
- Auto Servicio Bahía (taller mecánico): cotizaciones y órdenes de servicio con datos del vehículo, tareas, piezas, mano de obra, aprobación, historial; reutilizar clientes, agenda, POS/caja/inventario. Incorporar servicios generales y emprendedores por plantilla cuando módulos requeridos estén listos.
- Fidelización, reportes avanzados, inventario avanzado, costos, compras, proveedores, automatizaciones y recetas/mermas restauranteras. Implementar un módulo, probarlo, pilotarlo y luego ampliar el alcance.
- P4 Gestión profesional: El Comal como demo avanzada de restaurante y otras combinaciones profesionales según módulos probados. Pagos reales, CFDI, offline avanzado e integraciones se evalúan por costos/alcance antes de prometer.
- Mantener P1/P2/P3 operativos, actualizaciones compatibles y seguridad continua.

## 5. Demostraciones y estrategia de lanzamiento
Los cinco establecimientos se crean desde el inicio; su giro no determina su plan. Cada uno admite P1, P2, P3 y P4 en el selector comercial (20 combinaciones). El plan determina derechos ofertados, el giro sugiere módulos pertinentes; el estado real de implementación determina qué se puede probar. La demo no altera contratos, sesiones ni permisos. Precios vigentes en sección 2.
| Demo | Giro | Catálogo temprano | Piloto operativo prioritario |
| --- | --- | --- | --- |
| Café Mirador | Cafetería | Alimentos, productos y experiencias | Web/catálogo |
| Barbería Elite | Barbería | Servicios y productos físicos | Citas/agendas |
| Mundo Mascotas | Tienda minorista | Productos físicos | POS/caja/inventario |
| Taquería El Comal | Restaurante | Alimentos; conserva demo existente | Restaurante avanzado |
| Auto Servicio Bahía | Taller mecánico | Servicios y refacciones | Cotizaciones/órdenes de servicio |

Identidad, catálogo, configuración y datos sintéticos independientes. Las demos comparten interfaz, catálogo de planes y registro de capacidades. Estados: disponible (utilizable aquí), en desarrollo (no operativo), plan superior (no incluido), vista previa (solo ejemplo, no escritura). Módulos ajenos al giro se omiten de la plantilla inicial, no se prohíben definitivamente. El selector comercial no sustituye autorización en servidor; todos los negocios admiten cualquiera de los cuatro planes.
Taquería El Comal conserva su demostración original y su papel de referencia avanzada; las vistas de panel/cocina originales son ejemplos de solo lectura señalados como tales. No exponer escrituras o datos operativos a la galería. La Hamburguesería y Mariscos La Bahía quedan como posibles demos futuras.
No esperar a completar todos los módulos para mostrar los giros; sí exigir pruebas de integración antes de activar funciones operativas. Cada incorporación verificada al registro central se refleja en demos compatibles. Mantener demo pública final separada del entorno de desarrollo y producción.
Ver docs/demostraciones-multicomercio.md.

### Integración con la página comercial oficial
- El repositorio lapazimpresion3d/lapazimpresion3d-web (main) y lapazimpresion3d.com son el catálogo comercial y punto de captación: tarjetas de los cuatro planes en #paginas-web, selector de giro/paquete, enlaces a demostraciones verificadas y cotizacion-web.html con preselección. Conservar las secciones de impresión 3D y la navegación existente.
- Este repositorio (prueba-cloudflare, desarrollo) mantiene el SaaS y las demostraciones, sus datos ficticios y el registro de capacidades. No duplicar una aplicación operativa en el sitio comercial. Los enlaces de entrada deben permitir abrir directamente el establecimiento y plan seleccionados.
- Contrato actual del escaparate: ruta relativa /demostraciones/ con negocio (cafe-mirador, barberia-elite, mundo-mascotas, taqueria-el-comal, auto-servicio-bahia) y plan (p1, p2, p3, p4). No equivale a una URL pública verificada ni a un paquete listo para contratar. El giro y plan siguen siendo independientes.
- Propuesta de intercambio con cotizacion-web.html: paquete=p1|p2|p3|p4 y giro=cafeteria|barberia|tienda|restaurante|taller (ampliable); acordar con el proyecto comercial, validar valores y no confundir el negocio ficticio con el nombre real del prospecto. El formulario no debe enviar datos hasta decisión expresa del usuario.
- Distinguir estado de desarrollo de módulo, disponibilidad de la demo publicada y disponibilidad comercial del paquete. Solo activar enlaces de demos funcionales y anunciar contratación cuando se hayan verificado el despliegue, las funciones ofertadas, el aislamiento y las pruebas del paquete/giro. Mostrar «En desarrollo» cuando falte una demostración funcional y probada; una vista informativa no acredita un POS ni una suscripción operativa.
- Mantener registro de publicación por combinación establecimiento/plan: URL verificada, entorno, commit, fecha de verificación, alcance probado y estado comercial. Por ahora no hay URLs nuevas verificadas para publicar desde este trabajo. No inventar dominios o enlaces; no sustituir enlaces existentes sin comprobarlos. Los enlaces deben retornar a la página comercial.
- Cada demo aprobada se entrega al proyecto comercial con URL y evidencia de pruebas; los cambios de la página comercial se preparan en una rama independiente de lapazimpresion3d-web, sin modificar main ni publicar producción sin autorización. No intervenir en ese repositorio desde este proyecto salvo solicitud específica.
- Ver docs/integracion-comercial.md.

## 6. Criterios de salida por módulo y versión
- Contrato, dependencias y permisos documentados; funcionamiento sin módulos futuros y sin conceptos ajenos al giro.
- Pruebas de ámbito, acceso cruzado, sucursal, módulo no contratado, límite y sesión revocada; datos personales mínimos y respaldo/restore probado.
- Pruebas unitarias, integración D1 aislada, concurrencia, recuperación ante fallas, navegador y regresión de El Comal y versiones ya liberadas. No declarar prueba remota si solo es local.
- Aprovisionamiento y soporte documentados, piloto con criterios de aceptación y aprobación explícita de publicación; no vender funciones no listas.
- Medir tiempo de alta, CPU, lecturas/escrituras, tráfico, fotos/almacenamiento, soporte, capacitación y margen mensual por plan. No garantizar rentabilidad sin datos.
- QR/NFC físico y soportes cotizables aparte; módulos adicionales y límites configurables por superadministrador; publicación de condiciones claras.

## 7. Estado heredado y próximo paso
El Comal cuenta con código de menú, catálogo, pedidos, agenda de mesas, cocina, cobros, seguimiento, envío, paginación y seguridad de entrada; 0018 historial de cobros versionado, aplicación remota no confirmada. Pruebas previas parciales; no se acredita estabilidad comercial ni aislamiento multicomercio.
Siguiente trabajo: verificar escaparate en navegador y preview; en paralelo cerrar auditoría de dependencias y diseñar ADR, modelo de datos y contratos de módulos/planes/plantillas. Implementar primero núcleo y aislamiento para operaciones reales, después generalizar módulos y conectarlos al escaparate. No cambiar main ni datos remotos.
Documentos vigentes: docs/arquitectura-multicomercio.md, docs/auditoria-multicomercio-2026-11-26.md. Referencias históricas: docs/auditoria-multirrestaurante-2026-11-26.md, docs/auditoria-etapa-0-2026-11-26.md, docs/estabilizacion-nucleo-2026-11-26.md, docs/seguridad-nucleo-2026-11-26.md, docs/respaldo-d1.md. En caso de conflicto prevalece este ROADMAP.
