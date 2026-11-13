# Auditoría técnica inicial — Taquería El Comal

Fecha: 13 de noviembre de 2026. Rama revisada: `desarrollo`. No fusionar con `main` sin revisión.

## Alcance comprobado en código

- `src/worker.mjs`: enrutamiento Worker, sesiones con cookies HttpOnly/Secure/SameSite=Strict, validación de origen en operaciones privadas.
- `src/pedidos.mjs`: precios calculados desde catálogo en servidor, tokens de seguimiento, estados con actualizaciones condicionadas, cobros y estadísticas.
- `src/reservaciones.mjs`: validación de horarios y selección de mesa con comprobación de traslapes dentro de una sentencia SQL.
- `src/entrega.mjs`: tarifas por colonia o por confirmar.
- `src/catalogo.mjs`: mantenimiento de productos, fotos y control de versiones.
- Migraciones D1 `0001` a `0017` presentes en el repositorio.
- Frontend: `public/app.js`, `public/admin/panel.js`, `public/cocina/cocina.js` y `public/seguimiento/seguimiento.js`.

## Correcciones incorporadas

1. `src/pedidos.mjs`: dirección obligatoria para pedidos a domicilio tanto al revisar como al registrar una orden; antes solo se validaba cuando el campo llegaba incluido.
2. `src/pedidos.mjs`: teléfono de contacto opcional validado en servidor con la misma lógica básica del formulario público.
3. `src/pedidos.mjs`: en modalidad de envío con tarifa por colonia, la colonia declarada en la dirección debe coincidir con la utilizada para calcular la tarifa.

No se requiere migración D1, variable secreta nueva ni modificación del frontend para estas correcciones.

## Pruebas pendientes en Cloudflare

- [ ] Pedido para recoger: revisar, registrar y consultar seguimiento.
- [ ] Pedido desde mesa: registrar, ver en panel del encargado y cocina, completar estado.
- [ ] Pedido a domicilio en modo «confirmar»: dirección completa aceptada; sin dirección rechazada.
- [ ] Pedido a domicilio con tarifa por colonia: precio y dirección coincidentes aceptados; colonia distinta rechazada con HTTP 409.
- [ ] Teléfono vacío aceptado; teléfono no vacío con formato inválido rechazado con HTTP 400.
- [ ] Reintento con el mismo token no debe crear un segundo pedido.
- [ ] Modificación concurrente de estado: un cliente recibe conflicto y debe actualizar.
- [ ] Inicio de sesión, cierre de sesión y acceso no autorizado al panel encargado y cocina.
- [ ] Reservas simultáneas para una única mesa disponible.
- [ ] Prueba de respaldar y restaurar D1 en un entorno separado, sin tocar los registros actuales.
- [ ] Confirmar las migraciones ejecutadas en el entorno real; su presencia en el repositorio no demuestra que se hayan aplicado.
- [ ] Verificar que el despliegue de Cloudflare correspondiente al último commit terminó correctamente.

## Riesgos y límites

- No se han ejecutado pruebas de extremo a extremo contra D1 real: el conector GitHub permite revisar y editar el código, pero no acceder a la base de datos o al panel Cloudflare.
- No declarar el sistema listo para ventas reales hasta verificar controles, recuperación de respaldo y operación supervisada.
- Los pedidos a domicilio almacenan dirección y teléfono: definir aviso de privacidad y período de conservación antes del uso comercial.
- Los pagos con Mercado Pago requieren integración y verificación independiente; no se incorporaron en esta auditoría.

## Siguiente bloque

Probar los flujos anteriores en `desarrollo`, documentar resultados y corregir únicamente fallos reproducibles. Conservar `main` intacta.
