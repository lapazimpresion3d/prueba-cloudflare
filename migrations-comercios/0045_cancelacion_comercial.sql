-- Terminal cancellation for verified contracts. Preserve business data and shared identities.
CREATE TRIGGER comercial_ciclo_corte_cancelacion AFTER INSERT ON comercial_ciclo_vida
WHEN NEW.accion='cancelar'
BEGIN
 INSERT INTO comercio_acceso_corte(empresa,usuario,desde)
 SELECT empresa,usuario,NEW.fecha FROM membresias WHERE empresa=NEW.empresa
 ON CONFLICT(empresa,usuario) DO UPDATE SET desde=MAX(desde,excluded.desde);
 UPDATE comercio_invitaciones_empleado SET cancelado=NEW.fecha
 WHERE empresa=NEW.empresa AND consumido IS NULL AND cancelado IS NULL;
END;
CREATE TRIGGER comercial_cancelacion_terminal BEFORE UPDATE ON comercial_suscripciones
WHEN OLD.estado='cancelada' AND EXISTS(SELECT 1 FROM comercial_contratos_iniciales k WHERE k.empresa=OLD.empresa)
BEGIN SELECT RAISE(ABORT,'Contrato cancelado protegido'); END;
CREATE TRIGGER comercial_cancelacion_no_activacion BEFORE UPDATE ON comercial_activaciones
WHEN EXISTS(SELECT 1 FROM comercial_suscripciones s WHERE s.empresa=OLD.empresa AND s.estado='cancelada')
BEGIN SELECT RAISE(ABORT,'Contrato cancelado protegido'); END;
