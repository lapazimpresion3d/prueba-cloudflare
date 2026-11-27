# Seguridad del núcleo y pruebas reproducibles — 26 de noviembre de 2026

## Cambios implementados
- src/seguridad.mjs: lectura JSON limitada por bytes, comprobación de Content-Type y UTF-8, rechazo de exceso con HTTP 413 y formato no JSON con HTTP 415; JSON inválido se devuelve como null para las validaciones de cada módulo.
- src/worker.mjs: reserva atómica de intentos ANTES de verificar contraseña, utilizando la tabla intentos_acceso existente. Se contabilizan también los intentos correctos durante 60 segundos; se mantienen contadores separados para encargado y cocina. Se conservan firmas HMAC y cookies existentes. No se implementa revocación individual de sesiones.
- pedidos, catálogo, negocio, entrega, reservaciones y administración usan el lector común. Límites: login 2048, pedidos 16000, administración 32768, catálogo 350000 bytes.
- Respuestas JSON: Cache-Control no-store, X-Content-Type-Options nosniff y Referrer-Policy no-referrer. No se registran cuerpos, errores D1 detallados, contraseñas ni tokens; se limita también el diagnóstico interno.
- wrangler.json: run_worker_first incluye /api y /api/*; las API desconocidas retornan JSON 404 en lugar de pasar a activos estáticos. Referencia: https://developers.cloudflare.com/workers/static-assets/binding/

## Validación ejecutada
- Node 22.16.0, SQLite local: tests/seguridad.test.mjs, 12/12 correctas. Copia de src/seguridad.mjs contrastada con GitHub mediante longitud y huella FNV; mismo contenido de pruebas. La prueba de Promise.all usa SQLite local síncrono, no reproduce concurrencia distribuida de D1.
- Node 22.16.0, SQLite local: tests/historial-cobros.test.mjs, 4/4 correctas. Se ejecutaron copias de las migraciones reales 0008, 0014, 0015 y 0018 contrastadas con GitHub. Conservación de cobros, historial, idempotencia de instantánea y rollback transaccional.
- 12 archivos JavaScript analizados sintácticamente en un entorno JS tras retirar declaraciones de import/export; no equivale a resolver el grafo de módulos con Wrangler.
- 10 casos de rutas ejecutados sobre el código de Worker, pedidos y seguridad obtenido de GitHub con URL, Response, TextEncoder, crypto, D1 y ASSETS simulados: 10/10 respuestas esperadas, sin acceso a activos en rutas API. tests/worker-rutas.test.mjs contiene los casos reproducibles con Request/Response y Web Crypto reales en Node; esa suite completa no se ejecutó localmente por falta de acceso git desde el contenedor.
- No se ejecutó Cloudflare remoto, navegador real, ni login exitoso real del Worker.

## Repetición de pruebas
En una copia de la rama desarrollo, con Node 22.13+ (preferible versión LTS compatible), ejecutar:
    node --test tests/*.test.mjs
No se requiere npm install. El módulo node:sqlite puede emitir aviso experimental según versión. Las pruebas no conectan a Cloudflare ni utilizan credenciales reales.

## Pendientes y límites
- Probar sesión válida, firma manipulada, caducidad y revocación; cierre de sesión actual borra cookie, no invalida copia robada antes de expirar.
- La protección por IP no es una defensa completa frente a intentos distribuidos; considerar controles de Cloudflare y cuentas nominativas.
- Probar pedidos y cobros con D1 real aislada, reintentos, navegador, fotos y cambios concurrentes.
- La migración 0018 sigue pendiente de confirmación en D1 de desarrollo; no se ha ejecutado desde ChatGPT.
- Verificar separación de bases, respaldo y restauración según docs/respaldo-d1.md. No fusionar main ni iniciar multirrestaurante antes de validar núcleo.
