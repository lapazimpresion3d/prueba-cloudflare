# Auditoría de cobros de práctica — 2026-11-27
Rama desarrollo. No se aplicaron migraciones remotas. No se modificó main.
## Hallazgos y correcciones
- Pedidos omitía pagos por cuenta y duplicaba saldos pendientes. GET pedidos incorpora resumen de libros de sesión; UI excluye comandas asociadas del resumen tradicional, suma consumo activo una vez y dirige cobro a Cuentas. Propinas quedan separadas del consumo.
- POST de pagos múltiples rechaza accion; las correcciones se tramitan por PATCH.
- Cuentas no debe ofrecer fallback tradicional si existe libro múltiple y falta esquema.
## Validación requerida antes de Point
1. Aplicar 0007, 0008, 0009 en orden solo en DEMO_DB de desarrollo, previa comprobación de identidad y respaldo.
2. Abrir mesa, entregar comandas, abonar parcialmente, comprobar resumen en Pedidos y Cuentas; combinar métodos y propina, dividir por productos, anular y corregir, reasignar, cerrar, imprimir comprobante.
3. Dos pestañas de la misma sesión: enviar dos abonos con misma revisión; solo uno debe persistir. Repetir mismo ID; comprobar que no suma de nuevo. Intentar cobro tradicional y nueva comanda durante cobro múltiple; ambos deben rechazarse.
4. Interrumpir red durante POST/PATCH, recuperar estado y verificar ID antes de repetir. Pendiente implementar recuperación persistente de operación incierta en UI.
5. Confirmar que otra sesión no lee ni modifica el libro. Probar caducidad, cuentas cerradas, error SQL y recibos físicos.
## Bloqueos
Pruebas integrales D1 y navegador no certificadas. Folios entre cuentas, tratamiento de fallos de triggers en rutas antiguas, límites de revisión y tickets físicos requieren revisión adicional. No activar cobros reales.
