-- COMMERCE_DB only. Existing explicitly provisioned central operators retain administrator role.
ALTER TABLE central_operadores ADD COLUMN rol TEXT NOT NULL DEFAULT 'administrador' CHECK(rol IN ('administrador','comercial','implementacion','consulta'));
CREATE TRIGGER central_ultimo_admin_update BEFORE UPDATE OF activo,rol ON central_operadores
WHEN OLD.activo=1 AND OLD.rol='administrador' AND (NEW.activo<>1 OR NEW.rol<>'administrador') AND NOT EXISTS(SELECT 1 FROM central_operadores WHERE id<>OLD.id AND activo=1 AND rol='administrador')
BEGIN SELECT RAISE(ABORT,'Ultimo administrador'); END;
CREATE TRIGGER central_ultimo_admin_delete BEFORE DELETE ON central_operadores
WHEN OLD.activo=1 AND OLD.rol='administrador' AND NOT EXISTS(SELECT 1 FROM central_operadores WHERE id<>OLD.id AND activo=1 AND rol='administrador')
BEGIN SELECT RAISE(ABORT,'Ultimo administrador'); END;
CREATE TRIGGER central_rol_revocar AFTER UPDATE OF rol ON central_operadores WHEN OLD.rol<>NEW.rol
BEGIN UPDATE central_sesiones SET revocado=MAX(ultima,unixepoch()*1000) WHERE operador=NEW.id AND revocado IS NULL; END;
