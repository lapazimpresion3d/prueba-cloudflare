-- COMMERCE_DB only. Initial commercial agreement independent of activation.
CREATE TABLE comercial_contratos_iniciales(
 empresa TEXT PRIMARY KEY REFERENCES empresas(id),
 alta TEXT NOT NULL UNIQUE REFERENCES comercio_altas_prospecto(alta),
 plan TEXT NOT NULL,
 version INTEGER NOT NULL,
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 fecha INTEGER NOT NULL CHECK(typeof(fecha)='integer' AND fecha>=0),
 referencia TEXT NOT NULL CHECK(length(referencia) BETWEEN 1 AND 120),
 FOREIGN KEY(plan,version) REFERENCES comercial_planes(id,version)
);
CREATE TRIGGER comercial_contrato_inicial_no_update BEFORE UPDATE ON comercial_contratos_iniciales BEGIN SELECT RAISE(ABORT,'Contrato inicial inmutable'); END;
CREATE TRIGGER comercial_contrato_inicial_no_delete BEFORE DELETE ON comercial_contratos_iniciales BEGIN SELECT RAISE(ABORT,'Contrato inicial inmutable'); END;
-- Existing historical subscription API cannot bypass onboarding for verified businesses.
CREATE TRIGGER comercial_suscripcion_alta_verificada_guard BEFORE INSERT ON comercial_suscripciones
WHEN EXISTS(SELECT 1 FROM comercio_altas_pendientes a JOIN comercio_altas_prospecto p ON p.alta=a.id WHERE a.empresa=NEW.empresa)
BEGIN SELECT RAISE(ABORT,'Activacion comercial pendiente de autorizacion'); END;
