CREATE TABLE IF NOT EXISTS preferencias_horario (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  turnos_json TEXT NOT NULL CHECK (json_valid(turnos_json) AND json_type(turnos_json) = 'array')
);
