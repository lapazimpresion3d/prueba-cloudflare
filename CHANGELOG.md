# Registro de cambios

## 2026-11-27 — Validación financiera automatizada y diagnóstico D1
- Ejecución 45990181007 (b283b88): 9/9 SQLite y 132/132 JavaScript, sin fallos. Se confirma la corrección de fixtures.
- Se añaden flags de disponibilidad de pagos múltiples y terminales a /api/demo/contexto y a la página de verificación. No certifican pruebas de uso.
- No se dispone de acceso administrativo a Cloudflare D1; aplicación de migraciones 0007–0014, verificación remota y pruebas de navegador pendientes. Mantener Point exclusivamente simulado.

## 2026-11-27 — Aceptación financiera
- GitHub Actions ejecución 45990031779: SQLite 9/9, JavaScript 129/131. Dos fallos por fixtures de comandas entregadas sin cuenta; corregidos en 687e60e, con una prueba negativa adicional. Segunda ejecución pendiente de confirmación. D1 remoto y navegador pendientes; mantener Point simulado.

## 2026-11-27 — Cobros múltiples y auditoría de práctica
- Núcleo de abonos, propinas, división, subcuentas, anulaciones, reasignación y comprobantes; API y panel de cuentas. Migraciones 0007–0009 pendientes de verificación remota.
- Conciliación del resumen de pedidos y protección de rutas POST/PATCH. Ver docs/auditoria-cobros-demo-2026-11-27.md. No se certifica D1 ni navegador; sin cambios a main.
## 2026-11-27 — Personalización visual y perfiles privados en servidor
- Portadas ilustradas de cuatro giros, logo/portada JPG/PNG/WebP optimizados a JPEG localmente y vista previa de práctica.
- API /api/demo/perfil, sesión temporal, revisión y tabla dedicada demo_perfiles. Guardado/recuperación explícitos desde panel; sin publicación real ni cambios en DB original.
- Migración incremental 0002_perfiles.sql pendiente en DEMO_DB; 21 comprobaciones JS, 10 rutas simuladas y 12 comprobaciones SQLite correctas. Suite integrada, navegador, decodificación real de imágenes y despliegue pendientes.

## 2026-11-27 — Presentación pública separada de laboratorio
- Cinco diseños sectoriales, portadas, emblemas vectoriales, navegación y catálogos. Nueva ruta /demostraciones/negocio/ con negocio/plan; compatibilidad vista=negocio.
- Panel de práctica con catálogo/perfil y vista personalizada explícita, separado del laboratorio D1. Página pública limpia por defecto.
- 20 combinaciones y 20 filtros en DOM simulado, 3 inválidas y 1 práctica correctas; pendiente navegador real y despliegue. No activar contratación ni anunciar P2+.
- Configuración previa DEMO_DB y secreto reportada funcional por propietario; sin cambios a main, datos remotos o página comercial.

## 2026-11-26 — Personalización de demos y preparación D1
- Editor local de identidad visual, horarios, ubicación y contacto ficticio, independiente por establecimiento y restaurable; sin cambiar IDs, giros ni datos publicados.
- Comprobación de identidad de esquema D1 antes de permitir sesiones o guardado. 0001_practica.sql añade demo_identidad; aplicar exclusivamente a D1 nueva de demos.
- 20 comprobaciones JS y 11 rutas simuladas correctas, 17 aserciones SQLite con esquema exacto. Pendientes navegador, suite integrada y configuración real. Sin cambios a main ni sitio comercial.

## 2026-11-26 — Núcleo inicial de demos en servidor
- API /api/demo/registro y contexto, cinco establecimientos y cuatro planes; sin acceso a DB estable.
- Sesión temporal de práctica, copia por establecimiento y revisión, validación, límite y caducidad; binding DEMO_DB opcional y esquema separado no aplicado.
- Interfaz conectar/cargar/guardar, conserva modo local. 17 comprobaciones lógicas y 7 rutas simuladas correctas; 16 comprobaciones SQLite con esquema reducido. Suite integrada y despliegue pendientes.
- Ver docs/nucleo-demos-servidor.md. Sin modificar main, sitio comercial ni datos remotos.

## 2026-11-26 — Vista individual y editor de práctica de las cinco demostraciones
- Vista de negocio directa con retorno al comparador y enlace por establecimiento/plan.
- Editor reutilizable: alta, edición, baja, disponibilidad, precios en centavos, duración de servicios y restauración. Persistencia local por establecimiento en la sesión de pestaña, sin API ni D1.
- Administración SaaS sigue en desarrollo; no hay cuentas ni operaciones comerciales reales desde el editor.
- 15 pruebas de lógica JS correctas (7 previas + 8 nuevas), sintaxis e IDs/campos HTML verificados; navegador, Node completo y preview pendientes.
- ROADMAP y documentación de integración actualizados; sin cambios en main, sitio comercial o El Comal original.

## 2026-11-26 — Demostraciones multicomercio tempranas
- Escaparate compartido /demostraciones/ con Café Mirador, Barbería Elite, Mundo Mascotas, Taquería El Comal y Auto Servicio Bahía; 27 ofertas ficticias tipadas y 20 combinaciones giro/plan.
- Selector independiente de planes, precios configurables en registro central, filtros y estados de disponibilidad. Solo página y catálogo operativos en la galería; módulos futuros identificados sin simular operaciones.
- Enlaces a la demo original sin cambiar su lógica ni API; sin migraciones ni escrituras D1. Pruebas de lógica JS 7/7 correctas, navegador y preview pendientes.
- ROADMAP y docs/demostraciones-multicomercio.md actualizados. No se modifica main.

## 2026-11-26 — Ampliación a SaaS multicomercio
- Objetivo ampliado a una plataforma de gestión comercial con núcleo común y módulos especializados por giro, sin duplicar código.
- Planes vigentes: Presencia digital, Negocio interactivo, Gestión comercial y Gestión profesional; precios configurables en MXN + IVA, adicionales, límites, promociones y precios especiales desde superadministración.
- Prioridades revisadas: auditoría, diseño, núcleo, módulos/planes, páginas/catálogos, citas/agendas, módulos restauranteros, POS/caja/inventarios, especializaciones progresivas.
- Plantillas y demos por giro, productos físicos/alimentos/servicios tipados, sucursales, clientes/empleados base; conservación de funciones existentes de El Comal.
- Ver ROADMAP.md, docs/arquitectura-multicomercio.md y docs/auditoria-multicomercio-2026-11-26.md. Documentación únicamente; sin cambios funcionales, migraciones, datos ni main.

## 2026-11-26 — Cambio de estrategia comercial y multirrestaurante
- Nueva secuencia: auditoría, base SaaS común, Presencia digital, Restaurante interactivo, Punto de venta integral y Administración profesional.
- Precios configurables en MXN + IVA y demos Café Mirador, La Hamburguesería, Mariscos La Bahía y Taquería El Comal.
- Separación de datos y módulos por plan desde la primera etapa; QR opcional y operación tradicional soportada en POS.
- Auditoría estática de 18 migraciones y módulos del repositorio; sin cambios de código, configuración, migraciones ni datos. main permanece intacta.
- Ver ROADMAP.md y docs/auditoria-multirrestaurante-2026-11-26.md. El nuevo ROADMAP sustituye el orden previo.

## 2026-11-26 — Seguridad y pruebas reproducibles
- Lector JSON compartido con límites por operación; HTTP 413/415.
- Reserva atómica de intentos de inicio de sesión y enrutamiento de API reforzado.
- 12 pruebas de seguridad y 4 de migración 0018 aprobadas en Node/SQLite local; 10 casos de rutas correctos en entorno simulado.
- Pruebas y documentación de respaldo agregadas. Sin nuevas migraciones; 0018 pendiente de aplicación remota.
- Ver docs/seguridad-nucleo-2026-11-26.md y docs/respaldo-d1.md.

## 2026-11-26 — Estabilización del núcleo operativo
- Coherencia de estados, envíos y cobros; cancelación de pagados bloqueada y conciliación de legados.
- Paginación de activos y cocina; recuperación de token en la misma pestaña; seguimiento de cobros por verificar.
- Migración 0018 de historial financiero, pendiente de aplicar en D1 de desarrollo.
- Pruebas SQL locales correctas con esquema reducido; pendientes pruebas completas en Cloudflare y respaldo.
- Ver docs/estabilizacion-nucleo-2026-11-26.md.

## 2026-11-26 — Etapa 0 / documentación técnica
- Auditoría parcial de código y esquema D1; identificación de riesgos de entrega, cobros, idempotencia, cola y separación de establecimientos.
- Reproducción SQL local con datos ficticios; no se probó D1 remoto.
- Propuesta de arquitectura y hoja de ruta.
- No se cambia lógica de aplicación, no se añaden migraciones ni dependencias, no se modifica main.
## 2026-11-13 — Referencia histórica verificada
- cf2963a: bloqueo visual de entrega hasta registrar cobro.
- El código de desarrollo contiene validación SQL de entrega y validaciones de dirección/colonia/teléfono para domicilio.
- Ver docs/auditoria-2026-11-13.md.

## 2026-11-27 — v0.7 Catálogo visual de práctica
- Carga, optimización y eliminación de fotos de productos, persistencia local y D1 en tabla existente; guardado de catálogo disponible en panel.
- Cargas independientes de logo y portada. Límite agregado 300000 bytes por catálogo, foto 45000 caracteres JPEG.
- 24 comprobaciones lógicas, 20 páginas, 20 filtros, 3 URLs inválidas y 1 foto de práctica en DOM simulado. Suite integrada y navegador pendientes.
- Propietario reportó creación de demo_perfiles. Preview no accesible desde herramienta; no se modificó main, D1 remota ni sitio comercial.

## 2026-11-27 — v0.8 Negocio interactivo: pedidos de práctica
- Carrito, modalidades, totales en centavos, folio, panel y seguimiento local; nueve combinaciones P2+ compatibles.
- 30 pruebas lógicas, 20 combinaciones UI (9 activas, 11 desactivadas) y un flujo cliente/encargado/seguimiento correctos en simulación.
- No se modificó D1 ni main; pendiente navegador, Preview, API de pedidos y agenda.

## v0.9 — Pedidos privados en servidor
- Migración demo_pedidos, API GET/POST/PATCH, cálculo de importes del catálogo, reintento idempotente, estado condicionado e interfaces de práctica remota.
- 7 pruebas lógicas y 13 casos de API simulada; sentencias SQL comprobadas en SQLite local. Migración remota, despliegue y navegador pendientes. Sin cambios en main ni D1 operativa.

## v0.10 — Citas de servicios y agenda de práctica
- Barbería y taller: selección de servicio/profesional/fecha/hora, validación de solapamiento y descanso, folio, estados y panel filtrable.
- 14 pruebas lógicas y flujo DOM simulado correctos. Persistencia local, no D1 de citas ni calendario real. Pendientes navegador, Preview y pruebas integradas.

## v0.11 — Agenda privada de citas en servidor
- Migración demo_citas e índice, API privada de citas con conflicto de intervalos atómico, precio/duración recalculados, estados e idempotencia.
- 7 pruebas lógicas, 12 casos de controlador simulado y 17 comprobaciones SQL locales correctos. Suite integrada y despliegue pendientes.
- Recursos y horarios fijos de ejemplo; no se modificó D1 remota, main ni sitio comercial.
