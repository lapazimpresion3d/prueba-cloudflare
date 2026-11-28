-- Scoped cut, no global session revocation. Same transaction as the lifecycle transition.
CREATE TRIGGER comercial_ciclo_corte_suspension AFTER INSERT ON comercial_ciclo_vida
WHEN NEW.accion='suspender'
BEGIN
 INSERT INTO comercio_acceso_corte(empresa,usuario,desde)
 SELECT empresa,usuario,NEW.fecha FROM membresias WHERE empresa=NEW.empresa
 ON CONFLICT(empresa,usuario) DO UPDATE SET desde=MAX(desde,excluded.desde);
END;
