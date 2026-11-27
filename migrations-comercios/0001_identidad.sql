-- SOLO COMMERCE_DB independiente; nunca DB, DEMO_DB ni PROVIDER_DB.
CREATE TABLE comercio_identidad(clave TEXT PRIMARY KEY CHECK(clave='lapaz-comercios-v1'));
INSERT INTO comercio_identidad VALUES('lapaz-comercios-v1');
CREATE TABLE empresas(id TEXT PRIMARY KEY, nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 1 AND 120), activa INTEGER NOT NULL DEFAULT 1 CHECK(activa IN (0,1)));
CREATE TABLE sucursales(empresa TEXT NOT NULL REFERENCES empresas(id), id TEXT NOT NULL, nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 1 AND 120), activa INTEGER NOT NULL DEFAULT 1 CHECK(activa IN (0,1)), PRIMARY KEY(empresa,id));
CREATE TABLE usuarios(id TEXT PRIMARY KEY, emisor TEXT NOT NULL, sujeto TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0,1)), UNIQUE(emisor,sujeto));
CREATE TABLE roles(empresa TEXT NOT NULL REFERENCES empresas(id), id TEXT NOT NULL, nombre TEXT NOT NULL, PRIMARY KEY(empresa,id));
CREATE TABLE rol_permisos(empresa TEXT NOT NULL, rol TEXT NOT NULL, permiso TEXT NOT NULL CHECK(permiso IN ('empresa.ver','empresa.administrar','sucursales.administrar','usuarios.administrar','proveedores.ver','proveedores.administrar','pos.operar','caja.operar','caja.supervisar','reportes.ver','inventario.operar')), PRIMARY KEY(empresa,rol,permiso), FOREIGN KEY(empresa,rol) REFERENCES roles(empresa,id) ON DELETE CASCADE);
CREATE TABLE membresias(empresa TEXT NOT NULL REFERENCES empresas(id), usuario TEXT NOT NULL REFERENCES usuarios(id), rol TEXT NOT NULL, activa INTEGER NOT NULL DEFAULT 1 CHECK(activa IN (0,1)), alcance TEXT NOT NULL CHECK(alcance IN ('empresa','sucursales')), PRIMARY KEY(empresa,usuario), FOREIGN KEY(empresa,rol) REFERENCES roles(empresa,id));
CREATE TABLE membresia_sucursales(empresa TEXT NOT NULL, usuario TEXT NOT NULL, sucursal TEXT NOT NULL, PRIMARY KEY(empresa,usuario,sucursal), FOREIGN KEY(empresa,usuario) REFERENCES membresias(empresa,usuario) ON DELETE CASCADE, FOREIGN KEY(empresa,sucursal) REFERENCES sucursales(empresa,id));
CREATE TABLE comercio_auditoria(id INTEGER PRIMARY KEY AUTOINCREMENT, empresa TEXT NOT NULL REFERENCES empresas(id), actor TEXT NOT NULL REFERENCES usuarios(id), accion TEXT NOT NULL, objetivo TEXT NOT NULL, fecha INTEGER NOT NULL);
CREATE INDEX comercio_auditoria_empresa ON comercio_auditoria(empresa,fecha);
