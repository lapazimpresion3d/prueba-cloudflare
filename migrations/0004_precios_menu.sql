CREATE TABLE IF NOT EXISTS precios_menu (
  producto_id TEXT PRIMARY KEY,
  precio_centavos INTEGER NOT NULL CHECK (precio_centavos >= 0),
  especial_centavos INTEGER CHECK (especial_centavos >= 0 AND especial_centavos < precio_centavos)
);
