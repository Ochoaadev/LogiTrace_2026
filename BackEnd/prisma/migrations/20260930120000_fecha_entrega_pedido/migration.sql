-- Fecha de entrega solicitada por el cliente (opcional). La validación ya la aceptaba, pero la
-- columna no existía y registrar un pedido con fecha fallaba.
ALTER TABLE "Pedido" ADD COLUMN "fechaEntrega" DATE;
