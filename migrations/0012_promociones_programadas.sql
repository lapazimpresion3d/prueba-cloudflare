CREATE TABLE IF NOT EXISTS precios_programados (
  producto_id TEXT PRIMARY KEY NOT NULL,
  precio_centavos INTEGER NOT NULL CHECK (precio_centavos >= 0 AND precio_centavos <= 100000000),
  especial_centavos INTEGER CHECK (especial_centavos >= 0 AND especial_centavos < precio_centavos),
  fecha_desde TEXT,
  fecha_hasta TEXT,
  CHECK ((fecha_desde IS NULL AND fecha_hasta IS NULL) OR
         (fecha_desde IS NOT NULL AND fecha_hasta IS NOT NULL AND fecha_desde <= fecha_hasta AND especial_centavos IS NOT NULL))
);
