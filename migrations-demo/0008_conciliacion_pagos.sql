-- Solo DEMO_DB, después de 0007. El primer abono congela las comandas.
CREATE TRIGGER IF NOT EXISTS demo_pago_multiple_no_nueva_comanda
BEFORE INSERT ON demo_pedidos
WHEN NEW.establecimiento_id='taqueria-el-comal' AND EXISTS (
 SELECT 1 FROM demo_planes_cobro p WHERE p.sesion_id=NEW.sesion_id
 AND p.cuenta_id=json_extract(NEW.datos_json,'$.cuenta'))
BEGIN SELECT RAISE(ABORT,'Cuenta en cobro multiple'); END;

CREATE TRIGGER IF NOT EXISTS demo_pago_multiple_no_editar_comanda
BEFORE UPDATE ON demo_pedidos
WHEN OLD.establecimiento_id='taqueria-el-comal' AND EXISTS (
 SELECT 1 FROM demo_planes_cobro p WHERE p.sesion_id=OLD.sesion_id
 AND p.cuenta_id=json_extract(OLD.datos_json,'$.cuenta'))
BEGIN SELECT RAISE(ABORT,'Cuenta en cobro multiple'); END;

CREATE TRIGGER IF NOT EXISTS demo_pago_multiple_cierre
BEFORE UPDATE OF cerrado ON demo_cuentas
WHEN NEW.cerrado IS NOT NULL AND OLD.cerrado IS NULL AND EXISTS (
 SELECT 1 FROM demo_planes_cobro p WHERE p.sesion_id=OLD.sesion_id AND p.cuenta_id=OLD.cuenta_id
 AND (COALESCE(json_extract(p.datos_json,'$.consumoCentavos'),-1) <>
 (SELECT COALESCE(SUM(json_extract(m.value,'$.consumoCentavos')),0) FROM json_each(p.datos_json,'$.movimientos') m)
 OR json_extract(p.datos_json,'$.consumoCentavos') <>
 (SELECT COALESCE(SUM(json_extract(o.datos_json,'$.total')),0) FROM demo_pedidos o WHERE o.sesion_id=OLD.sesion_id AND o.establecimiento_id='taqueria-el-comal' AND json_extract(o.datos_json,'$.cuenta')=OLD.cuenta_id AND o.estado<>'cancelado')
 OR EXISTS(SELECT 1 FROM demo_pedidos o WHERE o.sesion_id=OLD.sesion_id AND o.establecimiento_id='taqueria-el-comal' AND json_extract(o.datos_json,'$.cuenta')=OLD.cuenta_id AND (o.estado NOT IN ('entregado','cancelado') OR json_extract(o.datos_json,'$.cobro') IS NOT NULL))))
BEGIN SELECT RAISE(ABORT,'Cuenta multiple sin conciliar'); END;
