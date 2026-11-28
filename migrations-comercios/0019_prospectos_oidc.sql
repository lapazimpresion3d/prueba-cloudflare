-- COMMERCE_DB only. One-use proof from a consumed, verified prospect OIDC flow.
CREATE TABLE comercio_prospectos_oidc(
 hash TEXT PRIMARY KEY CHECK(length(hash)=64),
 emisor TEXT NOT NULL CHECK(length(emisor) BETWEEN 1 AND 128),
 sujeto TEXT NOT NULL CHECK(length(sujeto) BETWEEN 1 AND 128),
 creado INTEGER NOT NULL,
 expira INTEGER NOT NULL CHECK(expira>creado)
);
CREATE INDEX comercio_prospectos_expira ON comercio_prospectos_oidc(expira);
