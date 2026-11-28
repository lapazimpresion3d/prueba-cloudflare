-- COMMERCE_DB only. Older validations lack this evidence and cannot authorize delivery.
ALTER TABLE comercio_asistente_validaciones ADD COLUMN evidencia TEXT CHECK(evidencia IS NULL OR json_valid(evidencia));
CREATE VIEW comercio_evidencia_entrega AS
 SELECT p.empresa,json_object('perfil',p.revision,'giro',p.giro,'implementacion',i.revision,'estado',i.estado,'empresa_activa',e.activa,
 'progreso',(SELECT COALESCE(MAX(revision),0) FROM comercio_asistente_progreso WHERE empresa=p.empresa),
 'contrato',json_array(k.plan,k.version,k.alta,s.plan,s.version,s.revision,s.estado,s.inicio,s.vence,pl.usuarios,pl.sucursales,pl.modulos),
 'activacion',json_array(ac.revision,ac.modulos),
 'sucursales',(SELECT json_group_array(json_array(id,revision,activa)) FROM (SELECT id,revision,activa FROM sucursales WHERE empresa=p.empresa ORDER BY id)),
 'principal',(SELECT json_group_array(json_array(sucursal,revision)) FROM (SELECT sucursal,revision FROM comercio_sucursal_principal WHERE empresa=p.empresa)),
 'empleados',(SELECT json_group_array(json_array(id,revision,activo,usuario)) FROM (SELECT id,revision,activo,usuario FROM comercio_empleados WHERE empresa=p.empresa ORDER BY id)),
 'membresias',(SELECT json_group_array(json_array(usuario,rol,alcance,activa,activo)) FROM (SELECT m.usuario,m.rol,m.alcance,m.activa,u.activo FROM membresias m JOIN usuarios u ON u.id=m.usuario WHERE m.empresa=p.empresa ORDER BY m.usuario)),
 'alcance',(SELECT json_group_array(json_array(usuario,sucursal)) FROM (SELECT usuario,sucursal FROM membresia_sucursales WHERE empresa=p.empresa ORDER BY usuario,sucursal)),
 'permisos',(SELECT json_group_array(json_array(rol,permiso)) FROM (SELECT rol,permiso FROM rol_permisos WHERE empresa=p.empresa ORDER BY rol,permiso)),
 'denegados',(SELECT json_group_array(json_array(usuario,permiso)) FROM (SELECT usuario,permiso FROM membresia_permisos_denegados WHERE empresa=p.empresa ORDER BY usuario,permiso)),
 'roles',(SELECT json_group_array(json_array(rol,revision)) FROM (SELECT rol,MAX(revision) AS revision FROM comercio_roles_operativos WHERE empresa=p.empresa GROUP BY rol ORDER BY rol)),
 'restricciones',(SELECT json_group_array(json_array(usuario,revision)) FROM (SELECT usuario,MAX(revision) AS revision FROM comercio_restricciones_operativas WHERE empresa=p.empresa GROUP BY usuario ORDER BY usuario)),
 'asignaciones',(SELECT json_group_array(json_array(empleado,revision)) FROM (SELECT empleado,MAX(revision) AS revision FROM comercio_asignaciones_personal WHERE empresa=p.empresa GROUP BY empleado ORDER BY empleado)),
 'accesos',(SELECT json_group_array(json_array(usuario,revision)) FROM (SELECT usuario,MAX(revision) AS revision FROM comercio_asignaciones_acceso WHERE empresa=p.empresa GROUP BY usuario ORDER BY usuario)),
 'servicios',(SELECT json_group_array(json_array(id,revision,activo)) FROM (SELECT id,revision,activo FROM comercio_servicios_personal WHERE empresa=p.empresa ORDER BY id)),
 'turnos',(SELECT json_group_array(json_array(empleado,revision)) FROM (SELECT empleado,MAX(revision) AS revision FROM comercio_turnos_laborales WHERE empresa=p.empresa GROUP BY empleado ORDER BY empleado)),
 'recursos',(SELECT json_group_array(json_array(id,revision,activo)) FROM (SELECT id,revision,activo FROM comercio_recursos_laborales WHERE empresa=p.empresa ORDER BY id))) AS evidencia
 FROM comercio_perfiles_privados p JOIN empresas e ON e.id=p.empresa JOIN central_implementaciones i ON i.empresa=p.empresa
 LEFT JOIN comercial_contratos_iniciales k ON k.empresa=p.empresa
 LEFT JOIN comercial_suscripciones s ON s.empresa=p.empresa
 LEFT JOIN comercial_planes pl ON pl.id=COALESCE(s.plan,k.plan) AND pl.version=COALESCE(s.version,k.version)
 LEFT JOIN comercial_activaciones ac ON ac.empresa=p.empresa;
CREATE TABLE central_entrega_revisiones(
 empresa TEXT NOT NULL REFERENCES empresas(id),
 revision INTEGER NOT NULL CHECK(revision>=1),
 validacion INTEGER NOT NULL,
 estado TEXT NOT NULL CHECK(estado IN ('solicitada','correccion','rechazada','aprobada','entregada')),
 motivo TEXT NOT NULL CHECK(length(motivo)<=1000),
 propietario TEXT REFERENCES usuarios(id),
 operador TEXT REFERENCES central_operadores(id),
 fecha INTEGER NOT NULL CHECK(fecha>=0),
 PRIMARY KEY(empresa,revision),
 FOREIGN KEY(empresa,validacion) REFERENCES comercio_asistente_validaciones(empresa,revision),
 CHECK((estado='solicitada' AND propietario IS NOT NULL AND operador IS NULL) OR (estado<>'solicitada' AND propietario IS NULL AND operador IS NOT NULL))
);
CREATE TRIGGER central_entrega_secuencia BEFORE INSERT ON central_entrega_revisiones
WHEN NEW.revision<>(SELECT COALESCE(MAX(revision),0)+1 FROM central_entrega_revisiones WHERE empresa=NEW.empresa)
OR (NEW.estado='solicitada' AND COALESCE((SELECT estado FROM central_entrega_revisiones WHERE empresa=NEW.empresa ORDER BY revision DESC LIMIT 1),'correccion') NOT IN ('correccion','rechazada'))
OR (NEW.estado IN ('correccion','rechazada','aprobada') AND NOT EXISTS(SELECT 1 FROM central_entrega_revisiones WHERE empresa=NEW.empresa AND revision=NEW.revision-1 AND estado='solicitada' AND validacion=NEW.validacion))
OR (NEW.estado='entregada' AND NOT EXISTS(SELECT 1 FROM central_entrega_revisiones WHERE empresa=NEW.empresa AND revision=NEW.revision-1 AND estado='aprobada' AND validacion=NEW.validacion))
BEGIN SELECT RAISE(ABORT,'Transicion de entrega invalida'); END;
CREATE TRIGGER central_entrega_evidencia BEFORE INSERT ON central_entrega_revisiones
WHEN NEW.estado IN ('aprobada','entregada') AND NOT EXISTS(
 SELECT 1 FROM comercio_asistente_validaciones v JOIN comercio_evidencia_entrega e ON e.empresa=v.empresa
 WHERE v.empresa=NEW.empresa AND v.revision=NEW.validacion AND v.revision=(SELECT MAX(revision) FROM comercio_asistente_validaciones WHERE empresa=NEW.empresa)
 AND v.evidencia=e.evidencia AND json_extract(v.resultado,'$.preparado')=1 AND json_array_length(v.resultado,'$.bloqueos')=0)
BEGIN SELECT RAISE(ABORT,'Evidencia de entrega invalida'); END;
CREATE TRIGGER central_entrega_no_update BEFORE UPDATE ON central_entrega_revisiones BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER central_entrega_no_delete BEFORE DELETE ON central_entrega_revisiones BEGIN SELECT RAISE(ABORT,'Historial protegido'); END;
CREATE TRIGGER central_implementacion_entrega_alta BEFORE INSERT ON central_implementaciones WHEN NEW.estado='entregada' BEGIN SELECT RAISE(ABORT,'Entrega requiere revision'); END;
CREATE TRIGGER central_implementacion_entrega_cambio BEFORE UPDATE ON central_implementaciones
WHEN (OLD.estado='entregada' AND NEW.estado<>OLD.estado) OR (NEW.estado='entregada' AND OLD.estado<>'entregada' AND NOT EXISTS(
 SELECT 1 FROM central_entrega_revisiones r JOIN comercio_asistente_validaciones v ON v.empresa=r.empresa AND v.revision=r.validacion JOIN comercio_evidencia_entrega e ON e.empresa=r.empresa
 WHERE r.empresa=OLD.empresa AND r.estado='entregada' AND r.revision=(SELECT MAX(revision) FROM central_entrega_revisiones WHERE empresa=OLD.empresa) AND v.evidencia=e.evidencia AND json_extract(v.resultado,'$.preparado')=1))
BEGIN SELECT RAISE(ABORT,'Entrega requiere revision vigente'); END;
