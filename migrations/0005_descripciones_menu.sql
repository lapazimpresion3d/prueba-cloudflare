CREATE TABLE IF NOT EXISTS descripciones_menu (
  producto_id TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL CHECK (length(trim(descripcion)) BETWEEN 1 AND 240)
);
