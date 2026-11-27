# Registro de cambios
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
