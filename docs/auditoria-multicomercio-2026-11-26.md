# Auditoría complementaria — transición multicomercio
2026-11-26. Revisión estática, no implementación. Base: desarrollo eaf542b37ee3af5da59ab28b4c98190b31ee7209; main 9aa4805fe69f8b79f675e0170466a6a26938f381. El informe docs/auditoria-multirrestaurante-2026-11-26.md sigue como antecedente de aislamiento y las 18 migraciones. Se releyeron ROADMAP, CHANGELOG, informe previo, wrangler.json, worker.mjs, pedidos.mjs, catalogo.mjs, reservaciones.mjs, negocio.mjs y public/menu.json. No se volvió a ejecutar la suite ni se inspeccionaron todos los activos o la base remota.

| Hallazgo | Evidencia actual | Acción recomendada |
| --- | --- | --- |
| Núcleo depende de menú y cocina | worker.mjs imports y leerMenu/menuActualizado, rutas de cocina | Resolver contexto y módulos antes de acceder al catálogo sectorial; trasladar cocina a módulo |
| Catálogo presupone alimentos | catalogo.mjs validarProducto (141–172): ingredientes, extras, variantes, incluye; menu.json contiene alimentos y reservas | Oferta tipada común, atributos de físico/alimento/servicio, adaptador compatible |
| Pedido presupone modalidades de restaurante | pedidos.mjs servicios recoger/domicilio/mesa (6), accionesPara (17), prepararDetalle (43–103) busca mesa, ingredientes y extras | Separar pedido común, canal/cumplimiento y políticas sectoriales; no eliminar flujo existente |
| Agenda presupone mesa y capacidad de personas | reservaciones.mjs configuración (37–67), agenda_mesas y consultas (72, 134–148) | Contrato de agenda de recursos y políticas por tipo; reutilizar control atómico, conservar mesa |
| Identidad visual tiene fallback El Comal | negocio.mjs leerDatosNegocio usa id=1 y valores por defecto del negocio; public/menu.json negocio | Plantillas, marca, sucursales y contexto; sin fallback entre establecimientos |
| Acceso y configuración globales | worker.mjs ADMIN_PASSWORD, COCINA_PASSWORD, clave_cocina id=1; preferencias singleton | Identidad individual, membresía, permisos, sucursal, sesión revocable |
| No hay motor comercial | ROADMAP anterior y rutas Worker revisadas no muestran planes, suscripciones, módulos ni límites | Implementar plano de control, superadmin y autorización central |
| Almacenamiento sin aislamiento | wrangler.json único binding DB en previews; migraciones 0001–0018 descritas en auditoría anterior | ADR de aislamiento, migración no destructiva, verificación real del entorno |
| POS/caja y clientes/empleados compartidos no completos | flujos actuales de pedido/cobro, catálogo y agenda de mesas | Núcleo de clientes/empleados, POS y caja generales; separar cobros SaaS y del negocio |
| No hay citas de empleados ni órdenes de servicio tipadas | reservaciones.mjs limitado a mesas, módulos revisados | Agenda genérica primero; taller/cotizaciones después de POS, inventario y contratos comunes |

## Conservación funcional
Reutilizar catálogo de alimentos, ingredientes/variantes/extras/combos, promociones, disponibilidad, carrito, WhatsApp, pedidos mesa/recoger/domicilio, seguimiento, envío, horarios, reservas, panel encargado, cocina, estados, cobros/transferencias, reportes y exportaciones, fotos, paginación, idempotencia parcial, seguridad de entrada y migración 0018. Mantener QR y atención tradicional como canales opcionales. La auditoría no acredita que todos los flujos estén verificados en remoto; pruebas de paridad obligatorias antes de sustituir componentes.

## Riesgos y bloqueos
P0: aislamiento por establecimiento/sucursal, credenciales globales, acceso directo por API, integridad de datos y respaldo. P1: acoplamientos de alimentos/mesa/cocina, migración de identificadores/tokens/caché, modelo comercial y plantillas, costo/latencia. No desarrollar giros simultáneamente; construir núcleo y módulos comunes primero. No se conoce estado de D1 remoto ni de 0018, no se ha aplicado ninguna migración ni ejecutado despliegue. Decisión física de aislamiento pendiente. El ROADMAP y docs/arquitectura-multicomercio.md prevalecen sobre propuestas históricas.
