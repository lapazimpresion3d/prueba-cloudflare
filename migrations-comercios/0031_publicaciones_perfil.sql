-- COMMERCE_DB only. Internal publication snapshots, never served by current Worker.
CREATE TABLE comercio_publicaciones_perfil(
 empresa TEXT NOT NULL REFERENCES comercio_perfiles_privados(empresa),
 version INTEGER NOT NULL CHECK(version>=1),
 revision_perfil INTEGER NOT NULL CHECK(revision_perfil>=1),
 restaurada_de INTEGER,
 actor TEXT NOT NULL REFERENCES usuarios(id),
 fecha INTEGER NOT NULL CHECK(fecha>=0),
 contenido TEXT NOT NULL CHECK(json_valid(contenido) AND json_type(contenido)='object' AND length(contenido)<=600000),
 PRIMARY KEY(empresa,version),
 FOREIGN KEY(empresa,restaurada_de) REFERENCES comercio_publicaciones_perfil(empresa,version),
 CHECK(restaurada_de IS NULL OR restaurada_de<version)
);
CREATE TRIGGER comercio_publicacion_no_update BEFORE UPDATE ON comercio_publicaciones_perfil BEGIN SELECT RAISE(ABORT,'Publicacion inmutable'); END;
CREATE TRIGGER comercio_publicacion_no_delete BEFORE DELETE ON comercio_publicaciones_perfil BEGIN SELECT RAISE(ABORT,'Publicacion inmutable'); END;
CREATE TRIGGER comercio_publicacion_secuencia BEFORE INSERT ON comercio_publicaciones_perfil
WHEN NEW.version<>(SELECT COALESCE(MAX(version),0)+1 FROM comercio_publicaciones_perfil WHERE empresa=NEW.empresa)
BEGIN SELECT RAISE(ABORT,'Version de publicacion invalida'); END;
ALTER TABLE comercio_perfiles_privados ADD COLUMN presentacion TEXT NOT NULL DEFAULT '{"estilo":"clasico","secciones":["descripcion","horario","contacto"]}' CHECK(json_valid(presentacion) AND json_type(presentacion)='object' AND length(presentacion)<=1000);
