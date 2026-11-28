-- COMMERCE_DB only. Opaque one-time invitations; scoped membership revocation.
CREATE TABLE comercio_invitaciones_empleado(
 id TEXT PRIMARY KEY, empresa TEXT NOT NULL, empleado TEXT NOT NULL,
 hash TEXT NOT NULL UNIQUE CHECK(length(hash)=64), correo TEXT NOT NULL CHECK(length(correo) BETWEEN 3 AND 254),
 rol TEXT NOT NULL, sucursales TEXT NOT NULL CHECK(json_valid(sucursales) AND json_type(sucursales)='array' AND json_array_length(sucursales)>0),
 actor TEXT NOT NULL REFERENCES usuarios(id), creado INTEGER NOT NULL, expira INTEGER NOT NULL CHECK(expira>creado),
 consumido TEXT, cancelado INTEGER,
 FOREIGN KEY(empresa,empleado) REFERENCES comercio_empleados(empresa,id),
 FOREIGN KEY(empresa,rol) REFERENCES roles(empresa,id), CHECK(consumido IS NULL OR cancelado IS NULL)
);
CREATE INDEX comercio_invitaciones_empleado_busqueda ON comercio_invitaciones_empleado(empresa,empleado,expira);
CREATE TRIGGER comercio_invitacion_empleado_protegida BEFORE UPDATE ON comercio_invitaciones_empleado
WHEN NEW.id<>OLD.id OR NEW.empresa<>OLD.empresa OR NEW.empleado<>OLD.empleado OR NEW.hash<>OLD.hash OR NEW.correo<>OLD.correo OR NEW.rol<>OLD.rol OR NEW.sucursales<>OLD.sucursales OR NEW.actor<>OLD.actor OR NEW.creado<>OLD.creado OR NEW.expira<>OLD.expira OR OLD.consumido IS NOT NULL OR OLD.cancelado IS NOT NULL
BEGIN SELECT RAISE(ABORT,'Invitacion protegida'); END;
CREATE TRIGGER comercio_invitacion_empleado_no_delete BEFORE DELETE ON comercio_invitaciones_empleado BEGIN SELECT RAISE(ABORT,'Invitacion protegida'); END;
-- A global session must not regain access to a reactivated membership automatically.
CREATE TABLE comercio_acceso_corte(
 empresa TEXT NOT NULL, usuario TEXT NOT NULL, desde INTEGER NOT NULL,
 PRIMARY KEY(empresa,usuario), FOREIGN KEY(empresa,usuario) REFERENCES membresias(empresa,usuario)
);
CREATE TRIGGER comercio_acceso_corte_no_delete BEFORE DELETE ON comercio_acceso_corte BEGIN SELECT RAISE(ABORT,'Corte protegido'); END;
CREATE TRIGGER comercio_acceso_corte_monotono BEFORE UPDATE ON comercio_acceso_corte WHEN NEW.empresa<>OLD.empresa OR NEW.usuario<>OLD.usuario OR NEW.desde<OLD.desde BEGIN SELECT RAISE(ABORT,'Corte protegido'); END;
