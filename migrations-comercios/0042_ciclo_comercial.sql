-- COMMERCE_DB only. Lifecycle authorization and immutable history; no access restoration or deletion.
CREATE TABLE comercial_ciclo_vida(
 empresa TEXT NOT NULL REFERENCES comercial_contratos_iniciales(empresa),
 revision INTEGER NOT NULL CHECK(revision>=2),
 anterior TEXT NOT NULL CHECK(anterior IN ('prueba','activa','suspendida')),
 posterior TEXT NOT NULL CHECK(posterior IN ('prueba','activa','suspendida','cancelada')),
 accion TEXT NOT NULL CHECK(accion IN ('suspender','reactivar','cancelar')),
 motivo TEXT NOT NULL CHECK(length(trim(motivo)) BETWEEN 1 AND 1000),
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 fecha INTEGER NOT NULL CHECK(fecha>=0),
 PRIMARY KEY(empresa,revision),
 CHECK((accion='suspender' AND anterior IN ('prueba','activa') AND posterior='suspendida') OR (accion='reactivar' AND anterior='suspendida' AND posterior IN ('prueba','activa')) OR (accion='cancelar' AND posterior='cancelada'))
);
CREATE TRIGGER comercial_ciclo_no_update BEFORE UPDATE ON comercial_ciclo_vida BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercial_ciclo_no_delete BEFORE DELETE ON comercial_ciclo_vida BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercial_ciclo_guard BEFORE INSERT ON comercial_ciclo_vida
WHEN NOT EXISTS(SELECT 1 FROM comercial_suscripciones s JOIN empresas e ON e.id=s.empresa JOIN central_operadores o ON o.id=NEW.operador WHERE s.empresa=NEW.empresa AND s.revision+1=NEW.revision AND s.estado=NEW.anterior AND e.activa=1 AND o.activo=1 AND (NEW.accion<>'reactivar' OR (s.inicio<=NEW.fecha AND NEW.fecha<s.vence AND EXISTS(SELECT 1 FROM comercial_ciclo_vida c WHERE c.empresa=s.empresa AND c.revision=s.revision AND c.accion='suspender' AND c.anterior=NEW.posterior))))
BEGIN SELECT RAISE(ABORT,'Transicion no autorizada'); END;
DROP TRIGGER comercial_suscripcion_verificada_no_update;
CREATE TRIGGER comercial_suscripcion_verificada_no_update BEFORE UPDATE ON comercial_suscripciones
WHEN EXISTS(SELECT 1 FROM comercio_altas_pendientes a JOIN comercio_altas_prospecto v ON v.alta=a.id WHERE a.empresa=OLD.empresa)
AND NOT EXISTS(SELECT 1 FROM comercial_cambios_contractuales c JOIN comercial_activaciones x ON x.empresa=c.empresa WHERE c.empresa=OLD.empresa AND c.revision=NEW.revision AND c.plan=NEW.plan AND c.version=NEW.version AND c.inicio=NEW.inicio AND c.vence=NEW.vence AND c.revision_activacion=x.revision AND c.modulos=x.modulos AND NEW.estado=OLD.estado AND NEW.estado IN ('activa','prueba'))
AND NOT EXISTS(SELECT 1 FROM comercial_ciclo_vida c WHERE c.empresa=OLD.empresa AND c.revision=NEW.revision AND c.anterior=OLD.estado AND c.posterior=NEW.estado AND NEW.plan=OLD.plan AND NEW.version=OLD.version AND NEW.inicio=OLD.inicio AND NEW.vence=OLD.vence)
BEGIN SELECT RAISE(ABORT,'Cambio contractual no autorizado'); END;
-- Lifecycle transitions are consumed immediately in the same SQLite statement.
CREATE TRIGGER comercial_ciclo_aplicar AFTER INSERT ON comercial_ciclo_vida
BEGIN
 UPDATE comercial_suscripciones SET estado=NEW.posterior,revision=NEW.revision WHERE empresa=NEW.empresa AND revision=NEW.revision-1 AND estado=NEW.anterior;
 INSERT INTO central_auditoria(actor,empresa,accion,objetivo,fecha,anterior,posterior) VALUES(NEW.operador,NEW.empresa,'ciclo.'||NEW.accion,NEW.empresa,NEW.fecha,json_object('estado',NEW.anterior,'revision',NEW.revision-1),json_object('estado',NEW.posterior,'revision',NEW.revision));
END;
