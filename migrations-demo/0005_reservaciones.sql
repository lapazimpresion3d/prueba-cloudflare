CREATE TABLE IF NOT EXISTS demo_reservaciones (
 sesion_id TEXT NOT NULL REFERENCES demo_sesiones(id) ON DELETE CASCADE,
 solicitud_id TEXT NOT NULL CHECK(length(solicitud_id)=36),
 huella TEXT NOT NULL CHECK(length(huella)=64),
 mesa TEXT NOT NULL CHECK(mesa IN ('1','2','3','4','5')),
 fecha TEXT NOT NULL CHECK(length(fecha)=10),
 inicio INTEGER NOT NULL CHECK(inicio>=720 AND inicio<=1230),
 fin INTEGER NOT NULL CHECK(fin=inicio+90),
 estado TEXT NOT NULL CHECK(estado IN ('pendiente','confirmada','atendida','cancelada','no_asistio')),
 datos_json TEXT NOT NULL CHECK(json_valid(datos_json) AND json_type(datos_json)='object'),
 PRIMARY KEY(sesion_id,solicitud_id)
);
CREATE INDEX IF NOT EXISTS demo_reservaciones_intervalo ON demo_reservaciones(sesion_id,mesa,fecha,inicio,fin);
