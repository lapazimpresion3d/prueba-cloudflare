-- COMMERCE_DB exclusively. No plaintext tokens. Existing sessions remain valid unless revoked.
ALTER TABLE comercio_sesiones ADD COLUMN identificador TEXT;
CREATE UNIQUE INDEX comercio_sesiones_identificador ON comercio_sesiones(identificador);
CREATE TRIGGER comercio_usuario_revocar_sesiones AFTER UPDATE OF activo ON usuarios
WHEN OLD.activo=1 AND NEW.activo=0
BEGIN UPDATE comercio_sesiones SET revocado=MAX(ultima,unixepoch()*1000) WHERE usuario=NEW.id AND revocado IS NULL; END;
CREATE TRIGGER comercio_sesion_no_reactivar BEFORE UPDATE OF revocado ON comercio_sesiones
WHEN OLD.revocado IS NOT NULL AND NEW.revocado IS NOT OLD.revocado
BEGIN SELECT RAISE(ABORT,'Sesion revocada'); END;
CREATE INDEX comercio_sesiones_activas ON comercio_sesiones(usuario,revocado,expira,ultima);
