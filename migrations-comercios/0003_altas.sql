-- COMMERCE_DB. Protege propietarios y habilita invitaciones de un solo uso.
CREATE TABLE comercio_invitaciones(
 hash TEXT PRIMARY KEY CHECK(length(hash)=64), empresa TEXT NOT NULL REFERENCES empresas(id), correo TEXT NOT NULL,
 rol TEXT NOT NULL CHECK(rol IN ('administrador','encargado','cajero')), sucursal TEXT,
 actor TEXT NOT NULL REFERENCES usuarios(id), expira INTEGER NOT NULL, consumido INTEGER,
 FOREIGN KEY(empresa,rol) REFERENCES roles(empresa,id), FOREIGN KEY(empresa,sucursal) REFERENCES sucursales(empresa,id)
);
CREATE TRIGGER comercio_ultimo_propietario_update BEFORE UPDATE ON membresias
WHEN OLD.rol='propietario' AND OLD.activa=1 AND OLD.alcance='empresa' AND (NEW.rol<>OLD.rol OR NEW.activa<>1 OR NEW.alcance<>OLD.alcance OR NEW.usuario<>OLD.usuario OR NEW.empresa<>OLD.empresa)
AND NOT EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=OLD.empresa AND m.usuario<>OLD.usuario AND m.rol='propietario' AND m.activa=1 AND m.alcance='empresa' AND u.activo=1)
BEGIN SELECT RAISE(ABORT,'Ultimo propietario'); END;
CREATE TRIGGER comercio_ultimo_propietario_delete BEFORE DELETE ON membresias
WHEN OLD.rol='propietario' AND OLD.activa=1 AND OLD.alcance='empresa'
AND NOT EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=OLD.empresa AND m.usuario<>OLD.usuario AND m.rol='propietario' AND m.activa=1 AND m.alcance='empresa' AND u.activo=1)
BEGIN SELECT RAISE(ABORT,'Ultimo propietario'); END;
CREATE TRIGGER comercio_ultimo_propietario_usuario BEFORE UPDATE OF activo ON usuarios
WHEN OLD.activo=1 AND NEW.activo=0 AND EXISTS(SELECT 1 FROM membresias m WHERE m.usuario=OLD.id AND m.rol='propietario' AND m.activa=1 AND m.alcance='empresa' AND NOT EXISTS(SELECT 1 FROM membresias x JOIN usuarios u ON u.id=x.usuario WHERE x.empresa=m.empresa AND x.usuario<>OLD.id AND x.rol='propietario' AND x.activa=1 AND x.alcance='empresa' AND u.activo=1))
BEGIN SELECT RAISE(ABORT,'Ultimo propietario'); END;
