# Integración comercial con Lapazimpresion3d
Fecha: 2026-11-26. Coordinación entre proyectos; no modifica el sitio comercial.

## Responsabilidades
- lapazimpresion3d/prueba-cloudflare, rama desarrollo: plataforma SaaS, datos ficticios, módulos, permisos, demostraciones y pruebas. Mantener la versión estable intacta.
- lapazimpresion3d/lapazimpresion3d-web, rama main: sitio oficial lapazimpresion3d.com, catálogo comercial, comparación de paquetes, selector y captación. Cambios en rama independiente, publicación solo autorizada. Este proyecto no edita ese repositorio sin solicitud específica.
La lectura de main del repositorio comercial (5add6a8c7ceaaf379dae1a83319404b385a009c0) confirma public/index.html con #paginas-web, tarjeta de El Comal y enlace a cotizacion-web.html; public/cotizacion-web.html contiene formulario de contacto y giro. No equivale a verificar su comportamiento en producción.

## Identificadores
| Demo | negocio (escaparate) | giro |
| --- | --- | --- |
| Café Mirador | cafe-mirador | cafeteria |
| Barbería Elite | barberia-elite | barberia |
| Mundo Mascotas | mundo-mascotas | tienda |
| Taquería El Comal | taqueria-el-comal | restaurante |
| Auto Servicio Bahía | auto-servicio-bahia | taller |

| plan | Nombre | Implementación | Mensualidad |
| --- | --- | ---: | ---: |
| p1 | Presencia digital | 750 | 149 |
| p2 | Negocio interactivo | 1500 | 299 |
| p3 | Gestión comercial | 2500 | 449 |
| p4 | Gestión profesional | 3500 | 649 |

MXN más IVA; mantener configuración comercial coherente con el registro central del SaaS. No asociar un giro de manera exclusiva con un paquete.
Ruta relativa implementada: /demostraciones/?negocio=cafe-mirador&plan=p1 (ejemplo de parámetros, no URL pública verificada). Los cinco negocios admiten los cuatro planes. Contrato propuesto para el formulario comercial: cotizacion-web.html?paquete=p1&giro=cafeteria. Los nombres exactos de parámetros de cotización son una propuesta para coordinar con el otro proyecto, no funcionalidad ya implementada. Validar identificadores; preseleccionar sin enviar datos automáticamente. El nombre ficticio no es el nombre del negocio del prospecto.

## Publicación progresiva
Registrar por combinación: ID de negocio, giro, plan, commit, entorno, URL HTTPS verificada, fecha, módulos realmente probados, estado demo y estado comercial. Un enlace de preview no es una aprobación de producción. No equiparar un catálogo informativo con un paquete operativo.
1. Implementar módulo en plataforma y probar permisos, aislamiento, límites y regresión; mantener datos sintéticos.
2. Desplegar en entorno de demo autorizado, verificar URL real, parámetros, navegación, móvil/escritorio y funciones anunciadas.
3. Registrar evidencia y determinar si el paquete/giro está listo para contratarse. No anunciar módulos pendientes ni activar compras prematuramente.
4. Entregar al proyecto comercial URL y evidencia. Preparar actualización en rama separada y comprobar impresión 3D, formulario y navegación. No modificar main sin autorización.
5. Si una demo deja de funcionar, marcarla en desarrollo/no disponible y no mantener enlaces obsoletos; restaurar solo tras pruebas.
6. Mantener enlace de retorno a lapazimpresion3d.com. El Comal seguirá como referencia restaurantera avanzada, no única demostración.

## Estado actual
Escaparate compartido con cinco perfiles y catálogos ficticios versionado en desarrollo; pruebas de lógica previas 7/7. Despliegue, navegador y URLs nuevas pendientes de verificar. No se ha cambiado el código funcional, el sitio comercial, las suscripciones ni D1 en esta coordinación. Los enlaces preexistentes en el sitio comercial se observaron en código, no se verificaron en vivo. No se registran URLs nuevas como publicadas.

## Vista individual (ampliación)
El escaparate admite ahora vista=negocio: /demostraciones/?negocio=cafe-mirador&plan=p1&vista=negocio. Es el destino relativo propuesto para enlaces directos de ejemplos desde el sitio comercial, sujeto a verificación del despliegue. No publica cambios de práctica ni acredita la funcionalidad completa del plan. El comparador sigue disponible desde esa vista.

## Nueva entrada pública
Usar ruta relativa /demostraciones/negocio/?negocio=cafe-mirador&plan=p1 para ejemplos limpios, después de verificar el despliegue. El selector /demostraciones/ es laboratorio y comparador; no confundir su interfaz con la página del cliente. El panel de práctica es accesible desde la presentación, sin opciones técnicas. No enlazar practica=1 desde el sitio comercial. Los paquetes superiores siguen sin demostrar sus módulos operativos. Ver docs/presentacion-publica-demos.md.
