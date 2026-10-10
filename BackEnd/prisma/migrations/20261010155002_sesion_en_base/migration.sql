-- CreateTable
CREATE TABLE "SesionRevocada" (
    "jti" VARCHAR(64) NOT NULL,
    "expira" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SesionRevocada_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "IntentoLogin" (
    "clave" VARCHAR(320) NOT NULL,
    "n" INTEGER NOT NULL,
    "desde" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IntentoLogin_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE INDEX "SesionRevocada_expira_idx" ON "SesionRevocada"("expira");

-- CreateIndex
CREATE INDEX "IntentoLogin_desde_idx" ON "IntentoLogin"("desde");
