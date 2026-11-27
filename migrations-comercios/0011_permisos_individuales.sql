-- COMMERCE_DB. Extend the action constraint without discarding historical rows.
DROP TRIGGER comercio_auditoria_detalle_no_delete;
DROP TRIGGER comercio_auditoria_detalle_no_update;
DROP INDEX comercio_auditoria_detalle_empresa;
ALTER TABLE comercio_auditoria_detalle RENAME TO comercio_auditoria_detalle_anterior;
-- COMMERCE_DB exclusively. Historical rows remain intact.
CREATE TABLE comercio_auditoria_detalle(
 id TEXT PRIMARY KEY, empresa TEXT NOT NULL REFERENCES empresas(id),
 actor TEXT NOT NULL REFERENCES usuarios(id), sucursal TEXT,
 accion TEXT NOT NULL CHECK(accion IN ('sucursal.guardada','rol.guardado','membresia.asignada','membresia.alta','membresia.desactivada','membresia.permisos')),
 objetivo TEXT NOT NULL, fecha INTEGER NOT NULL,
 anterior TEXT CHECK(anterior IS NULL OR json_valid(anterior)),
 posterior TEXT CHECK(posterior IS NULL OR json_valid(posterior)),
 FOREIGN KEY(empresa,sucursal) REFERENCES sucursales(empresa,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX comercio_auditoria_detalle_empresa ON comercio_auditoria_detalle(empresa,fecha DESC,id);
CREATE TRIGGER comercio_auditoria_detalle_no_delete BEFORE DELETE ON comercio_auditoria_detalle
BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_auditoria_detalle_no_update BEFORE UPDATE ON comercio_auditoria_detalle
WHEN OLD.posterior IS NOT NULL OR NEW.posterior IS NULL OR NEW.id IS NOT OLD.id OR NEW.empresa IS NOT OLD.empresa OR NEW.actor IS NOT OLD.actor OR NEW.sucursal IS NOT OLD.sucursal OR NEW.accion IS NOT OLD.accion OR NEW.objetivo IS NOT OLD.objetivo OR NEW.fecha IS NOT OLD.fecha OR NEW.anterior IS NOT OLD.anterior
BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;

INSERT INTO comercio_auditoria_detalle(id,empresa,actor,sucursal,accion,objetivo,fecha,anterior,posterior)
SELECT id,empresa,actor,sucursal,accion,objetivo,fecha,anterior,posterior FROM comercio_auditoria_detalle_anterior;
DROP TABLE comercio_auditoria_detalle_anterior;

-- Individual restrictions only. No grants, no changes to administrative permissions.
CREATE TABLE membresia_permisos_denegados(
 empresa TEXT NOT NULL, usuario TEXT NOT NULL,
 permiso TEXT NOT NULL CHECK(permiso IN ('pos.operar','caja.operar','caja.supervisar','reportes.ver','inventario.operar')),
 PRIMARY KEY(empresa,usuario,permiso),
 FOREIGN KEY(empresa,usuario) REFERENCES membresias(empresa,usuario) ON DELETE CASCADE
);
CREATE TRIGGER membresia_denegacion_no_propietario BEFORE INSERT ON membresia_permisos_denegados
WHEN NOT EXISTS(SELECT 1 FROM membresias WHERE empresa=NEW.empresa AND usuario=NEW.usuario AND rol<>'propietario')
BEGIN SELECT RAISE(ABORT,'Membresia protegida'); END;
CREATE TRIGGER membresia_denegacion_no_update BEFORE UPDATE ON membresia_permisos_denegados
BEGIN SELECT RAISE(ABORT,'Reemplazar restriccion'); END;
