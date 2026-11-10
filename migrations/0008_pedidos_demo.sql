CREATE TABLE IF NOT EXISTS pedidos_demo (
  folio INTEGER PRIMARY KEY AUTOINCREMENT,
  seguimiento_hash TEXT NOT NULL UNIQUE,
  origen_hash TEXT NOT NULL,
  creado INTEGER NOT NULL,
  actualizado INTEGER NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN (
    'recibido', 'confirmado', 'preparacion', 'listo', 'en_reparto', 'entregado', 'cancelado'
  )),
  detalle_json TEXT NOT NULL CHECK (json_valid(detalle_json)),
  total_centavos INTEGER NOT NULL CHECK (total_centavos >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_demo_origen ON pedidos_demo (origen_hash, creado);
CREATE INDEX IF NOT EXISTS idx_pedidos_demo_estado ON pedidos_demo (estado, folio);
