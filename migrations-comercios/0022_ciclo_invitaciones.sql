-- COMMERCE_DB only. Atomic lifecycle guards and audit.
CREATE INDEX comercio_altas_dedup ON comercio_altas_pendientes(emisor,sujeto,lower(trim(nombre)),giro,estado,expira);
CREATE INDEX comercio_oidc_invitacion ON comercio_oidc_solicitudes(invitacion_hash);
-- Preserve metadata of old invitations, not their secret or digest.
CREATE TABLE comercio_invitaciones_historial(
 id TEXT PRIMARY KEY,
 alta TEXT NOT NULL REFERENCES comercio_altas_prospecto(alta),
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 creado INTEGER NOT NULL,
 expira INTEGER NOT NULL,
 finalizado INTEGER NOT NULL,
 motivo TEXT NOT NULL CHECK(motivo IN ('renovada','cancelada'))
);
CREATE TRIGGER comercio_invitaciones_historial_no_update BEFORE UPDATE ON comercio_invitaciones_historial BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_invitaciones_historial_no_delete BEFORE DELETE ON comercio_invitaciones_historial BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_invitacion_rotacion AFTER UPDATE OF hash ON comercio_invitaciones_propietario
WHEN OLD.hash<>NEW.hash
BEGIN
 INSERT INTO comercio_invitaciones_historial VALUES(OLD.id,OLD.alta,OLD.operador,OLD.creado,OLD.expira,NEW.creado,'renovada');
 DELETE FROM comercio_oidc_solicitudes WHERE invitacion_hash=OLD.hash;
 INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha) VALUES(NEW.operador,NULL,'alta.invitacion_renovada',NEW.id,NEW.creado);
END;
ALTER TABLE comercio_altas_pendientes ADD COLUMN cancelado_fecha INTEGER;
CREATE TRIGGER comercio_alta_cancelar AFTER UPDATE OF estado ON comercio_altas_pendientes
WHEN OLD.estado='pendiente' AND NEW.estado='cancelada' AND NEW.cancelado_fecha IS NOT NULL
BEGIN
 INSERT INTO comercio_invitaciones_historial SELECT id,alta,operador,creado,expira,NEW.cancelado_fecha,'cancelada' FROM comercio_invitaciones_propietario WHERE alta=NEW.id AND consumido IS NULL AND cancelado IS NULL;
 DELETE FROM comercio_oidc_solicitudes WHERE invitacion_hash IN (SELECT hash FROM comercio_invitaciones_propietario WHERE alta=NEW.id);
 UPDATE comercio_invitaciones_propietario SET cancelado=NEW.cancelado_fecha WHERE alta=NEW.id AND consumido IS NULL AND cancelado IS NULL;
 INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha) VALUES(NEW.operador,NULL,'alta.cancelada',NEW.id,NEW.cancelado_fecha);
END;
