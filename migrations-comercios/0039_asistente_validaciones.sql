-- COMMERCE_DB only. Immutable review evidence, not approval or delivery.
CREATE TABLE comercio_asistente_validaciones(
 empresa TEXT NOT NULL REFERENCES comercio_perfiles_privados(empresa),
 revision INTEGER NOT NULL CHECK(revision>=1),
 huella TEXT NOT NULL CHECK(length(huella)=64),
 resultado TEXT NOT NULL CHECK(json_valid(resultado) AND json_type(resultado)='object' AND length(resultado)<=64000),
 actor TEXT NOT NULL REFERENCES usuarios(id),
 fecha INTEGER NOT NULL CHECK(fecha>=0),
 PRIMARY KEY(empresa,revision)
);
CREATE TRIGGER comercio_validacion_secuencia BEFORE INSERT ON comercio_asistente_validaciones
WHEN NEW.revision<>(SELECT COALESCE(MAX(revision),0)+1 FROM comercio_asistente_validaciones WHERE empresa=NEW.empresa)
BEGIN SELECT RAISE(ABORT,'Revision invalida'); END;
CREATE TRIGGER comercio_validacion_no_update BEFORE UPDATE ON comercio_asistente_validaciones BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_validacion_no_delete BEFORE DELETE ON comercio_asistente_validaciones BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
