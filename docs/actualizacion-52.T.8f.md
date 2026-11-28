# 52.T.8f — Estabilidad visual del arranque administrativo
Fecha: 2026-11-28. Rama desarrollo. Base 349dcf4a8f4b15ceb6eb41e5188070489c22b431, árbol 453ec6776792b3f2c49f752abecec602cbb82306. CI de base 46160532434 y 46160532371, ambas exitosas.
## Diagnóstico
El documento de los módulos podía pintarse antes de que inicio-modulo-rol importara el módulo y construyera la navegación lateral. Además, la regla de panel-admin.css destinada al arranque principal afectaba a las secciones directas de otros main.
## Cambio candidato
- Las 28 páginas que comparten inicio-modulo-rol nacen con un estado de carga y un mensaje accesible. No se muestran controles ni contenido parcial durante el arranque; se publica la vista después de montar la navegación y preparar el módulo. No se añade tiempo artificial.
- Los errores de importación y montaje conservan una salida visible a la galería y un botón de reintento. Si falla el propio archivo de arranque, permanece el enlace a la galería. Las vistas de cliente que comparten inicializador siguen sin menú administrativo.
- Protección CSS del panel principal confinada al main que contiene arranque-panel, con cabecera oculta durante arranque. Se versionan los recursos compartidos y se aproxima el espaciado de las cabeceras administrativas.
- No cambia el modelo multipágina, el acceso por rol, los datos, contratos, precios ni la política de soporte. Las consultas asíncronas posteriores conservan sus estados propios; no se promete ausencia absoluta de cambios de tamaño de datos dinámicos.
## Aceptación
Pruebas Node de protección de las 28 páginas y orden del arranque; Chromium con importaciones retenidas, error de red y reintento, navegación inicio/soporte/suscripción para las 24 combinaciones en escritorio y móvil, una visita por ruta administrativa distinta y comprobación de rutas públicas de citas/mesas. El cierre requiere CI nueva exitosa y comprobación visual del usuario en el escaparate tras el despliegue autorizado.
## Continuidad
52.S.3b continúa pendiente. Sin activar 52.S.4, modificar main, Worker original, bindings, precios, datos o servicios remotos. No se ha ordenado un despliegue manual.
