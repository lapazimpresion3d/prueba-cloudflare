CREATE TABLE IF NOT EXISTS catalogo_productos (
  producto_id TEXT PRIMARY KEY NOT NULL,
  categoria_id TEXT NOT NULL,
  datos_json TEXT NOT NULL CHECK (json_valid(datos_json)),
  archivado INTEGER NOT NULL DEFAULT 0 CHECK (archivado IN (0, 1)),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);
