-- COMMERCE_DB only. No activation, secrets or remote writes.
CREATE TABLE google_calendar_conexiones(
 empresa TEXT PRIMARY KEY REFERENCES empresas(id),
 cifrado TEXT CHECK(cifrado IS NULL OR (json_valid(cifrado) AND length(cifrado)<=30000)),
 reserva TEXT, reservado INTEGER, revision INTEGER NOT NULL DEFAULT 0,
 activo INTEGER NOT NULL DEFAULT 0 CHECK(activo IN (0,1)),
 general TEXT, recursos TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(recursos) AND json_type(recursos)='object'),
 CHECK((reserva IS NULL)=(reservado IS NULL)), CHECK(activo=0 OR (cifrado IS NOT NULL AND general IS NOT NULL))
);
CREATE TABLE google_calendar_estados(
 hash TEXT PRIMARY KEY CHECK(length(hash)=43), empresa TEXT NOT NULL REFERENCES empresas(id), actor TEXT NOT NULL REFERENCES usuarios(id),
 expira INTEGER NOT NULL, cifrado TEXT NOT NULL CHECK(json_valid(cifrado) AND length(cifrado)<=30000), consumido INTEGER,
 FOREIGN KEY(empresa,actor) REFERENCES membresias(empresa,usuario)
);
CREATE INDEX google_calendar_estados_expira ON google_calendar_estados(expira);
CREATE TABLE google_calendar_eventos(
 empresa TEXT NOT NULL REFERENCES google_calendar_conexiones(empresa), clave TEXT NOT NULL, cal TEXT NOT NULL, id TEXT NOT NULL CHECK(length(id)=64),
 PRIMARY KEY(empresa,clave), UNIQUE(empresa,cal,id)
);
CREATE TABLE google_calendar_historial(
 id INTEGER PRIMARY KEY AUTOINCREMENT, empresa TEXT NOT NULL REFERENCES google_calendar_conexiones(empresa), fecha INTEGER NOT NULL,
 estado TEXT NOT NULL CHECK(estado IN ('sincronizado','reintentar','desconectado'))
);
CREATE INDEX google_calendar_historial_empresa ON google_calendar_historial(empresa,fecha);
