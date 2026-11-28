-- Cut again at reactivation, including sessions obtained during suspension.
CREATE TRIGGER comercial_ciclo_corte_reactivacion AFTER INSERT ON comercial_ciclo_vida
WHEN NEW.accion='reactivar'
BEGIN
 INSERT INTO comercio_acceso_corte(empresa,usuario,desde)
 SELECT empresa,usuario,NEW.fecha FROM membresias WHERE empresa=NEW.empresa
 ON CONFLICT(empresa,usuario) DO UPDATE SET desde=MAX(desde,excluded.desde);
END;
-- Database-level structural prerequisites for any reactivation.
CREATE TRIGGER comercial_ciclo_reactivacion_guard BEFORE INSERT ON comercial_ciclo_vida
WHEN NEW.accion='reactivar' AND NOT EXISTS(
 SELECT 1 FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version
 JOIN comercial_contratos_iniciales k ON k.empresa=s.empresa JOIN comercio_altas_pendientes z ON z.id=k.alta AND z.empresa=k.empresa
 JOIN comercial_activaciones ac ON ac.empresa=s.empresa
 WHERE s.empresa=NEW.empresa AND z.estado='aceptada' AND json_array_length(ac.modulos)>0
 AND NOT EXISTS(SELECT 1 FROM json_each(ac.modulos) m WHERE NOT EXISTS(SELECT 1 FROM json_each(p.modulos) c WHERE c.value=m.value))
 AND EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=s.empresa AND m.rol='propietario' AND m.alcance='empresa' AND m.activa=1 AND u.activo=1)
 AND (SELECT count(*) FROM membresias WHERE empresa=s.empresa AND activa=1)<=p.usuarios
 AND (SELECT count(*) FROM sucursales WHERE empresa=s.empresa AND activa=1)<=p.sucursales)
BEGIN SELECT RAISE(ABORT,'Reactivacion sin requisitos'); END;
