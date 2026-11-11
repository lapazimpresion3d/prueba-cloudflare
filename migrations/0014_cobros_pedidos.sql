CREATE TABLE IF NOT EXISTS cobros_pedido (
  pedido_folio INTEGER PRIMARY KEY REFERENCES pedidos_demo(folio),
  importe_centavos INTEGER NOT NULL CHECK (importe_centavos > 0),
  registrado INTEGER NOT NULL,
  anulado INTEGER
);
