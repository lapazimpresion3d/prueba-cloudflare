-- COMMERCE_DB only. Bind the opaque invitation digest to the server-side OIDC state.
ALTER TABLE comercio_oidc_solicitudes ADD COLUMN invitacion_hash TEXT CHECK(invitacion_hash IS NULL OR (length(invitacion_hash)=64 AND invitacion_hash NOT GLOB '*[^0-9a-f]*'));
