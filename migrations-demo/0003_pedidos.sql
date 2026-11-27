-- Exclusivamente en lapaz-demos-desarrollo (DEMO_DB).
CREATE TABLE IF NOT EXISTS demo_pedidos (
  sesion_id TEXT NOT NULL REFERENCES demo_sesiones(id) ON DELETE CASCADE,
  establecimiento_id TEXT NOT NULL CHECK(length(establecimiento_id) BETWEEN 1 AND 80),
  solicitud_id TEXT NOT NULL CHECK(length(solicitud_id)=36),
  huella TEXT NOT NULL CHECK(length(huella)=64),
  estado TEXT NOT NULL CHECK(estado IN ('recibido','preparando','listo','entregado','cancelado')),
  creado INTEGER NOT NULL,
  datos_json TEXT NOT NULL CHECK(json_valid(datos_json) AND json_type(datos_json)='object'),
  PRIMARY KEY(sesion_id, establecimiento_id, solicitud_id)
);
