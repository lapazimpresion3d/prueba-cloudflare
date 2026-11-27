-- COMMERCE_DB. Preserve existing restrictions and expand allowed operational actions.
DROP TRIGGER membresia_denegacion_no_propietario;
DROP TRIGGER membresia_denegacion_no_update;
ALTER TABLE membresia_permisos_denegados RENAME TO membresia_permisos_denegados_anterior;
CREATE TABLE membresia_permisos_denegados(
 empresa TEXT NOT NULL, usuario TEXT NOT NULL,
 permiso TEXT NOT NULL CHECK(permiso IN ('pos.operar','caja.operar','caja.supervisar','reportes.ver','inventario.operar','pos.consultar','pos.crear','pos.cancelar','caja.consultar','caja.abrir','caja.cerrar','caja.ajustar','inventario.consultar','inventario.modificar','reportes.exportar')),
 PRIMARY KEY(empresa,usuario,permiso),
 FOREIGN KEY(empresa,usuario) REFERENCES membresias(empresa,usuario) ON DELETE CASCADE
);
INSERT INTO membresia_permisos_denegados SELECT * FROM membresia_permisos_denegados_anterior;
DROP TABLE membresia_permisos_denegados_anterior;
CREATE TRIGGER membresia_denegacion_no_propietario BEFORE INSERT ON membresia_permisos_denegados
WHEN NOT EXISTS(SELECT 1 FROM membresias WHERE empresa=NEW.empresa AND usuario=NEW.usuario AND rol<>'propietario')
BEGIN SELECT RAISE(ABORT,'Membresia protegida'); END;
CREATE TRIGGER membresia_denegacion_no_update BEFORE UPDATE ON membresia_permisos_denegados
BEGIN SELECT RAISE(ABORT,'Reemplazar restriccion'); END;
CREATE TRIGGER limite_contratado_membresias_insert BEFORE INSERT ON membresias
WHEN NEW.activa=1 
AND EXISTS(SELECT 1 FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE s.empresa=NEW.empresa AND (SELECT count(*) FROM membresias WHERE empresa=NEW.empresa AND activa=1)>=p.usuarios)
BEGIN SELECT RAISE(ABORT,'Limite contractual usuarios'); END;
CREATE TRIGGER limite_contratado_membresias_update BEFORE UPDATE ON membresias
WHEN NEW.activa=1 AND (OLD.activa=0 OR OLD.empresa<>NEW.empresa)
AND EXISTS(SELECT 1 FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE s.empresa=NEW.empresa AND (SELECT count(*) FROM membresias WHERE empresa=NEW.empresa AND activa=1)>=p.usuarios)
BEGIN SELECT RAISE(ABORT,'Limite contractual usuarios'); END;
CREATE TRIGGER limite_contratado_sucursales_insert BEFORE INSERT ON sucursales
WHEN NEW.activa=1 
AND EXISTS(SELECT 1 FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE s.empresa=NEW.empresa AND (SELECT count(*) FROM sucursales WHERE empresa=NEW.empresa AND activa=1)>=p.sucursales)
BEGIN SELECT RAISE(ABORT,'Limite contractual sucursales'); END;
CREATE TRIGGER limite_contratado_sucursales_update BEFORE UPDATE ON sucursales
WHEN NEW.activa=1 AND (OLD.activa=0 OR OLD.empresa<>NEW.empresa)
AND EXISTS(SELECT 1 FROM comercial_suscripciones s JOIN comercial_planes p ON p.id=s.plan AND p.version=s.version WHERE s.empresa=NEW.empresa AND (SELECT count(*) FROM sucursales WHERE empresa=NEW.empresa AND activa=1)>=p.sucursales)
BEGIN SELECT RAISE(ABORT,'Limite contractual sucursales'); END;
