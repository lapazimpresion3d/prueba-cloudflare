CREATE TABLE IF NOT EXISTS preferencias_entrega (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  reglas_json TEXT NOT NULL CHECK (json_valid(reglas_json))
);
