-- COMMERCE_DB only. Historical plan versions cannot be removed or modified.
CREATE TRIGGER comercial_plan_no_delete BEFORE DELETE ON comercial_planes
BEGIN SELECT RAISE(ABORT,'Version de plan inmutable'); END;
-- Separate publication metadata; no retroactive changes to plan data or subscriptions.
CREATE TABLE comercial_plan_publicaciones(
 plan TEXT NOT NULL,
 version INTEGER NOT NULL,
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 fecha INTEGER NOT NULL CHECK(typeof(fecha)='integer' AND fecha>=0),
 PRIMARY KEY(plan,version),
 FOREIGN KEY(plan,version) REFERENCES comercial_planes(id,version)
);
CREATE TRIGGER comercial_plan_publicacion_no_update BEFORE UPDATE ON comercial_plan_publicaciones
BEGIN SELECT RAISE(ABORT,'Publicacion inmutable'); END;
CREATE TRIGGER comercial_plan_publicacion_no_delete BEFORE DELETE ON comercial_plan_publicaciones
BEGIN SELECT RAISE(ABORT,'Publicacion inmutable'); END;
