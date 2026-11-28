-- COMMERCE_DB only. Reuse existing branch IDs and relationships.
ALTER TABLE sucursales ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1);
ALTER TABLE sucursales ADD COLUMN contacto TEXT CHECK(contacto IS NULL OR (json_valid(contacto) AND json_type(contacto)='object' AND length(contacto)<=16000));
ALTER TABLE sucursales ADD COLUMN horario TEXT CHECK(horario IS NULL OR (json_valid(horario) AND json_type(horario)='object' AND length(horario)<=60000));
CREATE TABLE comercio_sucursal_principal(
 empresa TEXT PRIMARY KEY REFERENCES empresas(id),
 sucursal TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
 FOREIGN KEY(empresa,sucursal) REFERENCES sucursales(empresa,id)
);
INSERT INTO comercio_sucursal_principal(empresa,sucursal) SELECT empresa,MIN(id) FROM sucursales WHERE activa=1 GROUP BY empresa;
CREATE TRIGGER comercio_sucursal_principal_alta AFTER INSERT ON sucursales WHEN NEW.activa=1 AND NOT EXISTS(SELECT 1 FROM comercio_sucursal_principal WHERE empresa=NEW.empresa)
BEGIN INSERT INTO comercio_sucursal_principal(empresa,sucursal) VALUES(NEW.empresa,NEW.id); END;
CREATE TRIGGER comercio_sucursal_principal_insert BEFORE INSERT ON comercio_sucursal_principal WHEN NOT EXISTS(SELECT 1 FROM sucursales WHERE empresa=NEW.empresa AND id=NEW.sucursal AND activa=1)
BEGIN SELECT RAISE(ABORT,'Sucursal principal inactiva'); END;
CREATE TRIGGER comercio_sucursal_principal_update BEFORE UPDATE ON comercio_sucursal_principal WHEN NEW.empresa<>OLD.empresa OR NEW.revision<>OLD.revision+1 OR NOT EXISTS(SELECT 1 FROM sucursales WHERE empresa=NEW.empresa AND id=NEW.sucursal AND activa=1)
BEGIN SELECT RAISE(ABORT,'Sucursal principal invalida'); END;
CREATE TRIGGER comercio_sucursal_principal_no_delete BEFORE DELETE ON comercio_sucursal_principal BEGIN SELECT RAISE(ABORT,'Sucursal principal protegida'); END;
CREATE TRIGGER comercio_sucursal_principal_activa BEFORE UPDATE OF activa ON sucursales WHEN NEW.activa=0 AND EXISTS(SELECT 1 FROM comercio_sucursal_principal WHERE empresa=OLD.empresa AND sucursal=OLD.id)
BEGIN SELECT RAISE(ABORT,'Cambiar sucursal principal primero'); END;
CREATE TRIGGER comercio_sucursal_identidad BEFORE UPDATE ON sucursales WHEN NEW.empresa<>OLD.empresa OR NEW.id<>OLD.id BEGIN SELECT RAISE(ABORT,'Sucursal protegida'); END;
CREATE TRIGGER comercio_sucursal_no_delete BEFORE DELETE ON sucursales BEGIN SELECT RAISE(ABORT,'Sucursal protegida'); END;
-- Legacy updates still increase revision so modern CAS cannot overwrite them.
CREATE TRIGGER comercio_sucursal_revision AFTER UPDATE OF nombre,activa,contacto,horario ON sucursales WHEN NEW.revision=OLD.revision
BEGIN UPDATE sucursales SET revision=revision+1 WHERE empresa=NEW.empresa AND id=NEW.id; END;
CREATE TRIGGER comercio_sucursal_revision_guard BEFORE UPDATE OF revision ON sucursales WHEN NEW.revision<>OLD.revision+1 BEGIN SELECT RAISE(ABORT,'Revision sucursal invalida'); END;
