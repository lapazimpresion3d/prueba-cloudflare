-- Historial de cambios financieros, sin alterar los cobros existentes.
-- La instantánea inicial no reconstruye movimientos previos que ya fueron sobrescritos.
CREATE TABLE IF NOT EXISTS historial_cobros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_folio INTEGER NOT NULL REFERENCES pedidos_demo(folio),
  accion TEXT NOT NULL CHECK (accion IN ('instantanea','registro','anulacion','reactivacion','metodo','actualizacion')),
  evento INTEGER NOT NULL,
  importe_anterior INTEGER,
  metodo_anterior TEXT,
  registrado_anterior INTEGER,
  anulado_anterior INTEGER,
  importe_nuevo INTEGER NOT NULL,
  metodo_nuevo TEXT,
  registrado_nuevo INTEGER NOT NULL,
  anulado_nuevo INTEGER
);
CREATE INDEX IF NOT EXISTS idx_historial_cobros_folio ON historial_cobros(pedido_folio, id);

INSERT INTO historial_cobros (pedido_folio, accion, evento, importe_nuevo, metodo_nuevo, registrado_nuevo, anulado_nuevo)
SELECT pedido_folio, 'instantanea', CAST(strftime('%s','now') AS INTEGER)*1000, importe_centavos, metodo, registrado, anulado
FROM cobros_pedido AS c
WHERE NOT EXISTS (SELECT 1 FROM historial_cobros AS h WHERE h.pedido_folio = c.pedido_folio);

CREATE TRIGGER IF NOT EXISTS historial_cobros_insert
AFTER INSERT ON cobros_pedido
BEGIN
  INSERT INTO historial_cobros (pedido_folio, accion, evento, importe_nuevo, metodo_nuevo, registrado_nuevo, anulado_nuevo)
  VALUES (NEW.pedido_folio, 'registro', NEW.registrado, NEW.importe_centavos, NEW.metodo, NEW.registrado, NEW.anulado);
END;

CREATE TRIGGER IF NOT EXISTS historial_cobros_update
AFTER UPDATE ON cobros_pedido
WHEN OLD.importe_centavos IS NOT NEW.importe_centavos OR OLD.metodo IS NOT NEW.metodo
  OR OLD.registrado IS NOT NEW.registrado OR OLD.anulado IS NOT NEW.anulado
BEGIN
  INSERT INTO historial_cobros (
    pedido_folio, accion, evento, importe_anterior, metodo_anterior, registrado_anterior, anulado_anterior,
    importe_nuevo, metodo_nuevo, registrado_nuevo, anulado_nuevo
  ) VALUES (
    NEW.pedido_folio,
    CASE WHEN OLD.anulado IS NULL AND NEW.anulado IS NOT NULL THEN 'anulacion'
         WHEN OLD.anulado IS NOT NULL AND NEW.anulado IS NULL THEN 'reactivacion'
         WHEN OLD.metodo IS NOT NEW.metodo AND OLD.importe_centavos IS NEW.importe_centavos
              AND OLD.registrado IS NEW.registrado AND OLD.anulado IS NEW.anulado THEN 'metodo'
         ELSE 'actualizacion' END,
    CASE WHEN OLD.anulado IS NULL AND NEW.anulado IS NOT NULL THEN NEW.anulado
         WHEN OLD.anulado IS NOT NULL AND NEW.anulado IS NULL THEN NEW.registrado
         ELSE CAST(strftime('%s','now') AS INTEGER)*1000 END,
    OLD.importe_centavos, OLD.metodo, OLD.registrado, OLD.anulado,
    NEW.importe_centavos, NEW.metodo, NEW.registrado, NEW.anulado
  );
END;
