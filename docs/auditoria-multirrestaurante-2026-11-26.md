# Auditoría de transición a plataforma multirrestaurante
26 de noviembre de 2026. Revisión estática de GitHub, exclusivamente documental; no se modifica aplicación, configuración de despliegue, migraciones existentes ni datos.

## Base auditada
Repositorio lapazimpresion3d/prueba-cloudflare. desarrollo: 072029a661871e776e22b2068ec589a0bec98aaf; main: 9aa4805fe69f8b79f675e0170466a6a26938f381. Comparación: 189 commits propios de desarrollo, 1 de main; ramas divergentes, no fusionar automáticamente. Estos SHA identifican el código antes de la actualización documental, no son respaldo de D1.
Se revisaron ROADMAP, CHANGELOG, wrangler.json, informes anteriores, módulos Worker/pedidos/catálogo/agenda/entrega/negocio, frontend público/encargado/cocina/seguimiento, menú e HTML principal y las 18 migraciones SQL mediante comparación y lectura. Inventario no exhaustivo de todos los activos estáticos. No se ejecutaron pruebas nuevas ni se accedió a Cloudflare remoto; resultados de pruebas locales anteriores son históricos.

## Hallazgos y prioridad
| ID | Evidencia verificable | Riesgo | Acción |
| --- | --- | --- | --- |
| A01 P0 | src/worker.mjs, leerMenu y menuActualizado (26–55): único menu.json, env.DB, consultas globales y preferencias id=1 | Mezcla de configuraciones y catálogo | Resolver establecimiento en servidor; repositorio con ámbito obligatorio |
| A02 P0 | 0001/0004/0005/0009/0012: producto_id PK global; 0006/0007/0010/0011/0013/0017: singleton id=1 | Colisiones y acceso cruzado | Rediseñar claves, relaciones y consultas; o separar D1 por tenant mediante resolver autorizado |
| A03 P0 | 0008 folio y seguimiento_hash globales; 0014 y 0018 referencian pedido_folio; pedidos.mjs consulta por token/folio y administra cobros | Acceso a pedidos o cobros de otro negocio | Ámbito de tenant obligatorio también en tokens, historial, reportes, idempotencia y relaciones |
| A04 P0 | worker.mjs sesionValida, atenderCocina y administrar: HMAC, ADMIN_PASSWORD/COCINA_PASSWORD, clave_cocina singleton | Credenciales compartidas y sesión sin membresía individual | Cuentas, roles, membresías, sesión con ámbito y revocación; control por operación |
| A05 P0 | worker.mjs rutas públicas/admin/cocina; no catálogo de módulos/planes en código revisado | Acceso directo a API de módulo no contratado | Denegación en servidor por plan/configuración/rol; no confiar en ocultar botones |
| A06 P0 | wrangler.json previews.d1_databases: un binding DB; no se verificó destino remoto | Migrar datos estables o mezclar demos y clientes | Verificar binding e ID, respaldo/restauración independiente, entornos aislados |
| A07 P1 | app.js elComalCarrito y claveIntentoPedido; seguimiento/memoria.js claves locales; API absolutas en panel y cocina | Colisiones de sesión/carrito al compartir origen | Resolver URLs y namespace por establecimiento; verificar caché y tokens |
| A08 P1 | public/index.html título y textos El Comal; public/menu.json negocio El Comal; negocio.mjs valores de fallback específicos | Duplicación de páginas para cada cliente | Plantilla común, marca y catálogo configurables; no usar datos de otro negocio como fallback |
| A09 P1 | catalogo.mjs servirFoto y operaciones WHERE producto_id = ?; reservaciones.mjs agenda con IDs globales | Acceso cruzado a foto, reserva o edición | Verificar pertenencia en cada lectura/escritura y respuesta/cache |
| A10 P1 | pedidos.mjs usa ADMIN_PASSWORD para hash de origen y habilitación de registro; public/app.js conserva flujo demo | Dependencia de secreto compartido; flujos comerciales y demos mezclados | Separar configuración/autorización, datos sintéticos y canal público/interno |
| A11 P1 | No se encontró flujo POS completo, caja por turnos, cuentas de mesero ni aprovisionamiento automático en módulos revisados | No comercializar como POS completo hoy | Construir P1/P2 primero con base común; P3/P4 después |
| A12 P1 | Historial 0018 versionado, pruebas previas parciales, revocación y concurrencia D1 pendientes | Estabilidad y recuperación no certificadas | Validar por versión y ámbito; no bloquear diseño inicial por módulos avanzados |

## Inventario de migraciones
0001 disponibilidad_producto; 0002 intentos_acceso; 0003 agenda_mesas; 0004 precios_menu; 0005 descripciones_menu; 0006 preferencias_categorias; 0007 preferencias_horario; 0008 pedidos_demo; 0009 catalogo_productos; 0010 clave_cocina; 0011 preferencias_entrega; 0012 precios_programados; 0013 preferencias_negocio; 0014 cobros_pedido; 0015 metodo; 0016 transferencia_reportada; 0017 preferencias_pagos y transferencia_no_localizada; 0018 historial_cobros. Ninguna de las 18 define una columna de ámbito de establecimiento. No se verificó cuáles están aplicadas en remoto.

## Reutilización
Conservar módulos de catálogo/variantes/extras, agenda, promociones, reglas de pedidos/entrega/cobros, cocina, seguimiento, seguridad de entrada y paginación. Adaptar su acceso a datos antes de reutilizarlos para otros clientes. Historial financiero debe conservar sus relaciones. No reescribir todo ni duplicar el repositorio por restaurante.

## Decisiones de diseño pendientes
- ADR aislamiento: comparar D1 compartida con claves compuestas y ámbito obligatorio frente a D1 por establecimiento y plano de control común; evaluar límites, costos, complejidad de migración y recuperación. Recomendación inicial: estudiar híbrido, no decisión ejecutada.
- Resolver dominio/slug y contexto inmutable; separar permisos de rol, plan, módulo y configuración de canal. Inventariar todas las rutas y consultas antes de habilitar datos reales.
- Identificadores de pedidos, tokens, fotos, caché y almacenamiento local deben tener ámbito; migración conservadora de El Comal con conteos, importes, relaciones y reversión.
- Demos Café Mirador, La Hamburguesería, Mariscos La Bahía y El Comal con datos ficticios separados. El Comal principal para desarrollo, demo pública profesional independiente del entorno de pruebas.
- El QR es un canal opcional, no requisito del servicio. P3 debe soportar POS interno/mesero/carta impresa sin teléfono del cliente; P1 permite presencia sin menú QR.
- Alcance comercial de módulos sugerido en ROADMAP, pendiente de ajustes; precios exactos definidos por el usuario, configurables, en MXN + IVA.

## Puerta de seguridad previa a la implementación
Confirmar destino D1, exportar y restaurar en entorno aislado, plan de migración/rollback, pruebas de dos tenants con IDs coincidentes, usuarios sin membresía, módulos deshabilitados, fotos, tokens, exportación y caché; después implementar progresivamente. Mantener main intacta. No declarar auditoría exhaustiva, aislamiento efectivo, piloto listo ni despliegue verificado.
