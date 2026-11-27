# v0.11.4 — Preparación de ejemplos de Presencia digital
## Entregables
Galería comercial independiente: /demostraciones/ejemplos/. Cinco ejemplos P1 limpios, con ilustraciones y recursos propios ya existentes. No muestra selector de planes, herramientas técnicas ni configuración de servidor. Las páginas individuales enlazan a esta galería, no al comparador. El laboratorio conserva sus rutas y herramientas. Se distingue arriba la copia editada y se ofrece volver a la original. Se corrigen accesos rápidos Café artesanal → Bebidas y Cuidado personal → Productos, y se ocultan accesos sin categoría en catálogos personalizados. Ajustes CSS de lectura y controles móviles pendientes de revisión visual real.
## Contrato de enlaces para el proyecto comercial (no publicado)
| Giro | Ruta relativa |
| --- | --- |
| Cafetería | /demostraciones/negocio/?negocio=cafe-mirador&plan=p1 |
| Barbería | /demostraciones/negocio/?negocio=barberia-elite&plan=p1 |
| Tienda | /demostraciones/negocio/?negocio=mundo-mascotas&plan=p1 |
| Restaurante | /demostraciones/negocio/?negocio=taqueria-el-comal&plan=p1 |
| Taller | /demostraciones/negocio/?negocio=auto-servicio-bahia&plan=p1 |
El destino estable aún no está configurado; demos.lapazimpresion3d.com es propuesta, no dirección activa verificada. No enlazar vistas practica=1, laboratorio o herramientas de verificación. No publicar hasta validar URL y recibir aprobación explícita. Mantener El Comal original.
## Aceptación en navegador
1. Abrir /demostraciones/verificacion/ y confirmar revisión v0.11.4, indicadores P1/P2 y contexto. Un indicador correcto solo verifica configuración, no escrituras.
2. Abrir galería y los cinco enlaces P1. Revisar escritorio y teléfono: portada, catálogo, precios, búsqueda, especialidades, navegación, retorno comercial y ausencia de pedidos/citas en P1.
3. Abrir panel en cada negocio; marcar un elemento agotado, modificar nombre o precio y probar logo/portada/foto de producto. Guardar catálogo/identidad en servidor y recuperar explícitamente. Ver catálogo editado y comprobar cambios; página original debe seguir intacta. Restaurar copia de práctica si se desea.
4. En otra sesión aislada comprobar que no aparecen cambios privados. No utilizar datos reales.
5. Registrar fecha, URL, revisión y resultado por giro. Solo entonces decidir publicación P1. P2 necesita además pruebas de pedidos y citas entre pestañas, disponibilidad y seguimiento. P3/P4 no listos.
## Evidencia
Tres pruebas de presentación con aserciones equivalentes ejecutadas sobre fuentes GitHub; cinco tarjetas, cinco URLs diferentes, cinco páginas P1 y quince accesos rápidos correctos en DOM simulado. Sintaxis de módulos comprobada. No se ha ejecutado navegador real ni la suite integrada completa. El Preview nominal no fue accesible desde la herramienta web. No se han tocado D1, main, DNS ni sitio comercial.

## v0.11.6 — Galería con selector de paquetes
La galería ahora admite los cuatro planes; sin parámetro o con plan inválido comienza en P1. Cambiar plan actualiza las cinco URLs y capacidades por giro, distinguiendo funciones disponibles de pendientes. Explorar otras demostraciones conserva el plan de la página anterior. Para publicar únicamente P1, los enlaces directos P1 siguen siendo válidos; la galería permite explorar versiones no terminadas, no acredita disponibilidad comercial. Se comprobaron 20/20 enlaces y 20/20 listas de capacidades, cuatro selecciones y recuperación del plan en DOM simulado. Pendiente navegador y despliegue. No se modifica D1 ni main.
