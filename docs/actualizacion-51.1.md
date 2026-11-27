# Actualización 51.1 — Inicio de sesión comercial

Base: 7503bfb47ca4298c1ed999f6e5e399d8454f08a5. CI base: 46072101169, éxito.

El núcleo ya verifica usuario, membresía, empresa, rol y sucursal en SQL; empresa.ver permite sucursal autorizada. El panel privado está deshabilitado por defecto. Las sesiones usan cookie HttpOnly/Secure/SameSite, hash y caducidad. Se detectó que iniciar no exigía POST ni origen exacto, a diferencia de cerrar y revocar. Se exige ahora antes de verificar identidad; se acotan emisor y sujeto como en el núcleo. Se añade prueba negativa de GET, origen ajeno, ausente y null, sin emisión de sesión. El proveedor de identidad sigue sin configurar; un futuro callback OAuth deberá diseñarse separadamente, no desactivar esta protección.

Pendientes: matriz completa de rutas, permisos individuales de servidor, auditoría de valores anterior/posterior, límites de alta, sesión revocada durante escritura, suscripciones y alcance, integridad financiera, respaldo y diagnóstico. No se modifica el almacenamiento de práctica ni se activan rutas privadas, migraciones o cobros. CI y despliegue de este commit deben verificarse por separado.
