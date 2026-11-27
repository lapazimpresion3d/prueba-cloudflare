# Arquitectura objetivo — SaaS multicomercio
Fecha: 2026-11-26. Diseño conceptual propuesto, no código implementado ni decisión final de almacenamiento. ROADMAP.md define el orden de entrega.

## 1. Principios
Un código compartido, establecimientos aislados, sucursales, módulos independientes con contratos explícitos y plantillas de configuración. El núcleo no conoce reglas de mesas, cocina, vehículos, ingredientes ni otros conceptos sectoriales. El Comal mantiene sus funciones; sus reglas sectoriales viven en módulos restauranteros. Preferir un monolito modular inicialmente (propuesta) frente a microservicios innecesarios: separar fronteras de dominio, no multiplicar despliegues sin beneficio medido.

## 2. Capas y dependencias
- Transporte: Worker, resolución de dominio/slug validado, rutas API, autenticación, límites de entrada y respuesta; activos estáticos comunes.
- Núcleo: identidad, establecimientos, sucursales, membresías, roles, permisos, sesiones, clientes/empleados base, configuración, marca, seguridad, respaldo y auditoría.
- Plano de control comercial: planes, módulos, suscripciones, precios, ofertas, asignaciones, límites, plantillas y aprovisionamiento. Superadministración con permisos separados y auditoría.
- Módulos comunes: páginas, catálogo, ofertas, pedidos, citas, agenda, POS, caja, inventario, clientes ampliado, fidelización, cotizaciones, órdenes de servicio, reportes, QR/NFC.
- Extensiones de giro: alimentos, mesas, comandas, cocina, servicio de taller, atributos especializados. Dependen de contratos comunes; el núcleo nunca importa módulos de giro.
- UI común: panel generado a partir de capacidades efectivas, plantilla visual y navegación; no sustituye las comprobaciones del servidor.
- Persistencia: interfaces de repositorio con contexto obligatorio y operaciones atómicas; estrategia D1 pendiente de ADR. No pasar un binding sin ámbito a rutas comerciales sin control.

## 3. Modelo conceptual (nombres orientativos, no DDL)
| Entidad | Responsabilidad |
| --- | --- |
| establecimientos | ID inmutable, nombre, estado, giro/plantilla, configuración |
| sucursales | establecimiento, ubicación, horario, zona horaria, configuración local |
| dominios | host/slug único y validado, establecimiento, sucursal opcional |
| usuarios | identidad de acceso; sin asumir pertenencia universal |
| membresias / roles / permisos | relación usuario-establecimiento-sucursal y acciones permitidas |
| sesiones | identidad, ámbito, expiración y revocación; no guardar token en claro |
| clientes / empleados | registros base aislados por establecimiento; empleado puede existir sin cuenta de usuario |
| planes / versiones_plan | catálogo comercial, vigencia, moneda, precios en centavos |
| modulos / dependencias | identificador, estado de disponibilidad, versión, permisos, requisitos |
| suscripciones / asignaciones | plan/version/condiciones contratadas, establecimiento, vigencia, estado |
| adicionales / limites / promociones | derechos y límites comerciales, vigencias, precio especial y auditoría |
| configuraciones / marcas | preferencias con herencia explícita entre plataforma, establecimiento y sucursal |
| plantillas / versiones_plantilla | sugerencias de módulos, datos iniciales y configuración por giro |
| operaciones_provision / auditoria | idempotencia, seguimiento, actores, motivos y resultado |

Si se utiliza una base compartida, cada entidad de negocio debe incluir establecimiento_id obligatorio y referencias compuestas que impidan enlaces cruzados; sucursal_id cuando corresponda. IDs globales de usuarios/control no conceden permiso sobre datos comerciales. Si se usan bases por establecimiento, resolver el destino desde registro autorizado, no desde un identificador aportado por el navegador. Los nombres definitivos, restricciones e índices se decidirán en el ADR y esquema. La elección de almacenamiento debe medir costo, límites, restauración granular, aislamiento, latencia, complejidad de despliegue y migraciones.

## 4. Contexto y autorización
Contrato conceptual de contexto inmutable: establecimientoId, sucursalId cuando aplique, usuarioId o identidad pública, permisos, capacidades efectivas y origen validado. Resolver host/slug en servidor, verificar sucursal y pertenencia, rechazar contexto inexistente o ambiguo; nunca caer en el catálogo de El Comal por defecto. Los clientes públicos no reciben información de usuarios, suscripciones o datos internos.
Orden de comprobación: contexto válido -> estado de servicio -> módulo implementado y concedido -> módulo habilitado -> dependencias satisfechas -> rol/permiso -> ámbito de recurso y sucursal -> límites operativos -> validación e idempotencia. Denegar por defecto. Comprobar límites concurrentes en la misma transacción que crea el recurso. Aplicar a lecturas y escrituras, fotos, QR, tokens, exportaciones, caché, eventos y procesos programados.
El panel utiliza las mismas capacidades para ocultar/deshabilitar funciones, sin confiar en el navegador. Un cambio de giro/plantilla no puede elevar permisos. Accesos superadmin explícitos y auditados, sin sesión ordinaria de cliente convertida implícitamente en global. Separar permisos de empleado, derechos contratados y preferencias de canal.
Sesiones y cookies deben contemplar dominio, establecimiento, revocación y rotación. El almacenamiento local se identifica por establecimiento y contexto; evitar persistir información sensible.

## 5. Registro modular propuesto
Cada módulo declara ID, versión, disponibilidad de implementación, dependencias, acciones/permisos, rutas, migraciones propias, límites, configuración, UI y pruebas. Dependencias acíclicas, estado efectivo verificable; un módulo no depende de una plantilla ni de un plan comercial concreto.
| Módulo | Dependencia mínima propuesta | Alcance |
| --- | --- | --- |
| web | núcleo | página comercial, contenido, identidad visual |
| catalogo | núcleo | categorías, publicación y presentación |
| ofertas | núcleo | productos físicos, alimentos, servicios, variantes y precios |
| pedidos | ofertas | líneas, totales, estados, canales, seguimiento |
| citas_reservaciones | núcleo | recursos, intervalos, capacidad, disponibilidad |
| agendas_empleados | citas_reservaciones | turnos, disponibilidad y asignación de empleado |
| pos | ofertas | captura y venta interna, cuentas y tickets |
| caja | pos | turnos, pagos, movimientos, arqueos y conciliación |
| inventarios | ofertas | existencias, unidades, movimientos, alertas |
| clientes | núcleo | gestión ampliada e historial autorizado de clientes |
| fidelizacion | clientes | reglas, beneficios, saldos/eventos |
| cotizaciones | ofertas | versiones, aprobación y vigencia |
| ordenes_servicio | núcleo | tareas, activos atendidos, estados e historial |
| reportes | núcleo y fuentes habilitadas | métricas/CSV por contexto, sin asumir POS obligatorio |
| mesas | núcleo | áreas, mesas y capacidad |
| comandas | pedidos, mesas cuando se use mesa | envío operativo, no exigir mesa en mostrador |
| cocina | comandas | preparación, estaciones y estados |
| qr_nfc | núcleo | enlaces/contexto público autorizados, opcional |
La dependencia de catálogo con ofertas, comandas sin mesas, citas con otros recursos y las integraciones POS/inventario se precisarán mediante contratos; no crear ciclos. Módulos adicionales propuestos: alimentos, entrega, promociones, especialización taller, recetas/costos, compras/proveedores y automatizaciones. No incluir automáticamente los no implementados.
Eventos de dominio pueden conectar módulos mediante interfaces explícitas; las operaciones de dinero/stock requieren consistencia y reintento idempotente, no depender de un evento eventual sin reconciliación. Evitar escrituras directas en tablas internas de otro módulo.

## 6. Tipos de oferta
Entidad comercial común (ID, establecimiento, nombre, descripción, categoría, moneda, precio en centavos, estado, publicación, imagen, variantes genéricas). Tipos explícitos: físico, alimento, servicio. No confundir servicio de catálogo con modalidad de entrega de un pedido.
| Tipo | Atributos específicos sugeridos | Ejemplo ficticio |
| --- | --- | --- |
| Producto físico | SKU, código de barras, unidad, atributos de variante, seguimiento de stock si aplica | Camiseta |
| Alimento | ingredientes, extras, opciones, combos; receta y alérgenos cuando módulo lo permita | Taco |
| Servicio | duración, modalidad, recurso/empleado requerido, instrucciones y disponibilidad | Corte de cabello |
Usar extensiones tipadas y versionadas, validadas en servidor, no un JSON arbitrario sin esquema. No obligar SKU, receta ni inventario a un servicio. Si un alimento usa inventario, enlazar receta/insumo mediante su módulo, no hacer obligatorio ese módulo. Conservar instantánea de nombre, variante, precio e impuestos aplicables en documentos históricos. No reescribir pedidos históricos al editar catálogo.
Agenda común: recurso, tipo, intervalo, capacidad, zona horaria y política de disponibilidad; especializaciones de mesa/empleado/equipo. Conservar prevención atómica de traslapes y distinguir capacidad de grupo, disponibilidad de persona y recurso. No asumir duración universal.
Pedidos/ventas/órdenes de servicio son entidades distintas: pedido expresa solicitud y cumplimiento, venta registra transacción, orden de servicio registra trabajo; referencias explícitas si se integran. No duplicar cobros ni confundir pago del negocio con suscripción SaaS.

## 7. Plantillas por giro
| Plantilla | Sugerencia de configuración (según plan y disponibilidad) |
| --- | --- |
| Restaurante | web, catálogo, alimentos, pedidos, mesas, comandas, cocina, citas/reservas, POS/caja |
| Cafetería | web, catálogo, alimentos; pedidos, mostrador y POS opcionales |
| Barbería/salón | web, servicios, citas, agenda de empleados, clientes; POS/caja opcionales |
| Tienda minorista | web, catálogo físico, pedidos, POS, caja, inventario |
| Taller mecánico | web, servicios, citas, cotizaciones, órdenes de servicio, inventario, POS/caja |
| Servicios | web, servicios, agenda, cotizaciones, clientes, órdenes de servicio según necesidad |
| Emprendedor | web/catálogo y módulos a elección, según oferta |
| Personalizada | selección explícita de módulos y configuración compatible |
Aplicar una plantilla versionada como semilla de configuración y navegación, no como código distinto. Activación automática solo de módulos implementados, concedidos y con dependencias satisfechas; reportar faltantes, no activarlos silenciosamente. Datos demo sintéticos. Cambiar plantilla no debe sobrescribir catálogo, historial ni desactivar módulos con operación pendiente sin revisión. Aprovisionamiento idempotente: solicitud única, estado, pasos reanudables, rollback/compensación, usuario inicial, marca, sucursal, plan, plantilla, URL.

## 8. Planes y superadministración
| Plan | Implementación | Mensualidad |
| --- | ---: | ---: |
| Presencia digital | 750 | 149 |
| Negocio interactivo | 1500 | 299 |
| Gestión comercial | 2500 | 449 |
| Gestión profesional | 3500 | 649 |
MXN + IVA, configurables. Guardar dinero en centavos, vigencia y moneda; modelar oferta publicada, contrato y precio especial/promoción de forma separada. Panel superadmin: CRUD versionado de planes y módulos, adicionales, dependencias, límites, promociones y precios especiales, asignaciones y estados de suscripción, altas y auditoría. No fijar límites numéricos o política de promociones sin aprobación; las condiciones contratadas no se cambian automáticamente por editar un plan. Mantener exportación autorizada y conservación de datos al bajar de plan; política explícita de suspensión/reanudación; no borrar datos por deshabilitar un módulo. Facturación, pagos recurrentes, pasarelas y CFDI futuros según alcance aprobado.
Propuesta de lanzamiento: P1 con páginas/catálogos; P2 citas o pedidos; P3 POS/caja/inventario básico; P4 gestión avanzada. Los planes y giros se combinan, no son equivalentes. Un plan puede venderse por giro con módulos probados y alcance transparente.

## 9. Migración y compatibilidad de El Comal
1. Confirmar entorno y bindings D1, inventario y migraciones efectivas. Respaldo y restauración independiente verificados antes de tocar datos.
2. Preparar nueva estructura aislada; mapear cada fila existente a El Comal y su sucursal inicial, conservar IDs históricos o tabla de correspondencias, cantidades y relaciones. No sobrescribir base estable.
3. Adaptar catálogo/menu.json y preferencias singleton a contexto; alimentos conservan extras, ingredientes, variantes, combos y promociones. Agenda de mesas conserva reservas y restricciones.
4. Adaptar pedidos/cobros/seguimiento/cocina preservando estados, folios, tokens, importes, envíos, historial y reportes; verificar privacidad y compatibilidad de URLs antiguas. Confirmar 0018 antes de migrar datos financieros; no reconstruir movimientos inexistentes.
5. Migrar fotos, marca, configuración, horarios, QR y claves del navegador con estrategia explícita. Credenciales antiguas no se convierten automáticamente en cuentas globales.
6. Validar paridad por flujos, conteos, relaciones, sumas en centavos, pruebas de concurrencia, reintentos, recuperación y aislamiento. Rollback y aprobación explícita antes de publicación.
El Comal de desarrollo/pruebas y su demo pública final deben estar separados. Mantener código existente mientras se extraen módulos, con adaptadores temporales y pruebas de contrato; no eliminar una función hasta verificar equivalencia.

## 10. Pruebas y criterios de diseño
- Dos establecimientos de giros diferentes, dos sucursales, IDs iguales en recursos de prueba: lectura/escritura/relación cruzadas rechazadas; caché, tokens, fotos, QR, CSV, agenda y procesos automáticos aislados.
- Usuario con permiso en un establecimiento no lo tiene en otro, sesión revocada denegada, rol y plan no se sustituyen, módulo deshabilitado denegado por API directa, límites atómicos.
- Tipo físico sin ingredientes, alimento con opciones y servicio sin stock; validación y serialización de tipos; agenda de empleado y de mesa sin mezclar reglas.
- Provisionar dos veces no duplica establecimiento, sucursal, usuarios o suscripción. Cambio de plan/plantilla no pierde datos ni modifica contratos existentes.
- Regresión completa de El Comal, pruebas por módulo y versión comercial, pruebas de integración D1 real aislada, restauración, navegador y piloto. Medir costos y soporte antes de declarar rentabilidad.
- Orden de entrega: auditoría, diseño, núcleo, módulos/planes, páginas/catálogos, citas/agendas, restaurante, POS/caja/inventarios, especializaciones. No desarrollar todos los giros a la vez.

## 11. Decisiones abiertas
ADR de D1; esquema SQL y migraciones; proveedor/estrategia de autenticación; alcance final y límites por plan; dependencia modular definitiva, política de descuentos/contratos, pagos, impresión, facturación y offline. No se han ejecutado migraciones, cambios funcionales, pruebas nuevas ni despliegue.

## 12. Demostraciones tempranas
Se incorpora una línea paralela de presentación comercial antes de completar el núcleo: cinco negocios ficticios (Café Mirador, Barbería Elite, Mundo Mascotas, Taquería El Comal y Auto Servicio Bahía), una interfaz y cuatro planes seleccionables independientemente. Registro compartido de módulos con disponibilidad real, datos de catálogo sintéticos y sin API de escritura. El escaparate inicial no es autorización ni un entorno SaaS operativo; al incorporar módulos verificados, conectar al contexto, capacidades y permisos de servidor. No alterar El Comal ni datos reales. Ver docs/demostraciones-multicomercio.md y ROADMAP.md actualizados.
