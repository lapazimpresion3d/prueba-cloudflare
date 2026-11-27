-- Exclusivamente DEMO_DB. Terminales ficticias, aisladas por sesión.
CREATE TABLE IF NOT EXISTS demo_terminales (
 sesion_id TEXT NOT NULL REFERENCES demo_sesiones(id) ON DELETE CASCADE,
 terminal_id TEXT NOT NULL CHECK(length(terminal_id) BETWEEN 1 AND 80),
 nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 1 AND 80),
 proveedor TEXT NOT NULL CHECK(proveedor IN ('point_simulado','generico_simulado')),
 conectada INTEGER NOT NULL DEFAULT 1 CHECK(conectada IN (0,1)),
 PRIMARY KEY(sesion_id,terminal_id)
);
CREATE TABLE IF NOT EXISTS demo_terminal_operaciones (
 sesion_id TEXT NOT NULL, operacion_id TEXT NOT NULL CHECK(length(operacion_id) BETWEEN 1 AND 80),
 terminal_id TEXT NOT NULL, cuenta_id TEXT NOT NULL,
 importe_centavos INTEGER NOT NULL CHECK(importe_centavos BETWEEN 1 AND 100000000),
 revision_cuenta INTEGER NOT NULL CHECK(revision_cuenta BETWEEN 0 AND 100),
 estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aprobado','rechazado','cancelado')),
 creado INTEGER NOT NULL, resuelto INTEGER,
 PRIMARY KEY(sesion_id,operacion_id),
 FOREIGN KEY(sesion_id,terminal_id) REFERENCES demo_terminales(sesion_id,terminal_id) ON DELETE CASCADE,
 FOREIGN KEY(sesion_id,cuenta_id) REFERENCES demo_cuentas(sesion_id,cuenta_id) ON DELETE CASCADE,
 CHECK((estado='pendiente' AND resuelto IS NULL) OR (estado<>'pendiente' AND resuelto IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS demo_terminal_ocupada ON demo_terminal_operaciones(sesion_id,terminal_id) WHERE estado='pendiente';
CREATE UNIQUE INDEX IF NOT EXISTS demo_terminal_cuenta_pendiente ON demo_terminal_operaciones(sesion_id,cuenta_id) WHERE estado='pendiente';
CREATE TRIGGER IF NOT EXISTS demo_terminal_estado_final BEFORE UPDATE ON demo_terminal_operaciones
WHEN OLD.estado<>'pendiente' OR NEW.estado='pendiente' OR NEW.operacion_id<>OLD.operacion_id OR NEW.sesion_id<>OLD.sesion_id OR NEW.terminal_id<>OLD.terminal_id OR NEW.cuenta_id<>OLD.cuenta_id OR NEW.importe_centavos<>OLD.importe_centavos OR NEW.revision_cuenta<>OLD.revision_cuenta OR NEW.creado<>OLD.creado
BEGIN SELECT RAISE(ABORT,'Operacion terminal inmutable'); END;
CREATE TRIGGER IF NOT EXISTS demo_terminal_conectada BEFORE INSERT ON demo_terminal_operaciones
WHEN NEW.estado<>'pendiente' OR NOT EXISTS(SELECT 1 FROM demo_terminales t WHERE t.sesion_id=NEW.sesion_id AND t.terminal_id=NEW.terminal_id AND t.conectada=1)
BEGIN SELECT RAISE(ABORT,'Terminal no disponible'); END;
