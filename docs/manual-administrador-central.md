# Manual del administrador central privado — Lapazimpresion3d
Estado: candidato de desarrollo, 28/11/2026. No es una plataforma publicada. Las rutas indicadas son relativas, no enlaces operativos.
## Acceso y sesión
En un entorno autorizado, abrir /interno/central/acceso. Identificarse exclusivamente con el proveedor OIDC y MFA; no introducir contraseñas ni códigos en el panel. La sesión central dura hasta 60 min, inactividad 10 min; POST sensible requiere sesión creada hace menos de 5 min. Renovar acceso antes de decidir si es necesario. Cerrar sesión al terminar; no compartir cuentas. No registrar cookies, tokens, códigos de autorización ni secretos.
## Inicio
Consultar indicadores, distribución de planes, vencimientos a 30 días y actividad reciente. Actualizar manualmente. MRR es estimación contractual antes de IVA, no cobros; pagos del sitio principal no integrados.
## Comercios
Buscar por nombre, giro, plan y estado efectivo. Abrir expediente para revisar perfil, sucursales, contrato, implementación, personal y permisos, activación, ciclo y entrega. Las consultas pueden representar instantes distintos; refrescar antes de decidir. No divulgar expedientes fuera del propósito autorizado.
## Prospectos
Obtener primero prueba opaca de identificación OIDC mediante flujo autorizado (aún sin montaje público). Indicar nombre, sucursal, giro, paquete y versión elegible. Preparar alta, emitir invitación, entregar token una sola vez por canal seguro. Renovar o cancelar cuando corresponda; origen del alta limita estas operaciones. El propietario debe aceptar con identidad verificada. Registrar contratación inicial con referencia del acuerdo real; no implica cobro ni activación. No introducir identidad manual ni reenviar tokens vencidos. Si el resultado es incierto, consultar listado antes de repetir.
## Paquetes
Consultar última versión e historial. Las tarifas vigentes de oferta (MXN + IVA) son P1 750/149, P2 1500/249, P3 2500/349, P4 3500/499 (implementación/mensualidad). V1 conserva 149/299/449/649 de mensualidad. Regularizar mediante publicación explícita de una nueva versión, no sobrescribir contratos; conservar módulos y cupos. Si no existe versión elegible no contratar. Prestaciones mensuales son borrador, no obligación contractual. No hay editor general de módulos/cupos.
## Implementación y entrega
Filtrar implementaciones y abrir detalle. Separar pasos visitados de validación y evidencia. Consultar contrato, módulos, bloqueos y revisiones. Solicitar corrección o rechazar con motivo; aprobar solo cuando servicio indique preparación válida. Autorizar entrega en operación separada; se revalida evidencia. Revisar estado final e historial. No forzar entrega ni eludir módulos no operativos.
## Ciclo de vida
Buscar contratos, consultar estado efectivo, vigencia y vencimientos. Suspender solo por decisión autorizada; reactivar si requisitos se cumplen; cancelar definitivamente solo con acuerdo y confirmación. Registrar motivo. No se restauran sesiones antiguas ni se amplía vigencia. No hay cobro, renovación o suspensión automática por deuda.
## Operadores
Administrador consulta hasta 100 operadores y sesiones vigentes, modifica roles de otros operadores con motivo y revoca sesiones. No automodificarse; el último administrador activo está protegido. El aprovisionamiento de identidades se realiza fuera del panel, en procedimiento autorizado. Revocar inmediatamente ante incidente; verificar historial y estado.
## Auditoría y exportaciones
Filtrar por operador, comercio, acción exacta y fechas. Consultar estados anteriores/posteriores autorizados; ausencia de snapshot no equivale a ausencia de cambio. Exportar un comercio por vez con motivo y formato CSV/JSON. Límite 1000 filas por tabla y 2,000,000 bytes; si se excede se rechaza. Historial de 50 exportaciones recientes. JSON expresa importes en centavos MXN. CSV incluye columna tabla. Los archivos contienen datos comerciales y nombres de personal; proteger acceso, no enviar por canales abiertos, no usar como respaldo/restauración. No existe exportación masiva de auditoría general.
## Incidentes
401 en consulta: renovar acceso; 403: permiso, origen, sesión reciente o condición de negocio no satisfecha; 405: método; 429: límite de autenticación; 503: servicio no configurado. Si falla una escritura, consultar estado e historial antes de reintentar. No repetir automáticamente. Registrar fecha, módulo, identificador no secreto y síntoma; excluir datos privados y credenciales.
## Roles
Ver manual de permisos e inventario técnico. Los botones ocultos no sustituyen autorización del servidor. Ningún procedimiento aquí autoriza publicar o usar información de clientes reales.
