# Registro de cambios
## 2026-11-26 — Etapa 0 / documentación técnica
- Auditoría parcial de código y esquema D1; identificación de riesgos de entrega, cobros, idempotencia, cola y separación de establecimientos.
- Reproducción SQL local con datos ficticios; no se probó D1 remoto.
- Propuesta de arquitectura y hoja de ruta.
- No se cambia lógica de aplicación, no se añaden migraciones ni dependencias, no se modifica main.
## 2026-11-13 — Referencia histórica verificada
- cf2963a: bloqueo visual de entrega hasta registrar cobro.
- El código de desarrollo contiene validación SQL de entrega y validaciones de dirección/colonia/teléfono para domicilio.
- Ver docs/auditoria-2026-11-13.md.
