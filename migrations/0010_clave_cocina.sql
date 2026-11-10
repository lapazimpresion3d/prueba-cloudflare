CREATE TABLE IF NOT EXISTS clave_cocina (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sal TEXT NOT NULL,
  verificador TEXT NOT NULL
);
