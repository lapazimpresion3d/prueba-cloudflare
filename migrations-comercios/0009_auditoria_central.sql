-- COMMERCE_DB only. Extend existing central audit; old entries retain NULL snapshots.
ALTER TABLE central_auditoria ADD COLUMN anterior TEXT CHECK(anterior IS NULL OR json_valid(anterior));
ALTER TABLE central_auditoria ADD COLUMN posterior TEXT CHECK(posterior IS NULL OR json_valid(posterior));
CREATE TRIGGER central_auditoria_no_update BEFORE UPDATE ON central_auditoria BEGIN SELECT RAISE(ABORT,'Historial central protegido'); END;
CREATE TRIGGER central_auditoria_no_delete BEFORE DELETE ON central_auditoria BEGIN SELECT RAISE(ABORT,'Historial central protegido'); END;
CREATE TABLE central_implementacion_historial(empresa TEXT NOT NULL REFERENCES empresas(id),revision INTEGER NOT NULL,estado TEXT NOT NULL,PRIMARY KEY(empresa,revision));
INSERT INTO central_implementacion_historial SELECT empresa,revision,estado FROM central_implementaciones;
CREATE TRIGGER central_implementacion_historial_alta AFTER INSERT ON central_implementaciones BEGIN INSERT INTO central_implementacion_historial VALUES(NEW.empresa,NEW.revision,NEW.estado); END;
CREATE TRIGGER central_implementacion_historial_cambio AFTER UPDATE ON central_implementaciones BEGIN INSERT INTO central_implementacion_historial VALUES(NEW.empresa,NEW.revision,NEW.estado); END;
CREATE TRIGGER central_implementacion_historial_no_update BEFORE UPDATE ON central_implementacion_historial BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER central_implementacion_historial_no_delete BEFORE DELETE ON central_implementacion_historial BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
