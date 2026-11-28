-- COMMERCE_DB only. Extend existing private profile; no public projection.
ALTER TABLE comercio_perfiles_privados ADD COLUMN descripcion TEXT NOT NULL DEFAULT '' CHECK(length(descripcion)<=2000);
ALTER TABLE comercio_perfiles_privados ADD COLUMN lema TEXT NOT NULL DEFAULT '' CHECK(length(lema)<=160);
ALTER TABLE comercio_perfiles_privados ADD COLUMN actualizado INTEGER CHECK(actualizado IS NULL OR (typeof(actualizado)='integer' AND actualizado>=0));
CREATE TRIGGER comercio_perfil_revision BEFORE UPDATE ON comercio_perfiles_privados
WHEN NEW.empresa<>OLD.empresa OR NEW.giro<>OLD.giro OR NEW.revision<>OLD.revision+1
BEGIN SELECT RAISE(ABORT,'Revision o identidad de perfil invalida'); END;
CREATE TRIGGER comercio_perfil_no_delete BEFORE DELETE ON comercio_perfiles_privados BEGIN SELECT RAISE(ABORT,'Perfil protegido'); END;
