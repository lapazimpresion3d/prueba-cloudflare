# Hoja de ruta — Plataforma para restaurantes
Estado: Etapa 0 en curso. La demo El Comal conserva su identidad; el producto reutilizable será independiente. Trabajar solo en desarrollo; no fusionar ni publicar main sin autorización.
## Prioridad inmediata
- [x] Confirmar ramas y commits de partida.
- [x] Revisar módulos críticos y 17 migraciones versionadas.
- [x] Reproducir casos SQL de cobro en SQLite local.
- [ ] Completar inventario y pruebas automatizadas del Worker.
- [ ] Confirmar bindings, aislamiento de demo y migraciones remotas.
- [ ] Respaldo D1 independiente y restauración en entorno separado.
- [ ] Corregir política de entrega/cotización/cobros, idempotencia persistente y cola de activos; pruebas de regresión.
- [ ] Auditar autenticación, acceso, privacidad y concurrencia; probar en preview.
## Plan maestro (no implementado)
1. Multirrestaurante y configuración por establecimiento.
2. Usuarios, roles y permisos.
3. POS web y cuentas.
4. Caja.
5. Meseros.
6. Cocina profesional.
7. Tickets.
8. Menú avanzado y QR/NFC.
9. Inventario y costos.
10. Reportes.
11. Reservaciones/clientes.
12. Pagos e integraciones.
13. Operación parcial sin conexión.
14. Seguridad, respaldos, estabilidad (transversal desde etapa 0).
15. Planes y suscripciones.
16. Productos físicos QR/NFC.
17. Demo aislada.
18. Presentación comercial.
19. Costos y escalabilidad (medir desde etapa 0).
## Entregas comerciales
1.0: aislamiento, roles, menú, pedidos, mesas, cocina, reservas, administración, respaldo y suscripciones.
2.0: POS, caja, meseros, cuentas, tickets y reportes.
3.0: inventario básico, estaciones, pagos, fidelización y modo offline parcial.
4.0: inventario avanzado, recetas, costos, proveedores, facturación y análisis.
No declarar versiones comercializables sin pruebas, piloto y documentación. Precios son configurables y pendientes de validación.
Ver docs/auditoria-etapa-0-2026-11-26.md.
