-- Usuario de base de datos para la API de LogiTrace con los mínimos permisos.
--
-- La aplicación web nunca se conecta a PostgreSQL: solo la API, con la cadena DATABASE_URL del
-- servidor. Esa cadena NO debe usar el superusuario "postgres" ni el dueño de las tablas, sino este rol:
--   · puede leer y escribir datos (SELECT, INSERT, UPDATE, DELETE);
--   · NO puede crear, alterar ni borrar tablas, ni vaciarlas (TRUNCATE), ni crear otros roles;
--   · la tabla "Auditoria" queda en modo solo-añadir: ni la API comprometida puede borrar su rastro.
-- Las migraciones (npx prisma migrate deploy) se ejecutan aparte, con el usuario dueño del esquema.
--
-- Uso (como dueño de la base, una sola vez y tras cada migración que cree tablas nuevas):
--   psql -U postgres -d logitrace -v clave="'<contraseña fuerte>'" -f scripts/rol-base-datos.sql
-- y en el .env de producción:
--   DATABASE_URL="postgresql://logitrace_app:<contraseña>@<host>:5432/logitrace?schema=public&sslmode=require"

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'logitrace_app') THEN
    CREATE ROLE logitrace_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

ALTER ROLE logitrace_app WITH PASSWORD :clave;

SELECT format('GRANT CONNECT ON DATABASE %I TO logitrace_app', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO logitrace_app;
REVOKE CREATE ON SCHEMA public FROM logitrace_app;

-- Datos: lectura y escritura en todas las tablas actuales
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO logitrace_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO logitrace_app;

-- La tabla interna de migraciones de Prisma no la toca la API
REVOKE ALL ON TABLE public."_prisma_migrations" FROM logitrace_app;

-- Auditoría inmutable desde la aplicación
REVOKE UPDATE, DELETE ON TABLE public."Auditoria" FROM logitrace_app;

-- Búsquedas sin tildes (extensión unaccent, creada por la migración)
GRANT EXECUTE ON FUNCTION unaccent(text) TO logitrace_app;
