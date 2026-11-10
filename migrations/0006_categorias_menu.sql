CREATE TABLE IF NOT EXISTS preferencias_categorias (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  categorias_json TEXT NOT NULL CHECK (json_valid(categorias_json) AND json_type(categorias_json) = 'array')
);
