# Etapa 0 — Auditoría técnica y propuesta de arquitectura
Fecha: 26 de noviembre de 2026. Alcance: revisión estática del repositorio y reproducción SQL local, sin tocar main ni D1 remoto.

## Referencias de recuperación
- desarrollo: cf2963a8b89376fb756ce54c7572cf5c7d70f055.
- main: 9aa4805fe69f8b79f675e0170466a6a26938f381.
- Comparación: ramas divergentes, 159 commits propios de desarrollo y 1 de main. No fusionar automáticamente.
- Los SHA permiten recuperar el código versionado, pero no son un respaldo independiente de la base de datos ni de los secretos.

## Arquitectura e inventario
Worker en src/worker.mjs y activos estáticos en public/. wrangler.json define el binding ASSETS y un binding DB para previews; verificar bindings y separación efectivos en el panel Cloudflare. No se encontró package.json en la raíz. No se inspeccionaron todas las imágenes ni todos los HTML/CSS; inventario obtenido mediante comparación de ramas.
- src/worker.mjs: rutas públicas, administración, cocina, catálogo y sesiones.
- src/pedidos.mjs: revisión/registro/seguimiento, estados, cobros, aviso de transferencia y estadísticas/CSV.
- src/catalogo.mjs: catálogo superpuesto a menu.json, fotos, archivo y versiones.
- src/entrega.mjs: configuración y cotización de entrega.
- src/promociones.mjs: precios programados.
- src/reservaciones.mjs: disponibilidad y agenda, validación SQL de traslapes.
- src/negocio.mjs: datos del establecimiento.
- public/app.js: catálogo, carrito, revisión, registro, WhatsApp.
- public/admin/panel.js: operaciones administrativas, historial y cobros.
- public/cocina/cocina.js: tablero confirmado/preparación y actualización cada 15 s si visible.
- public/seguimiento/seguimiento.js y memoria.js: seguimiento por token y memoria local (esta última identificada en el inventario, no auditada).
- public/demo/, public/demo-panel/ y public/demo-cocina/: vistas demostrativas identificadas, no verificadas funcionalmente.
Rutas principales: /menu.json, /api/negocio, /api/catalogo/foto/*, /api/reservaciones/disponibilidad, /api/pedidos, /api/pedidos/revisar, /api/pedidos/seguimiento, /api/pedidos/avisar-transferencia; /api/admin/{entrar,salir,horario,estadisticas,estadisticas/cobros.csv,pedidos,pedidos/cobro,pagos,cocina/clave,entrega,negocio,agenda,productos,disponibilidad,categorias,descripciones,precios}; /api/cocina/{entrar,salir,pedidos}.

## D1: 17 migraciones verificadas por lectura
0001 disponibilidad_producto; 0002 intentos_acceso; 0003 agenda_mesas; 0004 precios_menu; 0005 descripciones_menu; 0006 preferencias_categorias; 0007 preferencias_horario; 0008 pedidos_demo; 0009 catalogo_productos; 0010 clave_cocina; 0011 preferencias_entrega; 0012 precios_programados; 0013 preferencias_negocio; 0014 cobros_pedido; 0015 añade metodo; 0016 añade transferencia_reportada; 0017 preferencias_pagos y transferencia_no_localizada.
Configuraciones singleton id=1, producto_id global, folio global y sin identificador de establecimiento: no existe aislamiento multi-tenant. No se verificó el estado de migraciones remotas.

## Hallazgos priorizados
P0 antes de piloto:
1. Entrega sin importe: la excepción SQL total=0 permite entregar un domicilio con subtotal cero y envío sin cotizar. El indicador requiereCobro tampoco representa ese caso. Usar una política común de total conocido + cobro activo por importe correcto, o total final cero. Actualmente se permite registrar cobro con envío pendiente por importe >= subtotal, lo cual requiere decidir una transición explícita para conservar el monto de envío.
2. Anulación posterior a entrega: la acción corregir permite anular un cobro de un pedido entregado; existe vista histórica sin cobro, por lo que no se debe suprimir esa recuperación sin diseñar una corrección auditable. Definir excepción financiera, autorización y procedimiento de conciliación, sin fingir que se devuelve dinero.
3. Historial de cobros: 0014 define PK pedido_folio y el UPSERT sobrescribe monto, fecha y método anteriores cuando el cobro estaba anulado. Para POS, agregar eventos financieros append-only con motivos, responsable y referencias; conservar los datos actuales. Revisar cancelación de pedidos ya pagados y reembolsos.
4. Idempotencia: token único y UPDATE condicionado protegen reintentos y concurrencia; borradorRegistro solo vive en memoria, de modo que recargar tras respuesta perdida puede generar token nuevo. Persistir intento pendiente por establecimiento y recuperar resultado; detectar token reutilizado con carga distinta sin impedir recuperación de un pedido ya aceptado.
5. Límite 50 activos/cocina sin paginación: puede ocultar pedidos nuevos. Agregar paginación/contador o un mecanismo explícito para acceder a toda la cola.
6. Seguridad: cookies HttpOnly/Secure/SameSite=Strict, HMAC, caducidad, comprobación de Origin y límite de acceso existentes; sesiones firmadas sin revocación individual, contraseña compartida y no hay roles personales. Antes de producción: cuentas nominativas, revocación, permisos de servidor, límites de cuerpos en login, protección de QR fuera del local, privacidad, auditoría y pruebas de acceso cruzado. No se afirma ausencia de XSS/SQLi; auditoría parcial.
7. Horarios: revisar si la política pública fuera de horario es coherente con el servidor; confirmar política de pedidos programados.
8. Cocina: no hay filtros por mesa/servicio en cocina.js; actualmente solo confirmado y preparación, orden por folio, polling 15s. El encargado puede pasar directamente de preparación a reparto para domicilio: definir transición consistente con cocina.
9. Datos históricos: estadísticas separan cobros registrados y subtotal de pedidos entregados; verificar criterio temporal y envío, no confundir con utilidad.
10. Verificar entorno demo/producción separado, respaldo de D1 y pruebas de restauración antes de aceptar clientes.

## Reproducción SQLite local (26/11)
Se ejecutaron sentencias de UPDATE de entrega, anulación y UPSERT de cobro tomadas de src/pedidos.mjs con esquema de pedidos/cobros basado en migraciones 0008,0014–0017 y datos sintéticos.
- Recoger subtotal positivo sin cobro: UPDATE no devuelve fila (correcto).
- Domicilio subtotal cero sin envío cotizado: UPDATE devuelve entregado (defecto).
- Recoger con cobro activo: UPDATE devuelve entregado (correcto).
- Domicilio subtotal positivo sin cobro: UPDATE no devuelve fila (correcto).
- Recoger total cero: UPDATE devuelve entregado (correcto).
- Anular después de entregar: permitido, estado sigue entregado (riesgo/inconsistencia de política).
- Re-registrar después de anular: queda una sola fila con método y fecha nuevos (pérdida de historial anterior).
No se ejecutó Worker completo, navegador, D1 remoto ni prueba de concurrencia real.

## Arquitectura propuesta (no implementada)
Conservar frontend JS y módulos Worker. Implementar resolución de tenant por slug/dominio validado en servidor; registro central D1 de establecimientos, usuarios/membresías, permisos, planes y módulos. Recomiendo modelo híbrido: plano de control central y datos operativos con aislamiento por base/partición según escala; para primeros pilotos evaluar D1 compartida con restaurant_id obligatorio y claves compuestas, y migrar a bases aisladas según necesidades y límites. No confiar en IDs del navegador: verificar pertenencia en cada consulta, incluidos hijos, archivos, QR, tokens y reportes. Separar demo completamente.
Tablas candidatas: restaurantes, dominios, usuarios, membresias, sesiones, planes, suscripciones, modulos; productos, categorias, mesas, reservas, pedidos, pedido_lineas, eventos_pedido, cuentas, pagos, eventos_pago, caja_turnos, caja_movimientos, auditoria. Conservar instantánea histórica del precio y detalle; diseñar migración no destructiva, backfill a tenant demo, validaciones e índices antes de cambiar rutas. Preparar reversión/restore en entorno aislado.
Secuencia: pruebas y correcciones críticas actuales -> respaldo/restore -> diseño tenant/roles -> migración y pruebas de aislamiento -> activación modular -> piloto QR/pedidos -> POS/caja/meseros -> inventario/integraciones. No empezar por pagos reales.
## Infraestructura y costos
Workers Paid tiene mínimo publicado de USD 5/mes por cuenta; D1 factura excedentes de lectura, escritura y almacenamiento según uso. Fuentes oficiales: https://developers.cloudflare.com/workers/platform/pricing/ y https://developers.cloudflare.com/d1/platform/pricing/. Medir CPU, solicitudes, lecturas/escrituras, fotos, almacenamiento, soporte y margen por restaurante; no prometer costos sin medición. Polling de cocina cada 15 s durante 12 h supone 2,880 consultas/día por pantalla; para escalar, reducir polling cuando no hay actividad o evaluar eventos. No contratar servicios aún.
## Respaldo y cierre de etapa
Pendientes con acceso Cloudflare: identificar binding real por entorno, exportar D1 a archivo SQL protegido y verificar restauración en base aparte; registrar migraciones aplicadas, verificar secretos sin mostrarlos, probar despliegue y flujos de la auditoría previa. No ejecutar exportación ni migración remota sin comprobar entorno. El inventario es parcial y no equivale a aprobación comercial.
