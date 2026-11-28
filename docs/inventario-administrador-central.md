# Inventario técnico del administrador central
Base auditada dd968a7, CI 46147490813: 358 Node y 9 Python, sin fallos. Rutas candidatas no montadas. Prefijo /interno/central.
| Módulo | GET (sufijos) | POST (sufijos) | Servicio |
|---|---|---|---|
| Acceso | /acceso, callback exacto configurado | /acceso-iniciar, /salir | acceso-central, flujo-oidc, identidad-oidc |
| Inicio | raíz, /navegacion, /dashboard | — | dashboard-central |
| Comercios | /comercios, /directorio, /expediente | — | directorio-central |
| Prospectos | /prospectos, /altas | /alta-accion?accion=… | prospectos-central, alta-autorizada, contratacion-autorizada |
| Paquetes | /planes, /planes-datos, /planes-historial | /planes-publicar | planes-central, versiones-contractuales, precios-confirmados |
| Implementación | /implementaciones, /implementaciones-datos, /implementaciones-detalle | /implementaciones-decidir | implementaciones-central, entrega-comercial |
| Ciclo | /ciclo, /ciclo-datos, /ciclo-detalle | /ciclo-decidir | ciclo-central, ciclo-comercial |
| Operadores | /operadores, /operadores-datos | /operadores-cambiar, /operadores-revocar | seguridad-central, permisos-central |
| Auditoría | /auditoria, /auditoria-datos, /exportaciones-historial | /exportar | auditoria-central, exportaciones-comerciales |
Composición: rutas-http-central.mjs, interfaz-central.mjs, navegacion-central.mjs. Las funciones de fábrica reciben dependencias explícitas y habilitado=false por defecto. POST de datos JSON limitado a 8192 bytes, mismo origen; GET con filtros cerrados y no duplicados; no-store, CSP nonce, frame-ancestors none. Autenticación inicial por formulario, callback exacto.
Migraciones COMMERCE_DB: 0006 administrador, 0009 auditoría, 0013 integridad pagos, 0015 OIDC, 0016 sesiones centrales, 0018–0022 altas e invitaciones, 0023 catálogo contractual, 0024 contrato inicial, 0025 activación, 0026 cambios contractuales, 0027–0037 perfil/organización, 0038 progreso, 0039 validaciones, 0040 entrega, 0041 reapertura, 0042 ciclo, 0043 suspensión, 0044 reactivación, 0045 cancelación, 0046 exportaciones, 0047 roles, 0048 atomicidad entrega. Aplicar cadena completa en orden únicamente en ambiente autorizado; no editar migraciones históricas. 0048 rechaza inconsistencias existentes. No hay migración nueva en esta etapa.
Infraestructura: wrangler.comercial.json apunta a src/worker-comercial.mjs, nombre lapaz-comercios-desarrollo, workers_dev=false, preview_urls=false, COMERCIAL_ENTORNO=desarrollo y COMERCIAL_HABILITADO=no. No contiene bindings D1 provisionados. Worker devuelve 503 no_disponible en GET raíz y /api/comercial/estado; otras rutas 404. entorno-comercial.mjs valida separación de cuatro IDs D1 y esquemas, no demuestra separación remota. COMMERCE_DB y PROVIDER_DB deben ser distintos; DB, DEMO_DB y ASSETS prohibidos en worker dedicado.
Configuración OIDC de servidor (no valores reales): emisor, audiencia, claves, acrCentral, autorizacion, intercambio, retorno, secreto. Callback HTTPS exacto y coincidente con retornoCentral; limitarAcceso obligatorio. Revisar confianza del destino OIDC, validación de callback, secretos, rotación y límites. No guardar secretos en repositorio o navegador.
