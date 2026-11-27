# Mercado Pago Point — primera etapa (v0.12.5)
## Implementado y alcance
Adaptador privado src/pagos/point.mjs con transporte inyectado obligatorio: lista la primera página de terminales en modo PDV, construye POST /v1/orders con referencia sin PII, importe en centavos y clave de idempotencia estable por intento, y GET /v1/orders/{id}. Verifica identidad de orden, comercio, terminal, país, importe, estado de pago y acreditación; moneda y total global se verifican si están presentes (ejemplo GET oficial no los incluye). Propina o devolución no conciliada se deriva a revisión. No registra cobros en D1 todavía. No está importado en worker ni expuesto en frontend. No hay credenciales ni tráfico real.
Pruebas: siete grupos ejecutados sobre las fuentes con transporte simulado; tests/point.test.mjs permite repetir con node --test tests/point.test.mjs. No se ha ejecutado la suite integrada ni el sandbox oficial.
## Próxima etapa: prueba privada
1. Crear aplicación en Mercado Pago Developers para Point en México, con usuario de prueba y credenciales del entorno de prueba. No compartir token en chat, GitHub, navegador ni logs. La documentación usa ejemplos de prefijos inconsistentes; nunca identificar entorno solo por prefijo.
2. Configurar caja/sucursal y terminal de prueba según instrucciones oficiales; utilizar modo PDV. Confirmar identificador y comercio desde cuenta autorizada.
3. Crear un servicio de pruebas privado separado del Preview público, secretos solo en backend. Persistir intento, importe, moneda, comercio, terminal y clave de idempotencia antes de enviar. Usar cuenta y terminal de prueba; verificar explícitamente que el entorno no puede procesar pagos reales.
4. Enviar orden y conservar ID orden/pago. Probar escenarios documentados con POST /v1/orders/{order_id}/events solo en sandbox. Consultar GET para conciliar. Ante timeout, reintentar exactamente la misma solicitud y clave; no iniciar otro cobro hasta resolver estado.
5. Agregar almacenamiento duradero de intentos y transacciones, independiente de las sesiones de demo de dos horas. Implementar webhooks autenticados según documentación y verificar por GET con credenciales del comercio, deduplicación, manejo de eventos desordenados y conciliación atómica. Nunca acreditar por datos del navegador o por una notificación sola.
6. Cobro único de cuenta: congelar partidas y saldo antes del intento, impedir cobros simultáneos/manuales mientras exista intento pendiente, aplicar asignaciones atómicas solo cuando se confirme el total y registrar diferencias, comisión, reembolso y contracargo por separado.
7. Producción únicamente con autorización explícita, OAuth Authorization Code por comercio, permisos reales, secretos cifrados, refresh seguro, revocación, separación de tenants, terminal autorizada, auditoría, recuperación ante caída, pruebas reales controladas y política de soporte. Ningún cobro real desde demo. No se guardan números de tarjeta, CVV ni datos de banda.
## Referencias oficiales consultadas 2026-11-27
- https://www.mercadopago.com.mx/developers/es/docs/mp-point/payment-processing
- https://www.mercadopago.com.mx/developers/es/docs/mp-point/integration-test
- https://www.mercadopago.com.mx/developers/es/docs/mp-point/create-application
- https://www.mercadopago.com.mx/developers/es/docs/mp-point/configure-terminal
- https://www.mercadopago.com.mx/developers/es/docs/mp-point/notifications
- https://www.mercadopago.com.mx/developers/es/reference/in-person-payments/point/orders/get-order/get
- https://www.mercadopago.com.mx/developers/es/docs/mp-point/go-to-production
