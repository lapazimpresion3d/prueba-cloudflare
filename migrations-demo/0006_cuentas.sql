CREATE TABLE IF NOT EXISTS demo_cuentas (
 sesion_id TEXT NOT NULL REFERENCES demo_sesiones(id) ON DELETE CASCADE,
 cuenta_id TEXT NOT NULL CHECK(length(cuenta_id)=36),
 mesa TEXT NOT NULL CHECK(mesa IN ('1','2','3','4','5')),
 personas INTEGER NOT NULL CHECK(personas BETWEEN 1 AND 8),
 abierto INTEGER NOT NULL,
 cerrado INTEGER,
 PRIMARY KEY(sesion_id,cuenta_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS demo_cuentas_mesa_abierta ON demo_cuentas(sesion_id,mesa) WHERE cerrado IS NULL;
