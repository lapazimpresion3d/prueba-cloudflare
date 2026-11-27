-- COMMERCE_DB exclusivamente. Contratación administrativa, sin cobros automáticos.
CREATE TABLE comercial_planes(
 id TEXT NOT NULL CHECK(id IN ('p1','p2','p3','p4')), version INTEGER NOT NULL CHECK(version>0),
 nombre TEXT NOT NULL, implementacion INTEGER NOT NULL CHECK(implementacion>=0), mensualidad INTEGER NOT NULL CHECK(mensualidad>=0),
 moneda TEXT NOT NULL CHECK(moneda='MXN'), usuarios INTEGER NOT NULL CHECK(usuarios>0), sucursales INTEGER NOT NULL CHECK(sucursales>0),
 modulos TEXT NOT NULL CHECK(json_valid(modulos) AND json_type(modulos)='array'), PRIMARY KEY(id,version)
);
CREATE TRIGGER comercial_plan_inmutable BEFORE UPDATE ON comercial_planes BEGIN SELECT RAISE(ABORT,'Version de plan inmutable'); END;
CREATE TABLE comercial_suscripciones(
 empresa TEXT PRIMARY KEY REFERENCES empresas(id), plan TEXT NOT NULL, version INTEGER NOT NULL,
 estado TEXT NOT NULL CHECK(estado IN ('prueba','activa','suspendida','cancelada')),
 inicio INTEGER NOT NULL, vence INTEGER NOT NULL CHECK(vence>inicio), revision INTEGER NOT NULL CHECK(revision>=1),
 FOREIGN KEY(plan,version) REFERENCES comercial_planes(id,version)
);
CREATE TABLE comercial_suscripcion_historial(
 empresa TEXT NOT NULL REFERENCES empresas(id), revision INTEGER NOT NULL, plan TEXT NOT NULL, version INTEGER NOT NULL,
 estado TEXT NOT NULL, inicio INTEGER NOT NULL, vence INTEGER NOT NULL, fecha INTEGER NOT NULL,
 PRIMARY KEY(empresa,revision), FOREIGN KEY(plan,version) REFERENCES comercial_planes(id,version)
);
CREATE TRIGGER comercial_suscripcion_revision BEFORE UPDATE ON comercial_suscripciones
WHEN NEW.empresa<>OLD.empresa OR NEW.revision<>OLD.revision+1 BEGIN SELECT RAISE(ABORT,'Revision de suscripcion invalida'); END;
CREATE TRIGGER comercial_suscripcion_alta AFTER INSERT ON comercial_suscripciones
BEGIN INSERT INTO comercial_suscripcion_historial VALUES(NEW.empresa,NEW.revision,NEW.plan,NEW.version,NEW.estado,NEW.inicio,NEW.vence,unixepoch()*1000); END;
CREATE TRIGGER comercial_suscripcion_cambio AFTER UPDATE ON comercial_suscripciones
BEGIN INSERT INTO comercial_suscripcion_historial VALUES(NEW.empresa,NEW.revision,NEW.plan,NEW.version,NEW.estado,NEW.inicio,NEW.vence,unixepoch()*1000); END;
