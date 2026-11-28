-- COMMERCE_DB. Delivery and implementation state are inseparable.
-- Reject an already inconsistent database rather than silently altering historical records.
CREATE TABLE central_entrega_control_0048(ok INTEGER NOT NULL CHECK(ok=1));
INSERT INTO central_entrega_control_0048
SELECT CASE WHEN EXISTS(SELECT 1 FROM central_entrega_revisiones r JOIN central_implementaciones i ON i.empresa=r.empresa WHERE r.estado='entregada' AND i.estado<>'entregada') OR EXISTS(SELECT 1 FROM central_implementaciones i WHERE i.estado='entregada' AND NOT EXISTS(SELECT 1 FROM central_entrega_revisiones r WHERE r.empresa=i.empresa AND r.estado='entregada')) THEN 0 ELSE 1 END;
DROP TABLE central_entrega_control_0048;
CREATE TRIGGER central_entrega_atomicidad AFTER INSERT ON central_entrega_revisiones
WHEN NEW.estado='entregada'
BEGIN
 UPDATE central_implementaciones SET estado='entregada',revision=revision+1
 WHERE empresa=NEW.empresa AND estado IN ('pendiente','configuracion','revision');
 SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'Entrega sin implementacion vigente') END;
END;
