-- COMMERCE_DB only. Navigation history, not authorization or readiness.
CREATE TABLE comercio_asistente_progreso(
 empresa TEXT NOT NULL REFERENCES comercio_perfiles_privados(empresa),
 revision INTEGER NOT NULL CHECK(revision>=1),
 esquema INTEGER NOT NULL CHECK(esquema=1),
 paso TEXT NOT NULL CHECK(paso IN ('inicio','perfil','presentacion','sucursales','personal','modulos','revision')),
 visitados TEXT NOT NULL CHECK(json_valid(visitados) AND json_type(visitados)='array' AND length(visitados)<=500),
 estado TEXT NOT NULL CHECK(estado IN ('en_curso','pausado')),
 actor TEXT NOT NULL REFERENCES usuarios(id),
 fecha INTEGER NOT NULL CHECK(fecha>=0),
 PRIMARY KEY(empresa,revision)
);
CREATE TRIGGER comercio_asistente_secuencia BEFORE INSERT ON comercio_asistente_progreso
WHEN NEW.revision<>(SELECT COALESCE(MAX(revision),0)+1 FROM comercio_asistente_progreso WHERE empresa=NEW.empresa)
OR EXISTS(SELECT 1 FROM json_each(NEW.visitados) WHERE type<>'text' OR value NOT IN ('inicio','perfil','presentacion','sucursales','personal','modulos','revision'))
OR (SELECT count(DISTINCT value) FROM json_each(NEW.visitados))<>json_array_length(NEW.visitados)
OR NOT EXISTS(SELECT 1 FROM json_each(NEW.visitados) WHERE value=NEW.paso)
OR NOT EXISTS(SELECT 1 FROM json_each(NEW.visitados) WHERE value='inicio')
BEGIN SELECT RAISE(ABORT,'Progreso invalido'); END;
CREATE TRIGGER comercio_asistente_no_update BEFORE UPDATE ON comercio_asistente_progreso BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_asistente_no_delete BEFORE DELETE ON comercio_asistente_progreso BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
