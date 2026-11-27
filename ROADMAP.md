# ROADMAP — Plataforma multirrestaurante de Lapazimpresion3d
Actualización estratégica: 2026-11-26. Sustituye el orden de desarrollo anterior, no elimina los hallazgos ni las mejoras existentes.

## 1. Objetivo y reglas
- Arquitectura multirrestaurante, aislamiento de datos y activación de módulos por plan desde las primeras etapas. No completar El Comal para después adaptarlo.
- Un código compartido, sin copias por cliente. El Comal es el establecimiento principal de desarrollo/pruebas y futura demo del plan profesional.
- Cuatro entregas comerciales progresivas, cada una funcional, estable, segura y vendible por sí misma; no esperar funcionalidades de planes superiores.
- QR/NFC y uso del teléfono por el comensal son opcionales. Carta impresa, mesero, comandas y cobros internos deben funcionar independientemente del canal QR.
- Priorizar facilidad de uso, configuración automática, costos operativos medidos, competitividad y diferenciación. Precios configurables en MXN más IVA; no codificar tarifas en JavaScript ni lógica de permisos.
- Trabajar en desarrollo; no modificar ni fusionar main, desplegar producción ni migrar datos remotos sin autorización y verificación de entorno. En etapa 0 solo documentación.
- Seguridad, pruebas, recuperación, accesibilidad móvil, rendimiento, costos y soporte son requisitos transversales de cada entrega, no una fase final.

## 2. Oferta comercial vigente
| Versión | Plan | Demo | Implementación MXN + IVA | Mensualidad MXN + IVA |
| --- | --- | --- | ---: | ---: |
| 1 | Presencia digital | Café Mirador | 750 | 149 |
| 2 | Restaurante interactivo | La Hamburguesería | 1500 | 299 |
| 3 | Punto de venta integral | Mariscos La Bahía | 2500 | 449 |
| 4 | Administración profesional | Taquería El Comal | 3500 | 649 |

Guardar precios en centavos, moneda, vigencia y condiciones fiscales configurables. Separar precios publicados de condiciones contratadas; una modificación de catálogo comercial no cambia contratos previos automáticamente. No inferir impuestos, descuentos, permanencia, comisiones ni métodos de facturación no aprobados. Las demos son establecimientos ficticios separados, con datos sintéticos; no son proyectos de código independientes.

## 3. Alcance inicial propuesto de los módulos (sujeto a ajustes comerciales)
Los planes superiores heredan las capacidades de los inferiores, pero cada establecimiento puede ocultar/desactivar canales que no usa. Los módulos se habilitan en servidor por plan y configuración; la interfaz no sustituye autorización.
| Módulo | P1 | P2 | P3 | P4 |
| --- | --- | --- | --- | --- |
| Perfil, marca, horarios, ubicación, contacto | Sí | Sí | Sí | Sí |
| Catálogo/menu informativo editable | Sí | Sí | Sí | Sí |
| QR/NFC a página o menú | Opcional | Opcional | Opcional | Opcional |
| Administración de contenido y cuentas autorizadas | Sí | Sí | Sí | Sí |
| Carrito/pedidos públicos, WhatsApp y seguimiento | No | Sí | Sí | Sí |
| Reservaciones y agenda básica | No | Sí | Sí | Sí |
| Disponibilidad, extras, variantes y promociones | Básico | Sí | Sí | Sí |
| Cocina básica y control de cobros de pedidos | No | Sí | Sí | Sí |
| Captura interna POS y pedidos por mesero sin QR | No | No | Sí | Sí |
| Mesas, cuentas abiertas, división de cuenta, comandas | No | No | Sí | Sí |
| Turnos de caja, arqueos, movimientos y tickets | No | No | Sí | Sí |
| Reportes de ventas y operación | No | Básico | Sí | Avanzado |
| Inventario, insumos, recetas, mermas y costos | No | No | No | Sí |
| Proveedores, compras, auditoría ampliada y automatizaciones | No | No | No | Sí |

El alcance de pagos en línea, CFDI, integraciones externas, impresión especializada y operación offline avanzada se evaluará por separado; no prometerlos incluidos ni generar obligaciones comerciales hasta definir costos y pruebas. QR físico, soportes y NFC físicos pueden cotizarse aparte; no son requisito de contratación.

## 4. Etapa 0 — Auditoría y diseño (actual)
- [x] Verificar ramas y SHA iniciales; leer ROADMAP anterior, módulos operativos y migraciones 0001–0018.
- [x] Identificar dependencias mononegocio, sesiones, almacenamiento local, permisos faltantes y flujos reutilizables.
- [x] Registrar nueva estrategia comercial y auditoría en docs/auditoria-multirrestaurante-2026-11-26.md.
- [ ] Confirmar bindings reales por entorno, inventario completo, despliegue y migraciones aplicadas; sin datos sensibles en GitHub.
- [ ] Respaldar D1 y probar restauración en base aislada; confirmar si 0018 está aplicada y conservar historia.
- [ ] Diseñar decisión técnica documentada de aislamiento, esquema, resolver, autorización, migración y reversión. No bloquear diseño temprano por funciones P3/P4 pendientes.
- [ ] Definir catálogo de módulos/dependencias, contratos de API, alcance de P1 y criterios de piloto.
- [ ] Validar pruebas previas del núcleo en ambiente aislado, especialmente flujos que vaya a reutilizar cada versión.

## 5. Etapa 1 — Base SaaS compartida (antes de la primera venta)
- Crear registro de establecimientos, slugs/dominios permitidos, configuración de marca y estado demo/cliente; resolver establecimiento en servidor, rechazar dominios/rutas desconocidos sin fallback a datos de otro negocio.
- Elegir con pruebas y costos entre D1 compartida con establecimiento_id obligatorio, claves/índices/relaciones compuestas y repositorios con ámbito, o D1 separadas con enrutamiento de servidor. Evaluar modelo híbrido con plano de control separado. No elegir por conveniencia únicamente; registrar ADR, límites y plan de evolución.
- Catálogo de planes, módulos, dependencias, precios, asignaciones, estados de servicio y habilitaciones por establecimiento. Comprobar cada endpoint, consulta y tarea en servidor; denegar por defecto. El plan no concede permiso de empleado por sí solo.
- Usuarios nominativos, membresías, roles mínimos (propietario/administrador, operador según módulo), sesiones revocables con ámbito de establecimiento, límites de acceso y auditoría. Superadministración separada y explícitamente autorizada.
- Ámbito para menú, productos, configuraciones, fotos, mesas, reservas, pedidos, tokens, cobros, exportaciones, caché, claves de navegador y cualquier dato relacionado. Los IDs enviados por cliente no otorgan acceso. Preservar idempotencia por establecimiento.
- Migración no destructiva: preparar nueva base aislada, copiar/backfill con ID fijo de El Comal, mapear identificadores y relaciones, comparar conteos e importes, verificar fotos y seguimiento, probar reversión; no introducir escrituras en base estable ni eliminar tablas anteriores. Aplicar 0018 en entorno correcto si procede, tras respaldo.
- Provisionar automáticamente establecimiento desde plantilla de datos, plan, usuario inicial, branding, menú, URL y demo; operación idempotente, registro de errores y recuperación sin duplicados. Ningún dato de un cliente se usa como semilla de otro.
- Preparar entornos separados para producción, desarrollo y demos públicas; demos sin datos reales y con reinicio controlado. Código común, datos separados, permisos explícitos.
- Salida: al menos dos establecimientos sintéticos con productos/folios/usuarios coincidentes, pruebas de lectura/escritura cruzada, acceso por URL/API/foto/token/QR/CSV, cambios de plan, revocación, aislamiento de caché y restauración. Ningún acceso cruzado permitido. No se requiere POS completo para cerrar esta etapa.

## 6. Etapa 2 — Versión comercial 1: Presencia digital
Demo: Café Mirador. Implementación 750, mensualidad 149 MXN + IVA.
- Página adaptable con branding, contacto, horario, ubicación, catálogo y enlaces; publicación y edición sencilla, menú informativo opcional; QR/NFC solo como acceso alternativo.
- Panel limitado a contenido, productos, horarios y datos propios. Sin API de pedidos, cocina, caja ni módulos de planes superiores para este plan.
- Plantilla, alta rápida, instrucciones de uso, acceso administrativo individual, respaldo/recuperación del contenido, pruebas móvil/escritorio, accesibilidad y métricas de costo.
- Piloto independiente y lanzamiento comercial cuando supere criterios de salida; no esperar P2/P3/P4. Mantener soporte y actualizaciones de seguridad durante etapas posteriores.

## 7. Etapa 3 — Versión comercial 2: Restaurante interactivo
Demo: La Hamburguesería. Implementación 1500, mensualidad 299 MXN + IVA.
- Reutilizar catálogo, carrito, pedidos para recoger/domicilio/mesa según configuración, WhatsApp, seguimiento, cotización de envío, disponibilidad, extras, variantes, promociones, agenda y cocina básica.
- Administración de pedidos, estados, cobros registrados y reportes operativos básicos; no confundir registro con procesar pagos reales.
- Reutilizar y verificar reglas de cobro/envío, token de reintento, paginación y 0018; prueba de concurrencia, fallo de conexión y restauración. Permitir apagar canal QR y pedidos públicos sin perder página informativa ni administración habilitada.
- Piloto y salida independiente; no requerir POS, caja o inventario.

## 8. Etapa 4 — Versión comercial 3: Punto de venta integral
Demo: Mariscos La Bahía. Implementación 2500, mensualidad 449 MXN + IVA.
- POS web interno; captura por empleado de pedidos de mesa, mostrador, recoger y domicilio. Carta impresa y mesero plenamente soportados; QR opcional.
- Meseros, cuentas por mesa, apertura/cierre y división de cuentas, comandas, cocina, métodos de pago, tickets, caja por turnos, entradas/salidas, cortes y arqueos; trazabilidad individual y conciliación.
- Diseñar operaciones idempotentes, conflictos, anulaciones autorizadas y reembolsos explícitos sin simular devolución real; pruebas de doble cobro, pérdida de red, impresoras y cierres de turno.
- Reportes de ventas, medios de pago y caja; exportaciones por establecimiento. Definir recuperación segura de conexión y limitaciones operativas.
- Piloto y salida independiente; no requerir inventario profesional.

## 9. Etapa 5 — Versión comercial 4: Administración profesional
Demo: Taquería El Comal. Implementación 3500, mensualidad 649 MXN + IVA.
- Inventario de productos e insumos, recetas, consumos, mermas, ajustes, costos, compras y proveedores; alertas y reportes avanzados, administración por roles y auditoría.
- Automatizaciones operativas, análisis de ventas y costos, reportes por periodo y módulo; evaluar integraciones, pagos reales y offline avanzado con presupuesto y alcance aprobado.
- Consolidar El Comal como demo completa, conservando su papel de entorno principal de desarrollo/pruebas con datos sintéticos. La demo pública profesional debe estar aislada del entorno de desarrollo.
- Piloto y salida propios; conservar estabilidad y compatibilidad de versiones inferiores.

## 10. Requisitos de salida por versión
- Funciones del plan utilizables sin depender de módulos futuros; interfaz simple; configuración y soporte documentados.
- Pruebas de permisos por rol, plan y establecimiento en servidor; pruebas negativas de acceso cruzado y módulos no contratados; no filtrar datos sensibles.
- Pruebas automatizadas de flujos aplicables, regresión de versiones previas, escenarios concurrentes y fallas de red, recuperación, verificación en navegador real y preview con D1 aislada.
- Respaldo y restauración verificados; piloto con criterios de aceptación, incidencias críticas resueltas, aprobación explícita de publicación. No vender funcionalidades aún no implementadas.
- Medir tiempo de alta, lecturas/escrituras D1, CPU, tráfico, almacenamiento, soporte, tiempo de capacitación, margen mensual por plan y costo incremental. No contratar servicios adicionales ni garantizar rentabilidad sin medición.
- Publicar matriz de funciones y condiciones configurables; cambios de plan preservan datos, no eliminan historial ni bloquean exportación autorizada sin política definida. Suspensión/baja y recuperación documentadas; precios y contratos gestionables desde administración comercial.

## 11. Estado heredado y próximo paso
Ya existe código de El Comal para menú, catálogo, pedidos, agenda, cocina, cobros, seguimiento, reglas de envío, paginación, límites de API y pruebas parciales. No es certificación comercial ni de aislamiento. Historial financiero 0018 versionado, aplicación remota no confirmada. Revocación individual, concurrencia distribuida, recuperación, respaldo remoto y pruebas completas pendientes.
Próxima tarea: diseñar ADR y contrato de contexto por establecimiento, catálogo de módulos y esquema inicial, con dos establecimientos ficticios y criterios de aislamiento; implementar solo después de cerrar requisitos críticos de entorno y respaldo correspondientes. No se agrega funcionalidad avanzada de El Comal antes de la base SaaS.
Referencias: docs/auditoria-multirrestaurante-2026-11-26.md, docs/auditoria-etapa-0-2026-11-26.md, docs/estabilizacion-nucleo-2026-11-26.md, docs/seguridad-nucleo-2026-11-26.md, docs/respaldo-d1.md. Los documentos anteriores son históricos; en caso de conflicto prevalece este ROADMAP actualizado.
