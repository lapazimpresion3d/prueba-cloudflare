# Demostraciones multicomercio tempranas
2026-11-26. Implementación inicial en desarrollo; no es una instalación SaaS operativa.

## Acceso y alcance
Ruta /demostraciones/ con parámetros negocio y plan (p1–p4). Ejemplo: /demostraciones/?negocio=barberia-elite&plan=p2. Selección independiente, precios exactos en MXN + IVA. Los parámetros desconocidos vuelven a las opciones iniciales; no resuelven datos del servidor. Enlaces desde la portada y /demo/. La demo original de El Comal permanece intacta salvo el enlace de navegación; sus ejemplos estáticos de encargado/cocina se identifican como vistas previas, no operaciones del selector.

## Archivos
- public/demostraciones/index.html, estilos.css, app.mjs: interfaz compartida adaptable, selector, perfil, catálogo, filtros de texto/tipo/categoría y matriz de funciones.
- establecimientos.mjs: cinco semillas sintéticas independientes con ID, giro, marca, horarios, configuración y ofertas tipadas. 27 elementos; referencias estáticas de imágenes y algunos precios de El Comal se reutilizan sin consultar el menú vivo. Los otros precios/descripciones son ilustrativos.
- config.mjs: registro central de cuatro planes y módulos, importes en centavos, reglas de aplicabilidad por giro, nivel mínimo, disponibilidad y dependencias. Cada establecimiento admite todos los planes. Modificar el registro compartido actualiza la presentación de las cinco demos tras despliegue; no activa operaciones automáticamente. El panel de superadministración y la configuración persistente de precios aún no existen.
- tests/demostraciones.test.mjs: siete pruebas reproducibles con Node (node --test tests/demostraciones.test.mjs).

## Disponibilidad y seguridad
Disponible aquí: página/identidad y consulta de catálogo; en desarrollo: pedidos, seguimiento, citas, administración, pagos, POS, caja, inventario, clientes, etc. Plan superior: fuera del paquete seleccionado. Vista previa: ejemplo no operativo. El escaparate no presenta formularios de pedidos/citas/pagos, no llama API, no escribe D1 ni almacenamiento del navegador, no modifica suscripciones, no recibe datos personales. No es el aislamiento de datos del SaaS futuro; los catálogos son públicos y ficticios. Las páginas originales de El Comal conservan su comportamiento y son independientes del selector.

Para incorporar un nuevo módulo: implementar y validar con núcleo de aislamiento y autorización; añadir adaptador y UI compartidos, verificar dependencias y límites, incorporar a registro central y habilitar solo cuando realmente utilizable. El registro de UI no reemplaza comprobaciones en servidor. Los módulos sectoriales permanecen separados. Los catálogos se migrarán a fuente central por establecimiento cuando esté lista; no se sincronizan automáticamente con los datos vivos de El Comal.

## Verificación
Ejecuté las siete funciones de prueba obtenidas del repositorio en entorno JavaScript con aserciones equivalentes; 7/7 correctas, 20 combinaciones comprobadas, 27 elementos y 5 identidades. Sintaxis del controlador válida y todos sus IDs DOM presentes en HTML. No se ejecutó la suite completa con Node, navegador real, Cloudflare remoto ni D1. No se ha confirmado el despliegue ni el MIME de .mjs en preview.
Siguiente: verificar navegador y preview, completar ADR del núcleo, autenticación y módulos en servidor, habilitar cada operación aislada gradualmente y ejecutar regresiones. Sin nuevas migraciones. main no modificada.
