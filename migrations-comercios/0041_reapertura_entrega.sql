-- Reopen obsolete approvals without deleting history. Central correction invalidates the approval.
DROP TRIGGER central_entrega_secuencia;
CREATE TRIGGER central_entrega_secuencia BEFORE INSERT ON central_entrega_revisiones
WHEN NEW.revision<>(SELECT COALESCE(MAX(revision),0)+1 FROM central_entrega_revisiones WHERE empresa=NEW.empresa)
OR (NEW.estado='solicitada' AND COALESCE((SELECT estado FROM central_entrega_revisiones WHERE empresa=NEW.empresa ORDER BY revision DESC LIMIT 1),'correccion') NOT IN ('correccion','rechazada'))
OR (NEW.estado IN ('correccion','rechazada','aprobada') AND NOT EXISTS(SELECT 1 FROM central_entrega_revisiones WHERE empresa=NEW.empresa AND revision=NEW.revision-1 AND (estado='solicitada' OR (estado='aprobada' AND NEW.estado='correccion')) AND validacion=NEW.validacion))
OR (NEW.estado='entregada' AND NOT EXISTS(SELECT 1 FROM central_entrega_revisiones WHERE empresa=NEW.empresa AND revision=NEW.revision-1 AND estado='aprobada' AND validacion=NEW.validacion))
BEGIN SELECT RAISE(ABORT,'Transicion de entrega invalida'); END;
