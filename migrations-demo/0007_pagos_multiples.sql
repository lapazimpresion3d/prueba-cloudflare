-- Exclusivamente DEMO_DB. Libro de práctica separado del cobro vigente.
CREATE TABLE IF NOT EXISTS demo_planes_cobro (
 sesion_id TEXT NOT NULL,
 cuenta_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 100),
 datos_json TEXT NOT NULL CHECK(json_valid(datos_json) AND json_type(datos_json)='object'),
 PRIMARY KEY(sesion_id,cuenta_id),
 FOREIGN KEY(sesion_id,cuenta_id) REFERENCES demo_cuentas(sesion_id,cuenta_id) ON DELETE CASCADE
);
