-- COMMERCE_DB exclusively. Historical rows remain intact.
CREATE TABLE comercio_auditoria_detalle(
 id TEXT PRIMARY KEY, empresa TEXT NOT NULL REFERENCES empresas(id),
 actor TEXT NOT NULL REFERENCES usuarios(id), sucursal TEXT,
 accion TEXT NOT NULL CHECK(accion IN ('sucursal.guardada','rol.guardado','membresia.asignada')),
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
