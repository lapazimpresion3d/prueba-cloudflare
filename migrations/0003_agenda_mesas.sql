CREATE TABLE IF NOT EXISTS agenda_mesas (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,
  inicio INTEGER NOT NULL CHECK (inicio >= 0 AND inicio < 1440),
  fin INTEGER NOT NULL CHECK (fin > inicio AND fin <= 1440),
  mesa TEXT NOT NULL,
  personas INTEGER NOT NULL CHECK (personas > 0)
);

CREATE INDEX IF NOT EXISTS idx_agenda_mesas_fecha_mesa ON agenda_mesas (fecha, mesa);
