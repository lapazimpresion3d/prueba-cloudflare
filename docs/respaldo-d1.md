# Procedimiento de respaldo y restauración de D1

## Estado
Procedimiento documentado, no ejecutado sobre Cloudflare. No confundir el respaldo de código GitHub con los datos D1. No utilizar la base de producción para pruebas.

## 1. Identificar el entorno
En Cloudflare, abrir el Worker de desarrollo y comprobar el binding DB, nombre e identificador de la base efectiva. Verificar que no coincide con una base de producción. wrangler.json utiliza configuración previews, por lo que no se debe asumir que el nombre de la base en el código identifica el destino remoto correcto. Registrar la fecha, commit y migraciones aplicadas.

## 2. Exportar y proteger
Con Wrangler autenticado y el destino de desarrollo comprobado, desde una terminal local:
    npx wrangler d1 export NOMBRE_D1_DESARROLLO_VERIFICADO --remote --output=./respaldo-desarrollo.sql
Sustituir el marcador por el nombre real; si Wrangler necesita configuración adicional, configurar explícitamente la base y verificar su identificador antes de seguir.
Guardar el archivo fuera del repositorio y cifrado, con permisos limitados. No compartir direcciones, datos personales, tokens o claves. Conservar fecha, tamaño, hash SHA-256 y registro del destino.

## 3. Restauración de prueba
Crear una D1 nueva y vacía, inequívocamente separada de desarrollo y producción. Comprobar el identificador.
    npx wrangler d1 execute NOMBRE_D1_RESTAURACION_VERIFICADO --remote --file=./respaldo-desarrollo.sql
Si existen problemas con objetos SQL o límites de importación, seguir las instrucciones de exportación/importación oficiales; no reintentar en la base original.
Validar tablas, conteos de pedidos/cobros, integridad referencial, índices y triggers. No copiar datos personales a una demo pública. Conectar solamente un entorno de prueba aislado y comprobar flujos. Registrar resultado. Mantener el archivo hasta confirmar recuperación.

## 4. Migración 0018
Después de respaldo y restauración verificados, confirmar que 0001–0017 están aplicadas. Usar el mecanismo habitual de migraciones del proyecto sobre D1 de desarrollo, evitando registrar dos veces la misma migración. Aplicar 0018, comprobar tabla historial_cobros y triggers historial_cobros_insert / historial_cobros_update. No aplicar en producción sin autorización.

## 5. Incidente
Detener escrituras si existe pérdida o corrupción, identificar alcance, registrar estado y conservar una exportación de evidencia. Evaluar restaurar a una base aparte antes de cualquier restauración sobre el origen. Time Travel es complementario al respaldo independiente; una restauración en sitio puede revertir cambios recientes. Nunca restaurar la base activa sin autorización y plan de recuperación.

Referencias oficiales:
- https://developers.cloudflare.com/d1/best-practices/import-export-data/
- https://developers.cloudflare.com/d1/wrangler-commands/
- https://developers.cloudflare.com/d1/reference/time-travel/
