-- COMMERCE_DB exclusivamente.
ALTER TABLE comercio_invitaciones ADD COLUMN revocado INTEGER;
ALTER TABLE comercio_invitaciones ADD COLUMN revocado_por TEXT REFERENCES usuarios(id);
CREATE TRIGGER comercio_invitacion_revocada BEFORE UPDATE OF consumido ON comercio_invitaciones
WHEN OLD.revocado IS NOT NULL AND NEW.consumido IS NOT OLD.consumido
BEGIN SELECT RAISE(ABORT,'Invitacion revocada'); END;
CREATE TRIGGER comercio_rol_base_permiso_update BEFORE UPDATE ON rol_permisos
WHEN OLD.rol IN ('propietario','administrador','encargado','cajero') OR NEW.rol IN ('propietario','administrador','encargado','cajero')
BEGIN SELECT RAISE(ABORT,'Rol base protegido'); END;
CREATE TRIGGER comercio_rol_base_permiso_delete BEFORE DELETE ON rol_permisos
WHEN OLD.rol IN ('propietario','administrador','encargado','cajero')
BEGIN SELECT RAISE(ABORT,'Rol base protegido'); END;
CREATE TRIGGER comercio_rol_personalizado_insert BEFORE INSERT ON rol_permisos
WHEN NEW.rol NOT IN ('propietario','administrador','encargado','cajero') AND NEW.permiso NOT IN ('empresa.ver','pos.operar','caja.operar','caja.supervisar','reportes.ver','inventario.operar')
BEGIN SELECT RAISE(ABORT,'Permiso critico protegido'); END;
CREATE TRIGGER comercio_rol_personalizado_update BEFORE UPDATE ON rol_permisos
WHEN NEW.rol NOT IN ('propietario','administrador','encargado','cajero') AND NEW.permiso NOT IN ('empresa.ver','pos.operar','caja.operar','caja.supervisar','reportes.ver','inventario.operar')
BEGIN SELECT RAISE(ABORT,'Permiso critico protegido'); END;
CREATE TRIGGER comercio_ultima_sucursal BEFORE UPDATE OF activa ON sucursales
WHEN OLD.activa=1 AND NEW.activa=0 AND NOT EXISTS(SELECT 1 FROM sucursales s WHERE s.empresa=OLD.empresa AND s.id<>OLD.id AND s.activa=1)
BEGIN SELECT RAISE(ABORT,'Ultima sucursal activa'); END;
