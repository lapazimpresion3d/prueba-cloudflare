-- COMMERCE_DB only. A personnel record is not an account or a membership.
CREATE TABLE comercio_empleados(
 empresa TEXT NOT NULL REFERENCES empresas(id), id TEXT NOT NULL,
 codigo TEXT NOT NULL CHECK(length(codigo) BETWEEN 1 AND 40),
 nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 1 AND 120),
 puesto TEXT NOT NULL CHECK(length(puesto)<=120),
 especialidad TEXT NOT NULL CHECK(length(especialidad)<=200),
 telefono TEXT NOT NULL DEFAULT '' CHECK(length(telefono)<=16),
 correo TEXT NOT NULL DEFAULT '' CHECK(length(correo)<=254),
 incorporacion TEXT NOT NULL CHECK(length(incorporacion)=10),
 activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0,1)),
 usuario TEXT,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
 creado INTEGER NOT NULL CHECK(creado>=0), actualizado INTEGER NOT NULL CHECK(actualizado>=creado),
 PRIMARY KEY(empresa,id), UNIQUE(empresa,codigo), UNIQUE(empresa,usuario),
 FOREIGN KEY(empresa,usuario) REFERENCES membresias(empresa,usuario)
);
CREATE INDEX comercio_empleados_estado ON comercio_empleados(empresa,activo,id);
CREATE TRIGGER comercio_empleado_no_delete BEFORE DELETE ON comercio_empleados BEGIN SELECT RAISE(ABORT,'Empleado protegido'); END;
CREATE TRIGGER comercio_empleado_revision BEFORE UPDATE ON comercio_empleados WHEN NEW.empresa<>OLD.empresa OR NEW.id<>OLD.id OR NEW.creado<>OLD.creado OR NEW.revision<>OLD.revision+1
BEGIN SELECT RAISE(ABORT,'Revision o identidad de empleado invalida'); END;
CREATE TRIGGER comercio_empleado_sin_cuenta_alta BEFORE INSERT ON comercio_empleados WHEN NEW.usuario IS NOT NULL
BEGIN SELECT RAISE(ABORT,'Vinculacion separada requerida'); END;
CREATE TRIGGER comercio_empleado_cuenta BEFORE UPDATE OF usuario ON comercio_empleados WHEN NEW.usuario IS NOT NULL AND NEW.usuario IS NOT OLD.usuario AND NOT EXISTS(SELECT 1 FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=NEW.empresa AND m.usuario=NEW.usuario AND m.rol<>'propietario' AND m.activa=1 AND u.activo=1)
BEGIN SELECT RAISE(ABORT,'Cuenta de empleado no disponible'); END;
CREATE TABLE comercio_empleados_vinculos(
 empresa TEXT NOT NULL, empleado TEXT NOT NULL, revision INTEGER NOT NULL,
 anterior TEXT, posterior TEXT, actor TEXT NOT NULL REFERENCES usuarios(id), fecha INTEGER NOT NULL,
 PRIMARY KEY(empresa,empleado,revision), FOREIGN KEY(empresa,empleado) REFERENCES comercio_empleados(empresa,id),
 FOREIGN KEY(empresa,anterior) REFERENCES membresias(empresa,usuario),
 FOREIGN KEY(empresa,posterior) REFERENCES membresias(empresa,usuario),
 CHECK(anterior IS NOT posterior)
);
CREATE TRIGGER comercio_empleado_vinculo_no_update BEFORE UPDATE ON comercio_empleados_vinculos BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER comercio_empleado_vinculo_no_delete BEFORE DELETE ON comercio_empleados_vinculos BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
