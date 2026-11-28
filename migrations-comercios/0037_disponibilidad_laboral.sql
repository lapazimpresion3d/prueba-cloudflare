-- COMMERCE_DB only; availability configuration, not booking locks.
CREATE TABLE comercio_turnos_laborales(
 empresa TEXT NOT NULL, empleado TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
 turnos TEXT NOT NULL CHECK(json_valid(turnos) AND json_type(turnos)='object' AND length(turnos)<=120000),
 actor TEXT NOT NULL REFERENCES usuarios(id), fecha INTEGER NOT NULL,
 PRIMARY KEY(empresa,empleado,revision), FOREIGN KEY(empresa,empleado) REFERENCES comercio_empleados(empresa,id)
);
CREATE TRIGGER comercio_turnos_secuencia BEFORE INSERT ON comercio_turnos_laborales WHEN NEW.revision<>(SELECT COALESCE(MAX(revision),0)+1 FROM comercio_turnos_laborales WHERE empresa=NEW.empresa AND empleado=NEW.empleado)
BEGIN SELECT RAISE(ABORT,'Revision invalida'); END;
CREATE TRIGGER comercio_turnos_no_update BEFORE UPDATE ON comercio_turnos_laborales BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_turnos_no_delete BEFORE DELETE ON comercio_turnos_laborales BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TABLE comercio_recursos_laborales(
 empresa TEXT NOT NULL, id TEXT NOT NULL, sucursal TEXT NOT NULL,
 codigo TEXT NOT NULL CHECK(length(codigo) BETWEEN 1 AND 40), nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 1 AND 120),
 tipo TEXT NOT NULL CHECK(tipo IN ('sillon','estacion','consultorio','espacio','equipo','otro')),
 activo INTEGER NOT NULL CHECK(activo IN (0,1)), revision INTEGER NOT NULL CHECK(revision>=1),
 horario TEXT CHECK(horario IS NULL OR (json_valid(horario) AND json_type(horario)='object' AND length(horario)<=60000)),
 servicios TEXT NOT NULL CHECK(json_valid(servicios) AND json_type(servicios)='array'),
 PRIMARY KEY(empresa,id), UNIQUE(empresa,sucursal,codigo), FOREIGN KEY(empresa,sucursal) REFERENCES sucursales(empresa,id)
);
CREATE TRIGGER comercio_recursos_no_delete BEFORE DELETE ON comercio_recursos_laborales BEGIN SELECT RAISE(ABORT,'Recurso protegido'); END;
CREATE TRIGGER comercio_recursos_revision BEFORE UPDATE ON comercio_recursos_laborales WHEN NEW.empresa<>OLD.empresa OR NEW.id<>OLD.id OR NEW.sucursal<>OLD.sucursal OR NEW.revision<>OLD.revision+1 BEGIN SELECT RAISE(ABORT,'Revision invalida'); END;
