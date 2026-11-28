-- COMMERCE_DB only. Provenance and owner invitation lifecycle.
CREATE TABLE comercio_altas_prospecto(
 alta TEXT PRIMARY KEY REFERENCES comercio_altas_pendientes(id)
);
CREATE TABLE comercio_invitaciones_propietario(
 id TEXT PRIMARY KEY,
 alta TEXT NOT NULL UNIQUE REFERENCES comercio_altas_prospecto(alta),
 hash TEXT NOT NULL UNIQUE CHECK(length(hash)=64 AND hash NOT GLOB '*[^0-9a-f]*'),
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 creado INTEGER NOT NULL,
 expira INTEGER NOT NULL CHECK(expira>creado),
 consumido INTEGER CHECK(consumido IS NULL OR (consumido>=creado AND consumido<expira)),
 cancelado INTEGER CHECK(cancelado IS NULL OR cancelado>=creado),
 CHECK(consumido IS NULL OR cancelado IS NULL)
);
CREATE INDEX comercio_invitaciones_propietario_expira ON comercio_invitaciones_propietario(expira);
CREATE TRIGGER comercio_alta_prospecto_no_update BEFORE UPDATE ON comercio_altas_prospecto BEGIN SELECT RAISE(ABORT,'Origen de alta inmutable'); END;
CREATE TRIGGER comercio_alta_prospecto_no_delete BEFORE DELETE ON comercio_altas_prospecto BEGIN SELECT RAISE(ABORT,'Origen de alta inmutable'); END;
CREATE TRIGGER comercio_invitacion_terminal BEFORE UPDATE ON comercio_invitaciones_propietario
WHEN OLD.consumido IS NOT NULL OR OLD.cancelado IS NOT NULL
BEGIN SELECT RAISE(ABORT,'Invitacion finalizada'); END;
