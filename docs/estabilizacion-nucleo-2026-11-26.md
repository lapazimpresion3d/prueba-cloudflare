# Estabilización del núcleo — 2026-11-26

## Cambios
- src/pedidos.mjs: estado listo obligatorio antes de reparto; entrega condicionada a total conocido y cobro exacto, o cero sin cobro activo; cancelar exige no tener cobro activo; anulación bloqueada en entregados; cotización manual previa a nuevos cobros, conciliación de legados si el importe coincide; paginación ascendente opt-in de activos y cocina, preservando contrato anterior sin pagina=1; vista de entregados por conciliar.
- public/admin/{index.html,panel.js}: mensajes y controles alineados, conciliación y navegación de activos.
- public/cocina/cocina.js: navegación de páginas.
- public/app.js: guarda token y huella SHA-256 en sessionStorage antes de enviar, reutiliza el token en la misma pestaña si la carga coincide, consulta intento anterior si cambió. No guarda dirección ni teléfono en ese registro. No elimina duplicados entre pestañas/dispositivos; si la carga cambió y el intento no aparece, pide confirmación explícita, existe riesgo residual de solicitud en vuelo.
- public/seguimiento/seguimiento.js: pago por verificar si no concilia.
- migrations/0018_historial_cobros.sql: tabla, instantánea inicial y triggers de INSERT/UPDATE; conserva valores anteriores y nuevos. No recupera versiones ya sobrescritas, no registra identidad individual o motivo, no es módulo de reembolsos.

## Validación realizada
SQLite local con esquema reducido y sentencias equivalentes a las de src/pedidos.mjs: 19 comprobaciones iniciales correctas (entregas, cancelación, anulación, cotización histórica, paginación de 122 filas). Tras ajuste adicional, tres comprobaciones correctas: cero con cobro incompatible, cero sin cobro, filtro de conciliación. SQL de 0018 reproducido localmente con esquema reducido: instantánea, registro, cambio de método, anulación, reactivación, actualización sin cambios y preservación de filas correctos. No se ejecutó el Worker completo, ni pruebas de navegador o D1 remoto. El reporte previo de etapa 0 no contiene evidencia ejecutable de sus pruebas; usar estas comprobaciones locales como referencia reproducible conceptual.

## Despliegue controlado (pendiente)
1. Verificar que la vista previa apunta a una D1 aislada; confirmar las migraciones 0001–0017 aplicadas.
2. Exportar/resguardar D1 y comprobar restauración en base separada.
3. Aplicar 0018 únicamente en la D1 de desarrollo mediante el administrador de migraciones o ejecutar el SQL en el entorno correcto. No se ha aplicado. No aplicar en producción sin autorización.
4. Verificar los triggers y la tabla historial_cobros; la lógica operativa no depende de esa tabla, pero el historial no empieza a guardarse hasta instalar la migración.
5. Confirmar despliegue del commit actual y probar en móvil y escritorio.

## Pruebas manuales pendientes
- Recoger/mesa: registrar, confirmar, preparar, listo, intentar entregar sin pago, registrar total, entregar. Repetir con total cero.
- Domicilio manual: no permitir cobro antes de cotizar; publicar envío cero y positivo; confirmar paso listo antes de reparto; cobrar exacto y entregar.
- Pedidos históricos con cobro incompatible: localizar en Entregados por conciliar. No anular un entregado; los casos irreconciliables requieren procedimiento financiero específico.
- Cancelación: pedido impago permitido; pagado bloqueado. Corregir un registro solo tras verificar el movimiento real; no implica devolución de dinero.
- Simular respuesta perdida tras INSERT y recargar misma pestaña: reconstruir los mismos datos, verificar folio único; cambiar datos y revisar aviso de intento anterior.
- Crear más de 50 pedidos en entorno aislado; recorrer páginas en encargado/cocina; probar actualización y cambios simultáneos de estado.
- Con 0018 aplicada: registrar, cambiar método, anular y registrar de nuevo en pedido no entregado; consultar historial_cobros y comprobar eventos.
- Verificar acceso a APIs, roles actuales, límites de cuerpo y sesiones; prueba de recuperación y concurrencia real.

## Riesgos restantes
No existe devolución monetaria automática, cuentas individuales, auditoría por operador ni deduplicación entre dispositivos. Paginación no es una instantánea transaccional durante cambios concurrentes. No se ha verificado el despliegue ni aplicado D1. No fusionar main. No iniciar arquitectura multirrestaurante hasta completar pruebas del núcleo y respaldo.
