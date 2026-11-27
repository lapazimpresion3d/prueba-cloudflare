-- Solo DEMO_DB. Cierre por pagos activos; conserva originales anulados.
DROP TRIGGER IF EXISTS demo_pago_multiple_cierre;
CREATE TRIGGER IF NOT EXISTS demo_pago_multiple_cierre
BEFORE UPDATE OF cerrado ON demo_cuentas
WHEN NEW.cerrado IS NOT NULL AND OLD.cerrado IS NULL AND EXISTS (
 SELECT 1 FROM demo_planes_cobro p WHERE p.sesion_id=OLD.sesion_id AND p.cuenta_id=OLD.cuenta_id
 AND (COALESCE(json_extract(p.datos_json,'$.consumoCentavos'),-1) <>
 (SELECT COALESCE(SUM(json_extract(m.value,'$.consumoCentavos')),0) FROM json_each(p.datos_json,'$.movimientos') m WHERE NOT EXISTS (SELECT 1 FROM json_each(p.datos_json,'$.anulaciones') a WHERE json_extract(a.value,'$.movimiento')=json_extract(m.value,'$.id')))
 OR json_extract(p.datos_json,'$.consumoCentavos') <>
 (SELECT COALESCE(SUM(json_extract(o.datos_json,'$.total')),0) FROM demo_pedidos o WHERE o.sesion_id=OLD.sesion_id AND o.establecimiento_id='taqueria-el-comal' AND json_extract(o.datos_json,'$.cuenta')=OLD.cuenta_id AND o.estado<>'cancelado')
 OR EXISTS(SELECT 1 FROM demo_pedidos o WHERE o.sesion_id=OLD.sesion_id AND o.establecimiento_id='taqueria-el-comal' AND json_extract(o.datos_json,'$.cuenta')=OLD.cuenta_id AND (o.estado NOT IN ('entregado','cancelado') OR json_extract(o.datos_json,'$.cobro') IS NOT NULL))))
BEGIN SELECT RAISE(ABORT,'Cuenta multiple sin conciliar'); END;

CREATE TRIGGER IF NOT EXISTS demo_pago_multiple_anulaciones_v1 BEFORE UPDATE ON demo_planes_cobro WHEN NEW.revision<=OLD.revision BEGIN SELECT RAISE(ABORT,'Revision no creciente'); END;
