# Presentación pública independiente de las demostraciones
## Entrada y navegación
- /demostraciones/ conserva comparador, selector, laboratorio de pruebas y controles técnicos del servidor.
- /demostraciones/negocio/?negocio=cafe-mirador&plan=p1 es el nuevo destino relativo para enlaces comerciales (no URL desplegada verificada). Identificadores de negocios y planes anteriores conservados. La ruta antigua con vista=negocio redirige a esta nueva entrada si ambos parámetros son válidos. Los IDs desconocidos no muestran otro negocio.
- /demostraciones/?negocio=cafe-mirador&plan=p1&vista=administracion abre panel de práctica con pestañas catálogo e información del negocio. Oculta comparador, matriz de módulos y controles técnicos de D1. No es administración autorizada SaaS. El panel permite alta, edición, baja, disponibilidad, restauración y personalización local; el laboratorio conserva la persistencia de práctica de catálogo en servidor.
- La página pública usa semillas ficticias sin leer almacenamiento local por defecto. El panel ofrece "Ver mi página de práctica", que abre la misma ruta pública con practica=1 y muestra solo la copia local explícita, con aviso. Salir del panel regresa a la página limpia. No se comparten cambios mediante enlaces.
- El regreso a lapazimpresion3d.com/#paginas-web está siempre visible. Los enlaces de demos se incorporarán al repositorio comercial solo después de verificar URL, alcance y autorización.

## Diseño y alcance
Cinco identidades sectoriales: cafetería editorial cálida, barbería oscura con acento dorado y tarjetas horizontales, tienda de mascotas verde con formas redondeadas, taquería rojiza con imagen de referencia existente y taller azul de tarjetas horizontales. Portada, navegación, especialidades, catálogo con filtros, precios, servicios/duración, sección de negocio, contacto y horarios, responsive y accesibilidad básica. Emblemas vectoriales originales de ejemplo. Fotografías reales de cada giro y carga/gestión de imágenes pendientes; los elementos sin foto utilizan iconos ilustrativos. No presentar como diseño final aprobado por clientes.
Las páginas son informativas; seleccionar p2/p3/p4 no activa pedidos, citas, POS, pagos u otros módulos. La demo restaurantera original conserva sus rutas. La administración pública de práctica no muestra opciones técnicas ni permite datos de otros visitantes.

## Verificación y estado
- Se ejecutó el controlador público con fuentes exactas de GitHub y un DOM simulado: 20/20 combinaciones renderizaron catálogos y enlaces; 20/20 filtros sin coincidencia; 3/3 URLs inválidas; 1/1 vista de práctica. Sintaxis de ambos controladores e IDs DOM comprobados. Añadido tests/presentaciones-demo.test.mjs, pendiente suite Node integrada, ejecución real de navegador, responsive visual y despliegue actualizado.
- El propietario reportó que la conexión previa a D1 de demostraciones funcionó tras configurar DEMO_RATE_SECRET en Preview desarrollo (deployment b29cb1dc-46bc-4b09-8f48-5d59b14363b7). Es confirmación del propietario, no validación independiente de todas las operaciones ni de este nuevo commit.
- Binding DEMO_DB agregado en ff7a914; DB original preservada. No se alteró configuración Cloudflare en este bloque, ni main ni el sitio comercial. No publicar enlaces de este commit hasta revisar despliegue.

Siguiente: validación en navegador y primera demo P1 aprobada; catálogo de imágenes propio, personalización remota, permisos y módulos operativos. Mantener el laboratorio separado de la presentación pública.
