-- Exclusivamente COMMERCE_DB. No contiene contraseñas ni tokens de identidad externos.
CREATE TABLE comercio_sesiones(
 hash TEXT PRIMARY KEY CHECK(length(hash)=64),
 usuario TEXT NOT NULL REFERENCES usuarios(id),
 creado INTEGER NOT NULL, expira INTEGER NOT NULL, ultima INTEGER NOT NULL,
 revocado INTEGER,
 CHECK(expira>creado AND ultima>=creado)
);
CREATE INDEX comercio_sesiones_usuario ON comercio_sesiones(usuario);
CREATE INDEX comercio_sesiones_expira ON comercio_sesiones(expira);
CREATE TABLE comercio_sesion_eventos(
 id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT NOT NULL REFERENCES usuarios(id),
 fecha INTEGER NOT NULL, evento TEXT NOT NULL CHECK(evento IN ('inicio','revocacion'))
);
CREATE TRIGGER comercio_sesion_inicio AFTER INSERT ON comercio_sesiones
BEGIN INSERT INTO comercio_sesion_eventos(usuario,fecha,evento) VALUES(NEW.usuario,NEW.creado,'inicio'); END;
CREATE TRIGGER comercio_sesion_revocacion AFTER UPDATE OF revocado ON comercio_sesiones
WHEN OLD.revocado IS NULL AND NEW.revocado IS NOT NULL
BEGIN INSERT INTO comercio_sesion_eventos(usuario,fecha,evento) VALUES(NEW.usuario,NEW.revocado,'revocacion'); END;
