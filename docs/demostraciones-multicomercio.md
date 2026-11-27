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
Disponible aquí: página/identidad y consulta de catálogo; en desarrollo: pedidos, seguimiento, citas, administración, pagos, POS, caja, inventario, clientes, etc. Plan superior: fuera del paquete seleccionado. Vista previa: ejemplo no operativo. El escaparate no presenta formularios de pedidos/citas/pagos, no llama API, no escribe D1 ni modifica suscripciones. Desde la actualización de editor, guarda exclusivamente los catálogos ficticios de práctica en sessionStorage por establecimiento; pide no introducir datos personales. No es el aislamiento de datos del SaaS futuro; los catálogos son públicos y ficticios. Las páginas originales de El Comal conservan su comportamiento y son independientes del selector.

Para incorporar un nuevo módulo: implementar y validar con núcleo de aislamiento y autorización; añadir adaptador y UI compartidos, verificar dependencias y límites, incorporar a registro central y habilitar solo cuando realmente utilizable. El registro de UI no reemplaza comprobaciones en servidor. Los módulos sectoriales permanecen separados. Los catálogos se migrarán a fuente central por establecimiento cuando esté lista; no se sincronizan automáticamente con los datos vivos de El Comal.

## Verificación
Ejecuté las siete funciones de prueba obtenidas del repositorio en entorno JavaScript con aserciones equivalentes; 7/7 correctas, 20 combinaciones comprobadas, 27 elementos y 5 identidades. Sintaxis del controlador válida y todos sus IDs DOM presentes en HTML. No se ejecutó la suite completa con Node, navegador real, Cloudflare remoto ni D1. No se ha confirmado el despliegue ni el MIME de .mjs en preview.
Siguiente: verificar navegador y preview, completar ADR del núcleo, autenticación y módulos en servidor, habilitar cada operación aislada gradualmente y ejecutar regresiones. Sin nuevas migraciones. main no modificada.

## Ampliación: vista individual y editor de práctica
- Ruta relativa /demostraciones/?negocio=barberia-elite&plan=p2&vista=negocio abre el negocio sin comparador visible. Botón para volver a comparar y enlace directo con parámetros limpios. La vista sigue siendo informativa y ficticia; no implica disponibilidad de P2.
- catalogo-local.mjs: CRUD local, validación de campos, precio entero en centavos, duración obligatoria de servicios, máximo 100 elementos, disponibilidad, restauración selectiva y lectura defensiva de datos corruptos. Las imágenes se limitan a las referencias originales; sin subida de imágenes ni enlaces externos. El editor utiliza los catálogos existentes como semillas; no altera public/menu.json ni D1.
- Cambios en sessionStorage por establecimiento, no por plan, por sesión de pestaña; sin sincronización entre dispositivos. Si el almacenamiento está bloqueado, cambios en memoria y aviso. Enlaces directos no comparten modificaciones locales. No es autenticación ni administración de clientes reales.
- Se ejecutaron las 7 pruebas anteriores y 8 nuevas de tests/catalogo-demo.test.mjs sobre fuentes obtenidas de GitHub en JavaScript con aserciones equivalentes: 15/15 correctas; sintaxis del controlador e IDs/campos HTML verificados. Pendientes Node completo, pruebas de navegador y despliegue. No declarar listo para contratar.

## Ampliación de servidor
El escaparate consulta /api/demo/contexto y ofrece conectar/cargar/guardar una copia de práctica temporal por sesión y establecimiento mediante una D1 dedicada opcional. La descripción anterior de ausencia de llamadas API corresponde a la versión histórica; ahora hay consultas de contexto y acciones de práctica separadas de las API de El Comal. No se ha configurado DEMO_DB ni aplicado el esquema; el modo local sigue disponible. Ver docs/nucleo-demos-servidor.md.

## Personalización local de página
Editor compartido para nombre comercial, icono predefinido, colores, lema, descripción, horario, ubicación ficticia y contacto textual. Sin carga de imágenes, enlaces externos, datos reales ni edición de IDs/giro. Los cambios quedan en sessionStorage por establecimiento y se pueden restaurar; si falla almacenamiento se conservan en memoria. La página individual refleja la práctica local, no publica cambios. La persistencia remota de perfil sigue pendiente; la copia de catálogo en D1 requiere configurar base dedicada. Ver tests/perfil-demo.test.mjs.

## Presentación pública separada
Nueva ruta /demostraciones/negocio/ con negocio/plan, portadas sectoriales y panel de práctica sin controles técnicos. Página pública limpia; vista explícita de práctica con practica=1. El comparador original se mantiene como laboratorio. Ver docs/presentacion-publica-demos.md. Pendientes fotografías de giros, despliegue actualizado y pruebas reales; no implica disponibilidad comercial de paquetes superiores.
