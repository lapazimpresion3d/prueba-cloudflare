-- COMMERCE_DB only. Explicit activation for verified onboarding.
CREATE TABLE comercial_activaciones(
 empresa TEXT PRIMARY KEY REFERENCES comercial_contratos_iniciales(empresa),
 revision INTEGER NOT NULL CHECK(revision>=1),
 modulos TEXT NOT NULL CHECK(json_valid(modulos) AND json_type(modulos)='array'),
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 fecha INTEGER NOT NULL
);
CREATE TRIGGER comercial_activacion_revision BEFORE UPDATE ON comercial_activaciones
WHEN NEW.empresa<>OLD.empresa OR NEW.revision<>OLD.revision+1
BEGIN SELECT RAISE(ABORT,'Revision de activacion invalida'); END;
CREATE TRIGGER comercial_activacion_no_delete BEFORE DELETE ON comercial_activaciones BEGIN SELECT RAISE(ABORT,'Activacion protegida'); END;
DROP TRIGGER comercial_suscripcion_alta_verificada_guard;
CREATE TRIGGER comercial_suscripcion_alta_verificada_guard BEFORE INSERT ON comercial_suscripciones
WHEN EXISTS(SELECT 1 FROM comercio_altas_pendientes a JOIN comercio_altas_prospecto v ON v.alta=a.id WHERE a.empresa=NEW.empresa)
AND NOT EXISTS(SELECT 1 FROM comercial_activaciones x JOIN comercial_contratos_iniciales k ON k.empresa=x.empresa WHERE x.empresa=NEW.empresa AND k.plan=NEW.plan AND k.version=NEW.version)
BEGIN SELECT RAISE(ABORT,'Activacion comercial pendiente de autorizacion'); END;
-- Lifecycle changes for verified companies will require their own authorized service.
CREATE TRIGGER comercial_suscripcion_verificada_no_update BEFORE UPDATE ON comercial_suscripciones
WHEN EXISTS(SELECT 1 FROM comercio_altas_pendientes a JOIN comercio_altas_prospecto v ON v.alta=a.id WHERE a.empresa=OLD.empresa)
BEGIN SELECT RAISE(ABORT,'Cambio contractual pendiente de autorizacion'); END;
CREATE TRIGGER comercial_suscripcion_verificada_no_delete BEFORE DELETE ON comercial_suscripciones
WHEN EXISTS(SELECT 1 FROM comercio_altas_pendientes a JOIN comercio_altas_prospecto v ON v.alta=a.id WHERE a.empresa=OLD.empresa)
BEGIN SELECT RAISE(ABORT,'Suscripcion protegida'); END;
