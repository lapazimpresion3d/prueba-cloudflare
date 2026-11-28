-- COMMERCE_DB only. Immutable amendments authorize one exact subscription revision.
CREATE TABLE comercial_cambios_contractuales(
 empresa TEXT NOT NULL REFERENCES comercial_contratos_iniciales(empresa),
 revision INTEGER NOT NULL CHECK(revision>=2),
 revision_activacion INTEGER NOT NULL CHECK(revision_activacion>=2),
 plan TEXT NOT NULL, version INTEGER NOT NULL,
 inicio INTEGER NOT NULL, vence INTEGER NOT NULL CHECK(vence>inicio),
 modulos TEXT NOT NULL CHECK(json_valid(modulos) AND json_type(modulos)='array'),
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 fecha INTEGER NOT NULL, referencia TEXT NOT NULL CHECK(length(referencia) BETWEEN 1 AND 120),
 PRIMARY KEY(empresa,revision), FOREIGN KEY(plan,version) REFERENCES comercial_planes(id,version)
);
CREATE TRIGGER comercial_cambio_no_update BEFORE UPDATE ON comercial_cambios_contractuales BEGIN SELECT RAISE(ABORT,'Cambio contractual inmutable'); END;
CREATE TRIGGER comercial_cambio_no_delete BEFORE DELETE ON comercial_cambios_contractuales BEGIN SELECT RAISE(ABORT,'Cambio contractual inmutable'); END;
DROP TRIGGER comercial_suscripcion_verificada_no_update;
CREATE TRIGGER comercial_suscripcion_verificada_no_update BEFORE UPDATE ON comercial_suscripciones
WHEN EXISTS(SELECT 1 FROM comercio_altas_pendientes a JOIN comercio_altas_prospecto v ON v.alta=a.id WHERE a.empresa=OLD.empresa)
AND NOT EXISTS(SELECT 1 FROM comercial_cambios_contractuales c JOIN comercial_activaciones x ON x.empresa=c.empresa WHERE c.empresa=OLD.empresa AND c.revision=NEW.revision AND c.plan=NEW.plan AND c.version=NEW.version AND c.inicio=NEW.inicio AND c.vence=NEW.vence AND c.revision_activacion=x.revision AND c.modulos=x.modulos AND NEW.estado=OLD.estado AND NEW.estado IN ('activa','prueba'))
BEGIN SELECT RAISE(ABORT,'Cambio contractual no autorizado'); END;
CREATE TRIGGER comercial_historial_no_update_52 BEFORE UPDATE ON comercial_suscripcion_historial BEGIN SELECT RAISE(ABORT,'Historial contractual inmutable'); END;
CREATE TRIGGER comercial_historial_no_delete_52 BEFORE DELETE ON comercial_suscripcion_historial BEGIN SELECT RAISE(ABORT,'Historial contractual inmutable'); END;
