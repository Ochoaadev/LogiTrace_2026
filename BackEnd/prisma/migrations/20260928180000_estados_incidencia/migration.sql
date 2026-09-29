-- Renombra los estados de incidencia: ABIERTA -> REPORTADA, EN_GESTION -> EN_REVISION,
-- y agrega EN_ATENCION. Reemplaza los scripts manuales update-incidencia.sql /
-- update-incidencia-estados.js, que nunca llegaron a aplicarse como migración.
BEGIN;
CREATE TYPE "EstadoIncidencia_new" AS ENUM ('REPORTADA', 'EN_REVISION', 'EN_ATENCION', 'RESUELTA', 'CERRADA', 'CANCELADA');
ALTER TABLE "Incidencia" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Incidencia" ALTER COLUMN "estado" TYPE "EstadoIncidencia_new" USING (
  CASE "estado"::text
    WHEN 'ABIERTA' THEN 'REPORTADA'
    WHEN 'EN_GESTION' THEN 'EN_REVISION'
    ELSE "estado"::text
  END
)::"EstadoIncidencia_new";
ALTER TYPE "EstadoIncidencia" RENAME TO "EstadoIncidencia_old";
ALTER TYPE "EstadoIncidencia_new" RENAME TO "EstadoIncidencia";
DROP TYPE "EstadoIncidencia_old";
ALTER TABLE "Incidencia" ALTER COLUMN "estado" SET DEFAULT 'REPORTADA';
COMMIT;
