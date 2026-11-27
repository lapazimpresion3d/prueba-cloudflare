# Registro de cambios
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
