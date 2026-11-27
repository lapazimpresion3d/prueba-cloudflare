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

## Preparación manual y refuerzo del esquema
El esquema 0001_practica.sql ahora incluye demo_identidad (lapaz-demo-practica, versión 1). El servidor solo habilita persistencia si existe esta marca, además de un binding dedicado y el secreto requerido. La marca no sustituye comprobar el ID real del recurso. El esquema es idempotente; aplicar únicamente en la D1 de demos. La consulta de contexto puede leer la marca de DEMO_DB, nunca requiere la DB operativa.
Pasos para el propietario:
1. En https://dash.cloudflare.com/ abrir D1 SQL Database, Create database, nombre sugerido lapaz-demos-desarrollo. Copiar Database ID (UUID). No utilizar el-comal-disponibilidad.
2. Abrir la consola de la nueva D1 y ejecutar el SQL de https://github.com/lapazimpresion3d/prueba-cloudflare/blob/desarrollo/migrations-demo/0001_practica.sql. Verificar SELECT clave,version FROM demo_identidad; debe retornar lapaz-demo-practica,1. Verificar cuatro tablas demo_*. Si la consola no admite varias sentencias juntas, ejecutar una por una en el orden del archivo.
3. Compartir solo el nombre y Database ID para incorporar DEMO_DB a previews.d1_databases en desarrollo, preservando el binding DB. No compartir tokens ni contraseñas.
4. Configurar DEMO_RATE_SECRET como secreto en el Preview desarrollo (mínimo 32 caracteres aleatorios); no agregar a GitHub. Para un Preview existente, Wrangler: npx wrangler preview secret put DEMO_RATE_SECRET --name desarrollo (desde el repositorio autenticado, Wrangler compatible). Las modificaciones a secretos de Previews Base no se aplican retroactivamente a Previews activos. Ver https://developers.cloudflare.com/workers/previews/configuration/.
5. Confirmar despliegue y comprobar contexto, conexión, carga/guardado y aislamiento con dos navegadores. No activar publicidad hasta aprobar pruebas.
Validación nueva: 20/20 comprobaciones de lógica JS, 11/11 rutas simuladas, 17 aserciones SQLite con DDL exacto verificado por hash, incluidas marca, idempotencia, revisiones, aislamiento, expiración y límites. No prueba remota ni navegador.

## Estado de configuración posterior
Binding DEMO_DB incorporado en previews mediante ff7a914. El propietario configuró DEMO_RATE_SECRET mediante Wrangler Preview desarrollo (deployment b29cb1dc-46bc-4b09-8f48-5d59b14363b7) y reportó que la comprobación funcionó. No se acredita aquí la ejecución independiente de todas las operaciones ni la suite integrada. El laboratorio conserva los botones técnicos; la nueva página pública y su panel de práctica no los exponen. No cambiar datos ni secretos desde GitHub.

## Perfiles de práctica: migración 0002
Se añadió GET/PUT /api/demo/perfil, con sesión/establecimiento/revisión y validación de identidad y dos JPEG optimizados. Ejecutar exclusivamente migrations-demo/0002_perfiles.sql en la D1 dedicada. perfilConfigurado indica disponibilidad del perfil, independiente de persistenciaConfigurada del catálogo. Sin migración, no se activa el guardado de identidad; el catálogo sigue funcionando. Ver docs/personalizacion-demos.md.
