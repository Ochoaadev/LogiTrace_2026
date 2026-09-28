-- Add new enum values to the existing enum
ALTER TYPE "EstadoIncidencia" ADD VALUE IF NOT EXISTS 'REPORTADA';
ALTER TYPE "EstadoIncidencia" ADD VALUE IF NOT EXISTS 'EN_REVISION';
ALTER TYPE "EstadoIncidencia" ADD VALUE IF NOT EXISTS 'EN_ATENCION';

-- Update existing records
UPDATE "Incidencia" SET estado = 'REPORTADA' WHERE estado = 'ABIERTA';
UPDATE "Incidencia" SET estado = 'EN_REVISION' WHERE estado = 'EN_GESTION';