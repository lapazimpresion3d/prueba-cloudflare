-- Solo DEMO_DB. Una aprobación sin asiento sigue bloqueando la cuenta.
CREATE VIEW demo_terminal_bloqueos AS
SELECT o.sesion_id,o.cuenta_id,o.operacion_id,o.terminal_id,o.estado
FROM demo_terminal_operaciones o
WHERE o.estado='pendiente' OR (o.estado='aprobado' AND NOT EXISTS(
 SELECT 1 FROM demo_planes_cobro p,json_each(p.datos_json,'$.movimientos') m
 WHERE p.sesion_id=o.sesion_id AND p.cuenta_id=o.cuenta_id
 AND json_extract(m.value,'$.terminal.id')=o.operacion_id
 AND json_extract(m.value,'$.terminal.importeCentavos')=o.importe_centavos));
CREATE TRIGGER demo_terminal_bloqueo_solicitud BEFORE INSERT ON demo_terminal_operaciones
WHEN EXISTS(SELECT 1 FROM demo_terminal_bloqueos b WHERE b.sesion_id=NEW.sesion_id AND b.cuenta_id=NEW.cuenta_id)
 OR EXISTS(SELECT 1 FROM demo_terminal_bloqueos b WHERE b.sesion_id=NEW.sesion_id AND b.terminal_id=NEW.terminal_id)
 OR NEW.solicitud_json IS NULL
 OR NOT EXISTS(SELECT 1 FROM demo_terminales t WHERE t.sesion_id=NEW.sesion_id AND t.terminal_id=NEW.terminal_id AND t.proveedor='point_simulado' AND t.conectada=1)
 OR NOT EXISTS(SELECT 1 FROM demo_cuentas c WHERE c.sesion_id=NEW.sesion_id AND c.cuenta_id=NEW.cuenta_id AND c.cerrado IS NULL)
 OR NEW.revision_cuenta<>COALESCE((SELECT revision FROM demo_planes_cobro WHERE sesion_id=NEW.sesion_id AND cuenta_id=NEW.cuenta_id),0)
 OR EXISTS(SELECT 1 FROM demo_pedidos p WHERE p.sesion_id=NEW.sesion_id AND p.establecimiento_id='taqueria-el-comal' AND json_extract(p.datos_json,'$.cuenta')=NEW.cuenta_id AND (p.estado NOT IN ('entregado','cancelado') OR json_extract(p.datos_json,'$.cobro') IS NOT NULL))
BEGIN SELECT RAISE(ABORT,'Bloqueo financiero terminal'); END;
CREATE TRIGGER demo_terminal_bloqueo_comanda_insert BEFORE INSERT ON demo_pedidos
WHEN NEW.establecimiento_id='taqueria-el-comal' AND EXISTS(SELECT 1 FROM demo_terminal_bloqueos b WHERE b.sesion_id=NEW.sesion_id AND b.cuenta_id=json_extract(NEW.datos_json,'$.cuenta'))
BEGIN SELECT RAISE(ABORT,'Bloqueo financiero terminal'); END;
CREATE TRIGGER demo_terminal_bloqueo_comanda_update BEFORE UPDATE ON demo_pedidos
WHEN OLD.establecimiento_id='taqueria-el-comal' AND EXISTS(SELECT 1 FROM demo_terminal_bloqueos b WHERE b.sesion_id=OLD.sesion_id AND b.cuenta_id=json_extract(OLD.datos_json,'$.cuenta'))
BEGIN SELECT RAISE(ABORT,'Bloqueo financiero terminal'); END;
CREATE TRIGGER demo_terminal_bloqueo_cierre BEFORE UPDATE OF cerrado ON demo_cuentas
WHEN NEW.cerrado IS NOT NULL AND OLD.cerrado IS NULL AND EXISTS(SELECT 1 FROM demo_terminal_bloqueos b WHERE b.sesion_id=OLD.sesion_id AND b.cuenta_id=OLD.cuenta_id)
BEGIN SELECT RAISE(ABORT,'Bloqueo financiero terminal'); END;
CREATE TRIGGER demo_terminal_bloqueo_libro_insert BEFORE INSERT ON demo_planes_cobro
WHEN EXISTS(SELECT 1 FROM demo_terminal_bloqueos b WHERE b.sesion_id=NEW.sesion_id AND b.cuenta_id=NEW.cuenta_id
 AND (b.estado='pendiente' OR NOT EXISTS(SELECT 1 FROM json_each(NEW.datos_json,'$.movimientos') m JOIN demo_terminal_operaciones o ON o.sesion_id=b.sesion_id AND o.operacion_id=b.operacion_id
 WHERE json_extract(m.value,'$.terminal.id')=b.operacion_id AND json_extract(m.value,'$.terminal.importeCentavos')=o.importe_centavos AND NEW.revision=o.revision_cuenta+1)))
BEGIN SELECT RAISE(ABORT,'Bloqueo financiero terminal'); END;
CREATE TRIGGER demo_terminal_bloqueo_libro_update BEFORE UPDATE ON demo_planes_cobro
WHEN EXISTS(SELECT 1 FROM demo_terminal_bloqueos b WHERE b.sesion_id=NEW.sesion_id AND b.cuenta_id=NEW.cuenta_id
 AND (b.estado='pendiente' OR NOT EXISTS(SELECT 1 FROM json_each(NEW.datos_json,'$.movimientos') m JOIN demo_terminal_operaciones o ON o.sesion_id=b.sesion_id AND o.operacion_id=b.operacion_id
 WHERE json_extract(m.value,'$.terminal.id')=b.operacion_id AND json_extract(m.value,'$.terminal.importeCentavos')=o.importe_centavos AND NEW.revision=o.revision_cuenta+1)))
BEGIN SELECT RAISE(ABORT,'Bloqueo financiero terminal'); END;
CREATE TABLE demo_terminal_incidencias(
 sesion_id TEXT NOT NULL, operacion_id TEXT NOT NULL, fecha INTEGER NOT NULL, codigo TEXT NOT NULL,
 PRIMARY KEY(sesion_id,operacion_id,codigo),
 FOREIGN KEY(sesion_id,operacion_id) REFERENCES demo_terminal_operaciones(sesion_id,operacion_id) ON DELETE CASCADE
);
