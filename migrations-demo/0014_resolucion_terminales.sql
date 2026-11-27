-- DEMO_DB exclusivamente. Resolución de aprobaciones ficticias irrecuperables.
CREATE TABLE demo_terminal_resoluciones (
 sesion_id TEXT NOT NULL, operacion_id TEXT NOT NULL, fecha INTEGER NOT NULL,
 motivo TEXT NOT NULL CHECK(motivo='Solicitud histórica sin datos'),
 PRIMARY KEY(sesion_id,operacion_id),
 FOREIGN KEY(sesion_id,operacion_id) REFERENCES demo_terminal_operaciones(sesion_id,operacion_id) ON DELETE CASCADE
);
CREATE TRIGGER demo_terminal_resolucion_validar BEFORE INSERT ON demo_terminal_resoluciones
WHEN NOT EXISTS(SELECT 1 FROM demo_terminal_operaciones o JOIN demo_terminales t ON t.sesion_id=o.sesion_id AND t.terminal_id=o.terminal_id
 WHERE o.sesion_id=NEW.sesion_id AND o.operacion_id=NEW.operacion_id AND o.estado='aprobado' AND t.proveedor='point_simulado'
 AND o.solicitud_json IS NULL
 AND NOT EXISTS(SELECT 1 FROM demo_planes_cobro p,json_each(p.datos_json,'$.movimientos') m WHERE p.sesion_id=o.sesion_id AND p.cuenta_id=o.cuenta_id AND json_extract(m.value,'$.terminal.id')=o.operacion_id))
BEGIN SELECT RAISE(ABORT,'Resolucion ficticia no permitida'); END;
DROP VIEW demo_terminal_bloqueos;
CREATE VIEW demo_terminal_bloqueos AS
SELECT o.sesion_id,o.cuenta_id,o.operacion_id,o.terminal_id,o.estado FROM demo_terminal_operaciones o
WHERE o.estado='pendiente' OR (o.estado='aprobado'
 AND NOT EXISTS(SELECT 1 FROM demo_terminal_resoluciones r WHERE r.sesion_id=o.sesion_id AND r.operacion_id=o.operacion_id)
 AND NOT EXISTS(SELECT 1 FROM demo_planes_cobro p,json_each(p.datos_json,'$.movimientos') m WHERE p.sesion_id=o.sesion_id AND p.cuenta_id=o.cuenta_id AND json_extract(m.value,'$.terminal.id')=o.operacion_id AND json_extract(m.value,'$.terminal.importeCentavos')=o.importe_centavos));
CREATE TRIGGER demo_terminal_resolucion_no_abono_insert BEFORE INSERT ON demo_planes_cobro
WHEN EXISTS(SELECT 1 FROM demo_terminal_resoluciones r JOIN json_each(NEW.datos_json,'$.movimientos') m WHERE r.sesion_id=NEW.sesion_id AND r.operacion_id=json_extract(m.value,'$.terminal.id'))
BEGIN SELECT RAISE(ABORT,'Resolucion ficticia no permite abono'); END;
CREATE TRIGGER demo_terminal_resolucion_no_abono_update BEFORE UPDATE ON demo_planes_cobro
WHEN EXISTS(SELECT 1 FROM demo_terminal_resoluciones r JOIN json_each(NEW.datos_json,'$.movimientos') m WHERE r.sesion_id=NEW.sesion_id AND r.operacion_id=json_extract(m.value,'$.terminal.id'))
BEGIN SELECT RAISE(ABORT,'Resolucion ficticia no permite abono'); END;
