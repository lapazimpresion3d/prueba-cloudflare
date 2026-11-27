-- Exclusivamente DEMO_DB (lapaz-demos-desarrollo).
CREATE TABLE IF NOT EXISTS demo_citas (
 sesion_id TEXT NOT NULL REFERENCES demo_sesiones(id) ON DELETE CASCADE,
 establecimiento_id TEXT NOT NULL,
 solicitud_id TEXT NOT NULL CHECK(length(solicitud_id)=36),
 huella TEXT NOT NULL CHECK(length(huella)=64),
 recurso TEXT NOT NULL,
 fecha TEXT NOT NULL CHECK(length(fecha)=10),
 inicio INTEGER NOT NULL CHECK(inicio>=0 AND inicio<1440),
 fin INTEGER NOT NULL CHECK(fin>inicio AND fin<=1440),
 estado TEXT NOT NULL CHECK(estado IN ('pendiente','confirmada','atendida','no_asistio','cancelada')),
 datos_json TEXT NOT NULL CHECK(json_valid(datos_json) AND json_type(datos_json)='object'),
 PRIMARY KEY(sesion_id,establecimiento_id,solicitud_id)
);
CREATE INDEX IF NOT EXISTS demo_citas_intervalo ON demo_citas(sesion_id,establecimiento_id,recurso,fecha,inicio,fin);
