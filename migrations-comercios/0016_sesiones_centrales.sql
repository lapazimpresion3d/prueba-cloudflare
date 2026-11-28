-- COMMERCE_DB exclusively. Separate privileged sessions, no plaintext credentials.
CREATE TABLE central_sesiones(
 hash TEXT PRIMARY KEY CHECK(length(hash)=64),
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 creado INTEGER NOT NULL, expira INTEGER NOT NULL, ultima INTEGER NOT NULL,
 revocado INTEGER,
 CHECK(expira>creado AND ultima>=creado)
);
CREATE INDEX central_sesiones_operador ON central_sesiones(operador,expira);
CREATE TRIGGER central_sesion_revocacion_inmutable BEFORE UPDATE OF revocado ON central_sesiones
WHEN OLD.revocado IS NOT NULL AND NEW.revocado IS NOT OLD.revocado
BEGIN SELECT RAISE(ABORT,'Sesion central revocada'); END;
CREATE TRIGGER central_operador_revocar AFTER UPDATE OF activo ON central_operadores
WHEN OLD.activo=1 AND NEW.activo=0
BEGIN UPDATE central_sesiones SET revocado=MAX(ultima,unixepoch()*1000) WHERE operador=NEW.id AND revocado IS NULL; END;
