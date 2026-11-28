-- COMMERCE_DB exclusively. Small private JPEG drafts; no public URLs.
ALTER TABLE comercio_perfiles_privados ADD COLUMN color_secundario TEXT NOT NULL DEFAULT '#475569' CHECK(length(color_secundario)=7 AND substr(color_secundario,1,1)='#' AND substr(color_secundario,2) NOT GLOB '*[^0-9a-fA-F]*');
ALTER TABLE comercio_perfiles_privados ADD COLUMN color_acento TEXT NOT NULL DEFAULT '#b45309' CHECK(length(color_acento)=7 AND substr(color_acento,1,1)='#' AND substr(color_acento,2) NOT GLOB '*[^0-9a-fA-F]*');
ALTER TABLE comercio_perfiles_privados ADD COLUMN color_fondo TEXT NOT NULL DEFAULT '#ffffff' CHECK(length(color_fondo)=7 AND substr(color_fondo,1,1)='#' AND substr(color_fondo,2) NOT GLOB '*[^0-9a-fA-F]*');
ALTER TABLE comercio_perfiles_privados ADD COLUMN color_texto TEXT NOT NULL DEFAULT '#111827' CHECK(length(color_texto)=7 AND substr(color_texto,1,1)='#' AND substr(color_texto,2) NOT GLOB '*[^0-9a-fA-F]*');
ALTER TABLE comercio_perfiles_privados ADD COLUMN logotipo TEXT CHECK(logotipo IS NULL OR (length(logotipo)<=120000 AND substr(logotipo,1,23)='data:image/jpeg;base64,'));
ALTER TABLE comercio_perfiles_privados ADD COLUMN portada TEXT CHECK(portada IS NULL OR (length(portada)<=360000 AND substr(portada,1,23)='data:image/jpeg;base64,'));
CREATE TRIGGER comercio_color_primario_valido BEFORE UPDATE OF color ON comercio_perfiles_privados
WHEN substr(NEW.color,1,1)<>'#' OR substr(NEW.color,2) GLOB '*[^0-9a-fA-F]*'
BEGIN SELECT RAISE(ABORT,'Color invalido'); END;
