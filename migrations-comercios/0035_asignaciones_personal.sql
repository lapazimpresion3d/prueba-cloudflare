-- COMMERCE_DB only. Labor assignments do not confer account permissions.
CREATE TABLE comercio_servicios_personal(
 empresa TEXT NOT NULL REFERENCES empresas(id), id TEXT NOT NULL,
 codigo TEXT NOT NULL CHECK(length(codigo) BETWEEN 1 AND 40),
 nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 1 AND 120),
 activo INTEGER NOT NULL CHECK(activo IN (0,1)), revision INTEGER NOT NULL CHECK(revision>=1),
 PRIMARY KEY(empresa,id), UNIQUE(empresa,codigo)
);
CREATE TABLE comercio_asignaciones_personal(
 empresa TEXT NOT NULL, empleado TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
 principal TEXT, sucursales TEXT NOT NULL CHECK(json_valid(sucursales) AND json_type(sucursales)='array'),
 servicios TEXT NOT NULL CHECK(json_valid(servicios) AND json_type(servicios)='array'),
 actor TEXT NOT NULL REFERENCES usuarios(id), fecha INTEGER NOT NULL,
 PRIMARY KEY(empresa,empleado,revision), FOREIGN KEY(empresa,empleado) REFERENCES comercio_empleados(empresa,id),
 FOREIGN KEY(empresa,principal) REFERENCES sucursales(empresa,id),
 CHECK((json_array_length(sucursales)=0 AND principal IS NULL) OR (json_array_length(sucursales)>0 AND principal IS NOT NULL))
);
CREATE TABLE comercio_asignaciones_acceso(
 empresa TEXT NOT NULL, usuario TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
 empleado TEXT NOT NULL, rol TEXT NOT NULL,
 sucursales TEXT NOT NULL CHECK(json_valid(sucursales) AND json_type(sucursales)='array' AND json_array_length(sucursales)>0),
 actor TEXT NOT NULL REFERENCES usuarios(id), fecha INTEGER NOT NULL,
 PRIMARY KEY(empresa,usuario,revision), FOREIGN KEY(empresa,usuario) REFERENCES membresias(empresa,usuario),
 FOREIGN KEY(empresa,empleado) REFERENCES comercio_empleados(empresa,id),
 FOREIGN KEY(empresa,rol) REFERENCES roles(empresa,id)
);
CREATE TRIGGER comercio_servicio_personal_no_delete BEFORE DELETE ON comercio_servicios_personal BEGIN SELECT RAISE(ABORT,'Servicio protegido'); END;
CREATE TRIGGER comercio_servicio_personal_revision BEFORE UPDATE ON comercio_servicios_personal WHEN NEW.empresa<>OLD.empresa OR NEW.id<>OLD.id OR NEW.revision<>OLD.revision+1 BEGIN SELECT RAISE(ABORT,'Revision invalida'); END;
CREATE TRIGGER comercio_asignacion_personal_insert BEFORE INSERT ON comercio_asignaciones_personal
WHEN NEW.revision<>(SELECT COALESCE(MAX(revision),0)+1 FROM comercio_asignaciones_personal WHERE empresa=NEW.empresa AND empleado=NEW.empleado)
OR NOT EXISTS(SELECT 1 FROM comercio_empleados WHERE empresa=NEW.empresa AND id=NEW.empleado AND (activo=1 OR json_array_length(NEW.sucursales)=0))
OR (NEW.principal IS NOT NULL AND NOT EXISTS(SELECT 1 FROM json_each(NEW.sucursales) WHERE value=NEW.principal))
OR EXISTS(SELECT 1 FROM json_each(NEW.sucursales) j WHERE NOT EXISTS(SELECT 1 FROM sucursales s WHERE s.empresa=NEW.empresa AND s.id=j.value AND s.activa=1))
OR EXISTS(SELECT 1 FROM json_each(NEW.servicios) j WHERE NOT EXISTS(SELECT 1 FROM comercio_servicios_personal s WHERE s.empresa=NEW.empresa AND s.id=j.value AND s.activo=1))
BEGIN SELECT RAISE(ABORT,'Asignacion invalida'); END;
CREATE TRIGGER comercio_asignacion_acceso_insert BEFORE INSERT ON comercio_asignaciones_acceso
WHEN NEW.revision<>(SELECT COALESCE(MAX(revision),0)+1 FROM comercio_asignaciones_acceso WHERE empresa=NEW.empresa AND usuario=NEW.usuario)
OR NOT EXISTS(SELECT 1 FROM comercio_empleados e JOIN membresias m ON m.empresa=e.empresa AND m.usuario=e.usuario JOIN usuarios u ON u.id=m.usuario WHERE e.empresa=NEW.empresa AND e.id=NEW.empleado AND e.usuario=NEW.usuario AND e.activo=1 AND m.activa=1 AND u.activo=1 AND m.rol<>'propietario')
OR NOT EXISTS(SELECT 1 FROM comercio_roles_operativos WHERE empresa=NEW.empresa AND rol=NEW.rol)
OR EXISTS(SELECT 1 FROM json_each(NEW.sucursales) j WHERE NOT EXISTS(SELECT 1 FROM sucursales s WHERE s.empresa=NEW.empresa AND s.id=j.value AND s.activa=1))
BEGIN SELECT RAISE(ABORT,'Acceso invalido'); END;
CREATE TRIGGER comercio_asignaciones_personal_no_update BEFORE UPDATE ON comercio_asignaciones_personal BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_asignaciones_personal_no_delete BEFORE DELETE ON comercio_asignaciones_personal BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_asignaciones_acceso_no_update BEFORE UPDATE ON comercio_asignaciones_acceso BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_asignaciones_acceso_no_delete BEFORE DELETE ON comercio_asignaciones_acceso BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
