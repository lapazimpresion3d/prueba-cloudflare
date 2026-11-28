-- COMMERCE_DB only. Recovery audit retains internal identifiers, never external tokens or email.
CREATE TABLE comercio_recuperaciones(
 id TEXT PRIMARY KEY,
 contexto TEXT NOT NULL CHECK(contexto IN ('comercial','central')),
 usuario TEXT REFERENCES usuarios(id),
 operador TEXT REFERENCES central_operadores(id),
 fecha INTEGER NOT NULL,
 CHECK((contexto='comercial' AND usuario IS NOT NULL AND operador IS NULL) OR (contexto='central' AND operador IS NOT NULL AND usuario IS NULL))
);
CREATE TRIGGER comercio_recuperacion_no_update BEFORE UPDATE ON comercio_recuperaciones BEGIN SELECT RAISE(ABORT,'Evento inmutable'); END;
CREATE TRIGGER comercio_recuperacion_no_delete BEFORE DELETE ON comercio_recuperaciones BEGIN SELECT RAISE(ABORT,'Evento inmutable'); END;
CREATE TRIGGER comercio_recuperacion_revocar AFTER INSERT ON comercio_recuperaciones
BEGIN
 UPDATE comercio_sesiones SET revocado=MAX(ultima,NEW.fecha) WHERE usuario=NEW.usuario AND revocado IS NULL;
 UPDATE central_sesiones SET revocado=MAX(ultima,NEW.fecha) WHERE operador=NEW.operador AND revocado IS NULL;
END;
CREATE TABLE comercio_limites_oidc(
 origen TEXT PRIMARY KEY CHECK(length(origen)=64),
 usos INTEGER NOT NULL CHECK(usos BETWEEN 1 AND 10),
 vence INTEGER NOT NULL
);
CREATE INDEX comercio_limites_oidc_vence ON comercio_limites_oidc(vence);
