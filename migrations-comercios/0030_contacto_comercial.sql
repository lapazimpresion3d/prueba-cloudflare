-- COMMERCE_DB only. Empty private draft; visibility is explicit, not publication.
ALTER TABLE comercio_perfiles_privados ADD COLUMN contacto TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(contacto) AND json_type(contacto)='object' AND length(contacto)<=16000);
