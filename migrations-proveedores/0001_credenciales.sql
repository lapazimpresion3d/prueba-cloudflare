-- SOLO PROVIDER_DB independiente. Nunca DB ni DEMO_DB.
CREATE TABLE proveedor_identidad(clave TEXT PRIMARY KEY CHECK(clave='lapaz-proveedores-v1'));
INSERT INTO proveedor_identidad VALUES('lapaz-proveedores-v1');
CREATE TABLE proveedor_oauth_estado(
 hash TEXT PRIMARY KEY CHECK(length(hash)=64), comercio TEXT NOT NULL, entorno TEXT NOT NULL CHECK(entorno IN ('prueba','produccion')), actor TEXT NOT NULL,
 expira INTEGER NOT NULL, cifrado TEXT NOT NULL CHECK(json_valid(cifrado)), consumido INTEGER
);
CREATE INDEX proveedor_oauth_expira ON proveedor_oauth_estado(expira);
CREATE TABLE proveedor_credenciales(
 comercio TEXT NOT NULL, entorno TEXT NOT NULL CHECK(entorno IN ('prueba','produccion')),
 vendedor TEXT, expira INTEGER, cifrado TEXT CHECK(cifrado IS NULL OR json_valid(cifrado)),
 estado TEXT NOT NULL CHECK(estado IN ('sin_vincular','activo','ocupado','incierto','desvinculado')),
 reserva TEXT, reservado INTEGER, revision INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(comercio,entorno),
 CHECK((estado='ocupado' AND reserva IS NOT NULL AND reservado IS NOT NULL) OR (estado<>'ocupado' AND reserva IS NULL AND reservado IS NULL)),
 CHECK(estado<>'activo' OR (vendedor IS NOT NULL AND expira IS NOT NULL AND cifrado IS NOT NULL))
);
CREATE TABLE proveedor_eventos(
 id INTEGER PRIMARY KEY AUTOINCREMENT, comercio TEXT NOT NULL, entorno TEXT NOT NULL, fecha INTEGER NOT NULL,
 evento TEXT NOT NULL, revision INTEGER NOT NULL
);
CREATE TRIGGER proveedor_evento_estado AFTER UPDATE ON proveedor_credenciales
WHEN OLD.estado<>NEW.estado
BEGIN INSERT INTO proveedor_eventos(comercio,entorno,fecha,evento,revision) VALUES(NEW.comercio,NEW.entorno,unixepoch()*1000,NEW.estado,NEW.revision); END;
