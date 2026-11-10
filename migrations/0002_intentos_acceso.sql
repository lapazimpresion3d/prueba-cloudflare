CREATE TABLE IF NOT EXISTS intentos_acceso (
  origen TEXT PRIMARY KEY,
  fallos INTEGER NOT NULL,
  vence INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intentos_acceso_vence ON intentos_acceso (vence);
