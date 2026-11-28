-- COMMERCE_DB only. Append-only operational policy versions, independent of legacy grants.
CREATE TABLE comercio_roles_operativos(
 empresa TEXT NOT NULL, rol TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
 nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 1 AND 120),
 permisos TEXT NOT NULL CHECK(json_valid(permisos) AND json_type(permisos)='array' AND length(permisos)<=12000),
 actor TEXT NOT NULL REFERENCES usuarios(id), fecha INTEGER NOT NULL CHECK(fecha>=0),
 PRIMARY KEY(empresa,rol,revision), FOREIGN KEY(empresa,rol) REFERENCES roles(empresa,id),
 CHECK(substr(rol,1,10)='operativo-')
);
CREATE TABLE comercio_restricciones_operativas(
 empresa TEXT NOT NULL, usuario TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
 denegados TEXT NOT NULL CHECK(json_valid(denegados) AND json_type(denegados)='array' AND length(denegados)<=12000),
 actor TEXT NOT NULL REFERENCES usuarios(id), fecha INTEGER NOT NULL CHECK(fecha>=0),
 PRIMARY KEY(empresa,usuario,revision), FOREIGN KEY(empresa,usuario) REFERENCES membresias(empresa,usuario)
);
CREATE TRIGGER comercio_rol_operativo_secuencia BEFORE INSERT ON comercio_roles_operativos WHEN NEW.revision<>(SELECT COALESCE(MAX(revision),0)+1 FROM comercio_roles_operativos WHERE empresa=NEW.empresa AND rol=NEW.rol)
BEGIN SELECT RAISE(ABORT,'Revision de rol invalida'); END;
CREATE TRIGGER comercio_restriccion_operativa_secuencia BEFORE INSERT ON comercio_restricciones_operativas WHEN NEW.revision<>(SELECT COALESCE(MAX(revision),0)+1 FROM comercio_restricciones_operativas WHERE empresa=NEW.empresa AND usuario=NEW.usuario) OR NOT EXISTS(SELECT 1 FROM membresias WHERE empresa=NEW.empresa AND usuario=NEW.usuario AND rol<>'propietario' AND activa=1)
BEGIN SELECT RAISE(ABORT,'Restriccion protegida'); END;
CREATE TRIGGER comercio_rol_operativo_no_update BEFORE UPDATE ON comercio_roles_operativos BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_rol_operativo_no_delete BEFORE DELETE ON comercio_roles_operativos BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_restriccion_operativa_no_update BEFORE UPDATE ON comercio_restricciones_operativas BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_restriccion_operativa_no_delete BEFORE DELETE ON comercio_restricciones_operativas BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
