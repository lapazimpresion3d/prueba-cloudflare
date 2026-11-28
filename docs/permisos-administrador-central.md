# Operadores, permisos y seguridad
Política de referencia: src/permisos-central.mjs. Los roles son fijos, no editor de permisos individuales.
| Módulo | Administrador | Comercial | Implementación | Consulta |
|---|---|---|---|---|
| Inicio | R | R | — | R |
| Comercios | R | R | R | R |
| Prospectos | RW | RW | — | — |
| Paquetes | RW | R | — | R |
| Implementaciones | RW | — | RW | R |
| Ciclo | RW | R | — | R |
| Operadores | RW | — | — | — |
| Auditoría | R/exportar | — | — | — |
R = consulta; RW = consulta y operaciones específicas, no permiso universal.
Las escrituras se comprueban en rutas, adaptadores y guardas SQL de servicios críticos. Las sesiones se revocan al modificar rol o desactivar operador. La migración 0047 conserva administradores preexistentes; revisar y reducir privilegios antes de pilotar. Proteger último administrador, prohibir automodificación en panel. Provisionar identidades fuera de banda, mediante emisor/sujeto verificados, no correo como clave. Usar mínimo privilegio.
Controles OIDC: HTTPS, código + PKCE S256, state y nonce, transacción de 5 min de un solo uso, cliente confidencial, verificación de MFA, cookie central __Host-lapaz-central Secure HttpOnly SameSite Strict. Cookie transitoria OIDC SameSite Lax. Sesión central 60 min, inactividad 10 min, POST reciente 5 min. El limitador de inicio debe estar configurado y ser probado antes del montaje.
Riesgos abiertos: guardas históricas por ID sin sesión completa, minimización de datos personales del expediente, concurrencia distribuida y revocación, configuración real MFA/JWKS y rotación, accesibilidad, limpieza de datos visibles tras expirar sesión. No considerar los cuatro roles una autorización de producción.
