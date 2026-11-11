ALTER TABLE cobros_pedido
ADD COLUMN metodo TEXT CHECK (metodo IN ('efectivo', 'tarjeta', 'transferencia', 'otro'));
