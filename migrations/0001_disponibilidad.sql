CREATE TABLE IF NOT EXISTS disponibilidad_producto (
  producto_id TEXT PRIMARY KEY,
  disponible INTEGER NOT NULL CHECK (disponible IN (0, 1))
);
