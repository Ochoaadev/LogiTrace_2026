-- Centro de referencia de cada zona de despacho (para sugerir la zona según la ubicación del pedido)
ALTER TABLE "ZonaDespacho" ADD COLUMN "latitudCentro" DECIMAL(9,6),
ADD COLUMN "longitudCentro" DECIMAL(9,6);
