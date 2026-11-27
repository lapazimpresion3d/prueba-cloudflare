-- COMMERCE_DB. Operadores centrales aprovisionados fuera de las rutas comerciales.
CREATE TABLE central_operadores(
 id TEXT PRIMARY KEY, emisor TEXT NOT NULL, sujeto TEXT NOT NULL,
 activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0,1)),
 UNIQUE(emisor,sujeto)
);
CREATE TABLE central_implementaciones(
 empresa TEXT PRIMARY KEY REFERENCES empresas(id),
 estado TEXT NOT NULL CHECK(estado IN ('pendiente','configuracion','revision','entregada')),
 revision INTEGER NOT NULL CHECK(revision>=1)
);
CREATE TABLE central_pagos_servicio(
 id TEXT PRIMARY KEY, empresa TEXT NOT NULL REFERENCES empresas(id),
 concepto TEXT NOT NULL CHECK(concepto IN ('implementacion','mensualidad','adicional')),
 importe INTEGER NOT NULL CHECK(typeof(importe)='integer' AND importe BETWEEN 1 AND 100000000),
 fecha INTEGER NOT NULL, referencia TEXT NOT NULL CHECK(length(referencia) BETWEEN 1 AND 120),
 actor TEXT NOT NULL REFERENCES central_operadores(id),
 UNIQUE(empresa,referencia)
);
CREATE TABLE central_auditoria(
 id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL REFERENCES central_operadores(id),
 empresa TEXT REFERENCES empresas(id), accion TEXT NOT NULL, objetivo TEXT NOT NULL, fecha INTEGER NOT NULL
);
CREATE TRIGGER central_pago_inmutable_update BEFORE UPDATE ON central_pagos_servicio BEGIN SELECT RAISE(ABORT,'Registro de pago inmutable'); END;
CREATE TRIGGER central_pago_inmutable_delete BEFORE DELETE ON central_pagos_servicio BEGIN SELECT RAISE(ABORT,'Registro de pago inmutable'); END;
CREATE INDEX central_pago_empresa ON central_pagos_servicio(empresa,fecha);
CREATE INDEX central_auditoria_fecha ON central_auditoria(fecha);
