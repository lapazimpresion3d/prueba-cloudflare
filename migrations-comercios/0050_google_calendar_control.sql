-- COMMERCE_DB. Explicit entitlement, durable scheduling cursor; disabled by default.
CREATE TABLE google_calendar_autorizaciones(
 empresa TEXT PRIMARY KEY REFERENCES empresas(id), habilitado INTEGER NOT NULL CHECK(habilitado IN (0,1)),
 revision INTEGER NOT NULL CHECK(revision>=1)
);
CREATE TABLE google_calendar_cursor(
 id INTEGER PRIMARY KEY CHECK(id=1), valor TEXT NOT NULL DEFAULT '', reserva TEXT, reservado INTEGER, revision INTEGER NOT NULL DEFAULT 0,
 CHECK((reserva IS NULL)=(reservado IS NULL))
);
INSERT INTO google_calendar_cursor(id) VALUES(1);
