-- Ejecutar exclusivamente en una D1 NUEVA dedicada a las demostraciones.
-- No incluir en migrations/ ni aplicar a el-comal-disponibilidad.
CREATE TABLE IF NOT EXISTS demo_sesiones (
  id TEXT PRIMARY KEY CHECK(length(id)=64),
  expira INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_demo_sesiones_expira ON demo_sesiones(expira);
CREATE TABLE IF NOT EXISTS demo_limites (
  origen TEXT PRIMARY KEY CHECK(length(origen)=64),
  usos INTEGER NOT NULL CHECK(usos BETWEEN 1 AND 5),
  vence INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_demo_limites_vence ON demo_limites(vence);
CREATE TABLE IF NOT EXISTS demo_catalogos (
  sesion_id TEXT NOT NULL REFERENCES demo_sesiones(id) ON DELETE CASCADE,
  establecimiento_id TEXT NOT NULL CHECK(length(establecimiento_id) BETWEEN 1 AND 80),
  revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 1000000),
  datos_json TEXT NOT NULL CHECK(json_valid(datos_json) AND json_type(datos_json)='array'),
  PRIMARY KEY(sesion_id, establecimiento_id)
);

-- Identificador de esquema requerido antes de permitir cualquier escritura de práctica.
CREATE TABLE IF NOT EXISTS demo_identidad (
  clave TEXT PRIMARY KEY CHECK(clave='lapaz-demo-practica'),
  version INTEGER NOT NULL CHECK(version=1)
);
INSERT INTO demo_identidad (clave,version) VALUES ('lapaz-demo-practica',1) ON CONFLICT(clave) DO NOTHING;
