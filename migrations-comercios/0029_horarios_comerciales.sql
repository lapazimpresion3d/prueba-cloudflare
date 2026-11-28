-- COMMERCE_DB only. Unconfigured schedule is closed; no implicit opening.
ALTER TABLE comercio_perfiles_privados ADD COLUMN zona_horaria TEXT NOT NULL DEFAULT 'America/Mazatlan' CHECK(length(zona_horaria) BETWEEN 1 AND 100);
ALTER TABLE comercio_perfiles_privados ADD COLUMN horario_semanal TEXT NOT NULL DEFAULT '[[],[],[],[],[],[],[]]' CHECK(json_valid(horario_semanal) AND json_type(horario_semanal)='array' AND json_array_length(horario_semanal)=7 AND length(horario_semanal)<=5000);
ALTER TABLE comercio_perfiles_privados ADD COLUMN excepciones_horario TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(excepciones_horario) AND json_type(excepciones_horario)='object' AND length(excepciones_horario)<=50000);
