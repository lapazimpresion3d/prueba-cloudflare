-- DEMO_DB: conservar solicitud original; las operaciones anteriores no se inventan.
ALTER TABLE demo_terminal_operaciones ADD COLUMN solicitud_json TEXT CHECK(solicitud_json IS NULL OR (json_valid(solicitud_json) AND json_type(solicitud_json)='object'));
CREATE TRIGGER demo_terminal_solicitud_inmutable BEFORE UPDATE OF solicitud_json ON demo_terminal_operaciones
WHEN NEW.solicitud_json IS NOT OLD.solicitud_json
BEGIN SELECT RAISE(ABORT,'Solicitud terminal inmutable'); END;
