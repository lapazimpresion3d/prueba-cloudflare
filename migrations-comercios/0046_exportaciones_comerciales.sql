-- Internal export audit, no payload or credentials stored.
CREATE TABLE comercio_exportaciones(
 id TEXT PRIMARY KEY, empresa TEXT NOT NULL REFERENCES comercial_contratos_iniciales(empresa),
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 fecha INTEGER NOT NULL CHECK(fecha>=0),
 formato TEXT NOT NULL CHECK(formato IN ('json','csv')),
 motivo TEXT NOT NULL CHECK(length(trim(motivo)) BETWEEN 1 AND 1000),
 sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 bytes INTEGER NOT NULL CHECK(bytes BETWEEN 1 AND 2000000)
);
CREATE INDEX comercio_exportaciones_empresa ON comercio_exportaciones(empresa,fecha,id);
CREATE TRIGGER comercio_exportacion_no_update BEFORE UPDATE ON comercio_exportaciones BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_exportacion_no_delete BEFORE DELETE ON comercio_exportaciones BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
