# Núcleo inicial de demostraciones en servidor
2026-11-26. Rama desarrollo. No modifica la D1 existente de El Comal ni el sitio comercial.

## API
GET /api/demo/registro: cinco perfiles ficticios y cuatro planes desde fuentes compartidas.
GET /api/demo/contexto?negocio=cafe-mirador&plan=p1: perfil, catálogo semilla, plan, capacidades y señal de configuración de persistencia. IDs desconocidos 404 sin fallback; no toca D1. El navegador consulta capacidades del servidor y conserva su modo local si falla.
POST /api/demo/sesion: sesión anónima de práctica, cookie opaca HttpOnly/Secure/SameSite=Strict, hash SHA-256 en D1, caducidad fija de 2 h. No es cuenta SaaS. Origen exacto, 5 sesiones nuevas por IP (HMAC con secreto separado) cada 10 min, limpieza oportunista de expirados.
GET/PUT /api/demo/catalogo?negocio=...&plan=...: copia privada de práctica por sesión y establecimiento. Autorización de sesión y módulo en servidor, validación tipada, 100 ofertas máximo, JSON hasta 65536 bytes y snapshot hasta 60000 bytes. Revisión 0 para semilla; insertar una vez y actualizar con revisión esperada; 409 en conflicto. Ninguna escritura en env.DB. No publicar a otros visitantes ni almacenar datos personales. Cookies se comparten entre pestañas del mismo navegador/origen; no sincronización entre dispositivos ni autenticación de empleados.

## Configuración pendiente (NO ejecutada)
1. Confirmar rama/entorno preview y aislamiento efectivo; crear D1 NUEVA dedicada únicamente a demos. Nunca reutilizar el-comal-disponibilidad ni el binding DB. Registrar y comparar IDs reales; la comparación de objetos JS del código es solo una defensa adicional, no garantiza IDs distintos.
2. En esa D1 vacía, aplicar exclusivamente migrations-demo/0001_practica.sql (fuera de migrations/). Revisar esquema y verificar borrado en cascada. Ejemplo de comando, sustituir marcador tras comprobar destino: npx wrangler d1 execute NOMBRE_D1_DEMO_VERIFICADO --remote --file=migrations-demo/0001_practica.sql
3. Añadir binding DEMO_DB solo en entorno demo/desarrollo y secreto DEMO_RATE_SECRET aleatorio de al menos 32 caracteres desde Cloudflare; no guardar secreto en GitHub. No se modifica wrangler.json hasta verificar el ID. Probar sesión, caducidad, cookies HTTPS, límites, concurrencia y recuperación. Sin ambos, 503 en operaciones de práctica; registro/contexto públicos funcionan sin D1.
4. Revisar límites globales de abuso, métricas, limpieza periódica independiente y costo antes de abrir al público. El límite por origen no es defensa distribuida y limpieza oportunista no garantiza borrado a hora exacta.
5. No vincular el dominio comercial ni activar contratación sin pruebas de navegador y despliegue, aprobación y registro de URL verificada.

## Interfaz
Conectar práctica, cargar copia, guardar copia actual. Conserva editor anterior en sessionStorage. Si existe copia en servidor, exige cargarla antes de habilitar guardado; si falla/expira, informa y permite práctica local. Cambios en otra pestaña devuelven 409 si revisión ya no coincide. No se sincroniza automáticamente ni constituye administración permanente. La fuente compartida de perfiles y catálogo sigue siendo semilla versionada; migración a establecimientos/sucursales reales y roles es futura.

## Validación ejecutada
- 15 pruebas previas de lógica de demos y editor + 2 comprobaciones nuevas (20 contextos y validación de catálogo) en JavaScript con aserciones equivalentes: 17/17. 7 casos de rutas con Request/URL/Response simulados: 7/7, sin acceso a DB estable. Sintaxis de app y IDs HTML correctos.
- SQLite local: esquema reducido equivalente y sentencias reales de INSERT/UPDATE/límite, 16 comprobaciones correctas: dos sesiones, dos establecimientos, revisiones, expiración, límite y cascada.
- tests/demo-servidor.test.mjs agrega suite reproducible con Node 22.13+ y adaptador SQLite; no se ejecutó esa suite integrada con Web Crypto/Request reales en este turno. No se ejecutó navegador, Cloudflare ni D1 remota; configuración y despliegue pendientes. No se afirma que la persistencia esté activa.

## Siguiente
Validar preview, configurar D1 aislada y ejecutar node --test tests/*.test.mjs. Después, núcleo persistente de establecimientos/sucursales y cuentas con permisos, editor permanente y módulo de páginas/catálogos. La sesión de práctica es una vía separada, no reemplaza el núcleo comercial.
