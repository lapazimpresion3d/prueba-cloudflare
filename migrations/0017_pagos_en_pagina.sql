CREATE TABLE IF NOT EXISTS preferencias_pagos (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  instrucciones_transferencia TEXT NOT NULL
);

ALTER TABLE pedidos_demo ADD COLUMN transferencia_no_localizada INTEGER;
