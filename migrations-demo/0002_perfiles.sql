-- Solo en lapaz-demos-desarrollo (DEMO_DB). No aplicar a la base operativa.
CREATE TABLE IF NOT EXISTS demo_perfiles (
  sesion_id TEXT NOT NULL REFERENCES demo_sesiones(id) ON DELETE CASCADE,
  establecimiento_id TEXT NOT NULL CHECK(length(establecimiento_id) BETWEEN 1 AND 80),
  revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 1000000),
  datos_json TEXT NOT NULL CHECK(json_valid(datos_json) AND json_type(datos_json)='object'),
  PRIMARY KEY(sesion_id, establecimiento_id)
);
