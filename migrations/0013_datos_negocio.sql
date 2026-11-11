CREATE TABLE IF NOT EXISTS preferencias_negocio (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  datos_json TEXT NOT NULL CHECK (json_valid(datos_json))
);
