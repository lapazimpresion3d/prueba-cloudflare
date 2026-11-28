-- COMMERCE_DB only. Central-authorized onboarding; owner binds by verified OIDC.
CREATE TABLE comercio_altas_pendientes(
 id TEXT PRIMARY KEY, nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 1 AND 120),
 sucursal TEXT NOT NULL CHECK(length(sucursal) BETWEEN 1 AND 120),
 giro TEXT NOT NULL CHECK(giro IN ('restaurante','cafeteria','tienda','barberia','taller','otro')),
 plan TEXT NOT NULL, version INTEGER NOT NULL,
 emisor TEXT NOT NULL, sujeto TEXT NOT NULL,
 operador TEXT NOT NULL REFERENCES central_operadores(id),
 creado INTEGER NOT NULL, expira INTEGER NOT NULL CHECK(expira>creado),
 estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aceptada','cancelada')),
 empresa TEXT UNIQUE REFERENCES empresas(id),
 CHECK((estado='aceptada' AND empresa IS NOT NULL) OR (estado<>'aceptada' AND empresa IS NULL)),
 FOREIGN KEY(plan,version) REFERENCES comercial_planes(id,version)
);
CREATE INDEX comercio_altas_identidad ON comercio_altas_pendientes(emisor,sujeto,estado,expira);
CREATE TABLE comercio_perfiles_privados(
 empresa TEXT PRIMARY KEY REFERENCES empresas(id),
 giro TEXT NOT NULL CHECK(giro IN ('restaurante','cafeteria','tienda','barberia','taller','otro')),
 nombre_publico TEXT NOT NULL CHECK(length(nombre_publico) BETWEEN 1 AND 120),
 color TEXT NOT NULL DEFAULT '#334155' CHECK(length(color)=7),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1)
);
