-- COMMERCE_DB only. Administrative corrections, not payment processing.
CREATE TABLE central_anulaciones_pago(
 id TEXT PRIMARY KEY, pago TEXT NOT NULL UNIQUE REFERENCES central_pagos_servicio(id),
 actor TEXT NOT NULL REFERENCES central_operadores(id), fecha INTEGER NOT NULL,
 motivo TEXT NOT NULL CHECK(motivo IN ('importe_incorrecto','concepto_incorrecto','registro_duplicado','referencia_incorrecta'))
);
CREATE TRIGGER central_anulacion_no_update BEFORE UPDATE ON central_anulaciones_pago BEGIN SELECT RAISE(ABORT,'Anulacion inmutable'); END;
CREATE TRIGGER central_anulacion_no_delete BEFORE DELETE ON central_anulaciones_pago BEGIN SELECT RAISE(ABORT,'Anulacion inmutable'); END;
CREATE TRIGGER central_anulacion_actor BEFORE INSERT ON central_anulaciones_pago
WHEN NOT EXISTS(SELECT 1 FROM central_operadores WHERE id=NEW.actor AND activo=1)
BEGIN SELECT RAISE(ABORT,'Operador inactivo'); END;
