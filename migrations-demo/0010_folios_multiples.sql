-- DEMO_DB únicamente. Folios activos únicos entre libros de la misma sesión.
CREATE TRIGGER IF NOT EXISTS demo_folio_multiple_insert
BEFORE INSERT ON demo_planes_cobro
WHEN EXISTS (
 SELECT 1 FROM json_each(NEW.datos_json,'$.movimientos') m
 JOIN demo_planes_cobro p ON p.sesion_id=NEW.sesion_id AND p.cuenta_id<>NEW.cuenta_id
 JOIN json_each(p.datos_json,'$.movimientos') o
 WHERE json_extract(m.value,'$.referencia')<>'' AND json_extract(m.value,'$.referencia')=json_extract(o.value,'$.referencia')
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.datos_json,'$.anulaciones') a WHERE json_extract(a.value,'$.movimiento')=json_extract(m.value,'$.id'))
 AND NOT EXISTS(SELECT 1 FROM json_each(p.datos_json,'$.anulaciones') a WHERE json_extract(a.value,'$.movimiento')=json_extract(o.value,'$.id'))
)
BEGIN SELECT RAISE(ABORT,'Folio multiple repetido'); END;
CREATE TRIGGER IF NOT EXISTS demo_folio_multiple_update
BEFORE UPDATE OF datos_json ON demo_planes_cobro
WHEN EXISTS (
 SELECT 1 FROM json_each(NEW.datos_json,'$.movimientos') m
 JOIN demo_planes_cobro p ON p.sesion_id=NEW.sesion_id AND p.cuenta_id<>NEW.cuenta_id
 JOIN json_each(p.datos_json,'$.movimientos') o
 WHERE json_extract(m.value,'$.referencia')<>'' AND json_extract(m.value,'$.referencia')=json_extract(o.value,'$.referencia')
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.datos_json,'$.anulaciones') a WHERE json_extract(a.value,'$.movimiento')=json_extract(m.value,'$.id'))
 AND NOT EXISTS(SELECT 1 FROM json_each(p.datos_json,'$.anulaciones') a WHERE json_extract(a.value,'$.movimiento')=json_extract(o.value,'$.id'))
)
BEGIN SELECT RAISE(ABORT,'Folio multiple repetido'); END;
