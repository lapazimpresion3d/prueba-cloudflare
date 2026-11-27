# v0.8 — Carrito, pedidos y seguimiento de práctica
## Alcance y entrada
Paquete Negocio interactivo (P2) y superiores, únicamente cafetería, restaurante y tienda. Nueve combinaciones habilitadas; P1 y los giros de barbería/taller no muestran carrito. El registro central de capacidades activa pedidos y seguimiento como práctica local, no como módulos SaaS listos.
- /demostraciones/negocio/?negocio=cafe-mirador&plan=p2 (cliente)
- /demostraciones/pedidos/?negocio=cafe-mirador&plan=p2 (encargado), accesible desde "Probar panel administrativo" → "Pedidos de práctica".
- Cambiar negocio por mundo-mascotas o taqueria-el-comal. Mantener todo en la misma pestaña. Los enlaces no comparten datos entre personas/dispositivos.
## Flujo
Agregar alimentos o productos físicos disponibles, ajustar cantidades, quitar, vaciar, seleccionar modalidad y crear pedido. Los servicios de cita no se incluyen. Cafetería/restaurante: local, recoger, domicilio ficticio con cargo de $35 MXN. Tienda: recoger o domicilio ficticio con cargo de $40 MXN. No se solicita dirección, nombre, contacto ni pago. Totales en centavos y folio DEMO único. Precios y cantidades del pedido se congelan al crearlo.
Panel con conteos, filtro, detalle, historial y cambios de estado válidos: recibido → preparando → listo → entregado. Cancelar desde estados no terminales; entregados/cancelados no se modifican. Restablecer historial solo del comercio actual, previa confirmación. Volver a la página del cliente y consultar Mis pedidos de práctica; actualizar estado o recargar. Estado visible también cuando se vuelve con navegación histórica.
## Almacenamiento y límites
sessionStorage por establecimiento. Pedidos compartidos entre planes compatibles del mismo negocio y vistas original/personalizada dentro de esa pestaña; carritos separados entre vista original y personalizada. 30 pedidos, 30 líneas por pedido, 20 unidades por línea, total máximo 100000000 centavos. El pedido no se confirma si el almacenamiento falla. Se revalidan IDs, precios y disponibilidad contra el catálogo cargado en el cliente y se valida estructura de historial local. No es seguridad de servidor ni autenticación; no usar para ventas. Las copias pueden perderse al cerrar pestaña y el navegador puede duplicar una pestaña. Los datos originales y D1 no se tocan.
## Verificación
30/30 pruebas lógicas con fuentes GitHub y aserciones equivalentes a los archivos de test; 9 combinaciones habilitadas y 11 no habilitadas en DOM simulado; flujo cliente → pedido → encargado → preparación → seguimiento en DOM simulado correcto. Sintaxis de módulos e IDs HTML verificados. No se ejecutaron navegador real, suite Node/SQLite integrada, despliegue de Cloudflare ni persistencia D1 para este módulo.
## Pendientes
Confirmar Preview actualizado y persistencia de perfiles (propietario ya creó demo_perfiles). Incorporar API propia de pedidos, almacenamiento privado por sesión y establecimiento, cálculo de precios y modalidades desde servidor, idempotencia y concurrencia antes de sincronizar entre pestañas. Después citas y agenda de recursos, cocina, pagos y módulos restantes. No conectar /api/pedidos operativa, ni modificar main o sitio comercial. No vender P2 por esta prueba local.

## Ampliación v0.9
La práctica local permanece disponible. Existe modo servidor explícito con API aislada y migración 0003_pedidos pendiente. No se importan pedidos locales ni se sincroniza entre dispositivos. Ver docs/pedidos-servidor-demo.md.
