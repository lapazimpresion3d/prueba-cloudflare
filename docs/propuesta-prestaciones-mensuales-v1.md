# Propuesta interna — prestaciones mensuales v1
Estado: borrador, no publicado ni vinculante. No modifica precios, versiones o cupos vigentes. El catálogo contractual de desarrollo sigue en $149/$299/$449/$649 MXN más IVA; el escaparate sigue en $149/$249/$349/$499. Resolver discrepancia mediante decisión comercial explícita antes de publicación.
## Alcance
Todos: alojamiento con subdominio, HTTPS, mantenimiento correctivo, seguridad, actualizaciones generales, almacenamiento, respaldos, monitoreo, autogestión y soporte técnico, diseño adaptable. Su disponibilidad real requiere completar módulos y pruebas. No incluye dominio personalizado, renovaciones de dominio, fotografía, publicidad, redes sociales, desarrollos a medida, carga masiva, rediseños, comisiones de pago, productos físicos ni capacitación adicional.
## Límites propuestos (no aplicados)
| Plan | Productos/servicios | Imágenes MiB | Datos MiB | Asistencia de uso min/mes | Objetivo respuesta hábil | Objetivo respaldo | Retención copias |
|---|---:|---:|---:|---:|---:|---|---:|
| p1 |100|250|100|15|3 días|semanal|14 días|
| p2 |300|500|250|30|2 días|diario|14 días|
| p3 |1000|1000|500|45|2 días|diario|30 días|
| p4 |2500|2000|1000|60|1 día|diario|30 días|
Límites por empresa, no por sucursal; almacenamiento de imágenes y datos separados, copias fuera de cuota. Asistencia de uso no acumulable; incidencias atribuibles a plataforma no consumen esa bolsa. Primera respuesta, no resolución, horario hábil local a definir; sin SLA garantizado. No hay bloqueo automático ni eliminación de registros al alcanzar límites: avisar, evaluar ampliación y acordar condiciones. Retención de copias no equivale a retención de datos tras baja.
## Implementación
Diseño inicial, configuración, carga inicial acordada, capacitación inicial y entrega validada. Mensualidad: operación continua. Definir cantidades de carga inicial y capacitación al cotizar; no prometer disponibilidad, soporte 24/7 o respaldo verificable antes de pruebas.
## Integración posterior
Medir costos por comercio y uso en piloto; aprobar precios, límites y soporte; versionar prestaciones por plan junto al contrato, conservar condiciones anteriores, registrar aceptación, medir uso, respaldos y restauraciones, panel y alertas. No crear migración ni aplicar cuotas ahora. Vincular al bloque 52.3.7.5 para exportación y conservación, 52.8 para respaldos y monitoreo, 52.9 para validación económica. No sustituye el plan de desarrollo. CI anterior 46139685446 exitosa.