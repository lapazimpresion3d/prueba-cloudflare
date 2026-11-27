-- COMMERCE_DB only. Immutable commercial financial journal, not a payment gateway.
CREATE TABLE comercio_movimientos_financieros(
 empresa TEXT NOT NULL, sucursal TEXT NOT NULL, id TEXT NOT NULL CHECK(length(id) BETWEEN 1 AND 80),
 actor TEXT NOT NULL REFERENCES usuarios(id), fecha INTEGER NOT NULL,
 tipo TEXT NOT NULL CHECK(tipo IN ('venta','reversion')),
 importe INTEGER NOT NULL CHECK(typeof(importe)='integer' AND importe BETWEEN 1 AND 100000000),
 metodo TEXT NOT NULL CHECK(metodo IN ('efectivo','transferencia','tarjeta_externa')),
 original TEXT,
 PRIMARY KEY(empresa,id), UNIQUE(empresa,original),
 FOREIGN KEY(empresa,sucursal) REFERENCES sucursales(empresa,id),
 FOREIGN KEY(empresa,original) REFERENCES comercio_movimientos_financieros(empresa,id),
 CHECK((tipo='venta' AND original IS NULL) OR (tipo='reversion' AND original IS NOT NULL AND original<>id))
);
CREATE INDEX comercio_movimientos_sucursal ON comercio_movimientos_financieros(empresa,sucursal,fecha,id);
CREATE TRIGGER comercio_movimiento_reversion BEFORE INSERT ON comercio_movimientos_financieros
WHEN NEW.tipo='reversion' AND NOT EXISTS(SELECT 1 FROM comercio_movimientos_financieros p WHERE p.empresa=NEW.empresa AND p.id=NEW.original AND p.sucursal=NEW.sucursal AND p.tipo='venta' AND p.importe=NEW.importe AND p.metodo=NEW.metodo)
BEGIN SELECT RAISE(ABORT,'Reversion no coincide'); END;
CREATE TRIGGER comercio_movimiento_no_update BEFORE UPDATE ON comercio_movimientos_financieros
BEGIN SELECT RAISE(ABORT,'Movimiento inmutable'); END;
CREATE TRIGGER comercio_movimiento_no_delete BEFORE DELETE ON comercio_movimientos_financieros
BEGIN SELECT RAISE(ABORT,'Movimiento inmutable'); END;
CREATE TRIGGER comercio_movimiento_auditoria AFTER INSERT ON comercio_movimientos_financieros
BEGIN INSERT INTO comercio_auditoria(empresa,actor,accion,objetivo,fecha) VALUES(NEW.empresa,NEW.actor,'finanzas.'||NEW.tipo,NEW.id,NEW.fecha); END;
