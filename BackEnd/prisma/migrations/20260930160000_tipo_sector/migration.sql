-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "tipoSectorId" UUID;

-- AlterTable
ALTER TABLE "ZonaDespacho" ADD COLUMN     "radioMetros" INTEGER;

-- CreateTable
CREATE TABLE "TipoSector" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "latitudCentro" DECIMAL(9,6),
    "longitudCentro" DECIMAL(9,6),
    "radioMetros" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TipoSector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoSector_codigo_key" ON "TipoSector"("codigo");

-- CreateIndex
CREATE INDEX "TipoSector_activo_idx" ON "TipoSector"("activo");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_tipoSectorId_fkey" FOREIGN KEY ("tipoSectorId") REFERENCES "TipoSector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

