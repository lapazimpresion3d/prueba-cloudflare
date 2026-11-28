-- COMMERCE_DB only. Short-lived, one-time OIDC transactions.
CREATE TABLE comercio_oidc_solicitudes(
 estado_hash TEXT PRIMARY KEY CHECK(length(estado_hash)=64),
 navegador_hash TEXT NOT NULL CHECK(length(navegador_hash)=64),
 nonce TEXT NOT NULL CHECK(length(nonce)=43),
 verificador TEXT NOT NULL CHECK(length(verificador)=43),
 contexto TEXT NOT NULL CHECK(contexto IN ('comercial','central')),
 configuracion TEXT NOT NULL CHECK(length(configuracion)=64),
 expira INTEGER NOT NULL
);
CREATE INDEX comercio_oidc_expira ON comercio_oidc_solicitudes(expira);
