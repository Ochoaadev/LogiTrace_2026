-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('REGISTRADO', 'EN_PREPARACION', 'LISTO_PARA_DESPACHO', 'EN_RUTA', 'ENTREGADO', 'CON_INCIDENCIA', 'DEVUELTO', 'CERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PrioridadPedido" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "MetodoEntrega" AS ENUM ('DOMICILIO', 'RETIRO_EN_ESTABLECIMIENTO');

-- CreateEnum
CREATE TYPE "EstadoRepartidor" AS ENUM ('DISPONIBLE', 'EN_RUTA', 'NO_DISPONIBLE', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoDespacho" AS ENUM ('PROGRAMADO', 'PREPARANDO', 'EN_RUTA', 'CON_INCIDENCIA', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoDespachoPedido" AS ENUM ('PENDIENTE', 'EN_RUTA', 'EN_ESPERA', 'ENTREGADO', 'CON_INCIDENCIA', 'DEVUELTO', 'REPROGRAMADO');

-- CreateEnum
CREATE TYPE "EstadoRuta" AS ENUM ('PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoVehiculo" AS ENUM ('MOTO', 'VEHICULO_LIVIANO', 'FURGON', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoUbicacionAlmacen" AS ENUM ('CAVA', 'ALMACEN', 'PREPARACION', 'RECEPCION', 'CUARENTENA', 'DESCARTE', 'OTRA');

-- CreateEnum
CREATE TYPE "EstadoCalidadLote" AS ENUM ('DISPONIBLE', 'CUARENTENA', 'NO_APTO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE', 'REINGRESO', 'TRASLADO', 'DESCARTE');

-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('ABIERTA', 'EN_GESTION', 'RESUELTA', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoDevolucion" AS ENUM ('SOLICITADA', 'EN_TRASLADO', 'RECIBIDA', 'EVALUADA', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoProductoRetornado" AS ENUM ('APTO_PARA_VENTA', 'DETERIORADO', 'NO_APTO_PARA_VENTA');

-- CreateEnum
CREATE TYPE "DecisionDevolucion" AS ENUM ('REINGRESO', 'CUARENTENA', 'DESCARTE');

-- CreateEnum
CREATE TYPE "TipoRegistroTemperatura" AS ENUM ('CAVA', 'VEHICULO_SALIDA', 'RECEPCION_DEVOLUCION', 'OTRA');

-- CreateEnum
CREATE TYPE "TipoGestorResiduo" AS ENUM ('INTERNO', 'EXTERNO');

-- CreateEnum
CREATE TYPE "EstadoResiduo" AS ENUM ('REGISTRADO', 'EN_ALMACENAMIENTO', 'RETIRADO', 'DISPOSICION_FINAL', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoEventoTrazabilidad" AS ENUM ('PEDIDO_CREADO', 'PEDIDO_ACTUALIZADO', 'ESTADO_PEDIDO_CAMBIADO', 'PEDIDO_PREPARADO', 'DESPACHO_CREADO', 'DESPACHO_ASIGNADO', 'SALIDA_DESPACHO', 'UBICACION_ACTUALIZADA', 'ENTREGA_REGISTRADA', 'INCIDENCIA_REGISTRADA', 'INCIDENCIA_RESUELTA', 'DEVOLUCION_REGISTRADA', 'DEVOLUCION_RECIBIDA', 'PRODUCTO_EVALUADO', 'INVENTARIO_ACTUALIZADO', 'RESIDUO_REGISTRADO', 'DEVOLUCION_CERRADA', 'TRAZABILIDAD_CERRADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "documento" VARCHAR(30),
    "email" VARCHAR(120) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repartidor" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "telefono" VARCHAR(30),
    "numeroLicencia" VARCHAR(30),
    "estado" "EstadoRepartidor" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Repartidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "razonSocial" VARCHAR(150) NOT NULL,
    "nombreContacto" VARCHAR(120),
    "tipoDocumento" VARCHAR(20),
    "numeroDocumento" VARCHAR(30),
    "telefono" VARCHAR(30),
    "email" VARCHAR(120),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZonaDespacho" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "municipio" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ZonaDespacho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruta" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "zonaId" UUID,
    "fecha" DATE NOT NULL,
    "estado" "EstadoRuta" NOT NULL DEFAULT 'PROGRAMADA',
    "horaInicio" TIME(0),
    "horaFin" TIME(0),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Ruta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "tipo" "TipoVehiculo" NOT NULL,
    "placa" VARCHAR(20),
    "descripcion" TEXT,
    "capacidadCarga" DECIMAL(10,2),
    "unidadCapacidad" VARCHAR(20),
    "esTermico" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "unidadBase" VARCHAR(20) NOT NULL,
    "esPerecedero" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "productoId" UUID NOT NULL,
    "fechaProduccion" DATE,
    "fechaVencimiento" DATE,
    "estadoCalidad" "EstadoCalidadLote" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UbicacionAlmacen" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" "TipoUbicacionAlmacen" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UbicacionAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventario" (
    "id" UUID NOT NULL,
    "loteId" UUID NOT NULL,
    "ubicacionId" UUID NOT NULL,
    "stockActual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stockMinimo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" UUID NOT NULL,
    "tipo" "TipoMovimientoInventario" NOT NULL,
    "loteId" UUID NOT NULL,
    "ubicacionOrigenId" UUID,
    "ubicacionDestinoId" UUID,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "unidad" VARCHAR(20) NOT NULL,
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" UUID NOT NULL,
    "referenciaTipo" VARCHAR(30),
    "referenciaId" UUID,
    "observaciones" TEXT,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "clienteId" UUID NOT NULL,
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'REGISTRADO',
    "prioridad" "PrioridadPedido" NOT NULL DEFAULT 'NORMAL',
    "metodoEntrega" "MetodoEntrega" NOT NULL DEFAULT 'DOMICILIO',
    "zonaId" UUID,
    "direccionEntrega" TEXT NOT NULL,
    "referenciaEntrega" VARCHAR(180),
    "latitudEntrega" DECIMAL(9,6),
    "longitudEntrega" DECIMAL(9,6),
    "telefonoContacto" VARCHAR(30),
    "total" DECIMAL(10,2),
    "observaciones" TEXT,
    "creadoPorId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetallePedido" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "productoId" UUID NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "unidad" VARCHAR(20) NOT NULL,
    "precioUnitario" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2),
    "observaciones" TEXT,

    CONSTRAINT "DetallePedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Despacho" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "rutaId" UUID,
    "repartidorId" UUID,
    "vehiculoId" UUID,
    "estado" "EstadoDespacho" NOT NULL DEFAULT 'PROGRAMADO',
    "fechaHoraSalida" TIMESTAMPTZ(3),
    "fechaHoraCierre" TIMESTAMPTZ(3),
    "medioConservacion" VARCHAR(80),
    "precintoSeguridad" VARCHAR(50),
    "observaciones" TEXT,

    CONSTRAINT "Despacho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DespachoPedido" (
    "id" UUID NOT NULL,
    "despachoId" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "ordenParada" INTEGER NOT NULL,
    "estado" "EstadoDespachoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "horaLlegada" TIMESTAMPTZ(3),
    "horaEntrega" TIMESTAMPTZ(3),
    "receptor" VARCHAR(120),
    "observaciones" TEXT,

    CONSTRAINT "DespachoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleDespacho" (
    "id" UUID NOT NULL,
    "despachoPedidoId" UUID NOT NULL,
    "detallePedidoId" UUID NOT NULL,
    "loteId" UUID NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "unidad" VARCHAR(20) NOT NULL,

    CONSTRAINT "DetalleDespacho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UbicacionGPS" (
    "id" UUID NOT NULL,
    "despachoId" UUID NOT NULL,
    "repartidorId" UUID NOT NULL,
    "latitud" DECIMAL(9,6) NOT NULL,
    "longitud" DECIMAL(9,6) NOT NULL,
    "precisionMetros" DECIMAL(8,2),
    "velocidadKmh" DECIMAL(8,2),
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UbicacionGPS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoIncidencia" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TipoIncidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incidencia" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "despachoPedidoId" UUID NOT NULL,
    "tipoIncidenciaId" UUID NOT NULL,
    "reportadoPorId" UUID NOT NULL,
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitud" DECIMAL(9,6),
    "longitud" DECIMAL(9,6),
    "descripcion" TEXT NOT NULL,
    "decisionOperativa" TEXT,
    "estado" "EstadoIncidencia" NOT NULL DEFAULT 'ABIERTA',
    "resueltaPorId" UUID,
    "fechaResolucion" TIMESTAMPTZ(3),

    CONSTRAINT "Incidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotivoDevolucion" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MotivoDevolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devolucion" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "despachoPedidoId" UUID NOT NULL,
    "incidenciaId" UUID,
    "motivoId" UUID NOT NULL,
    "estado" "EstadoDevolucion" NOT NULL DEFAULT 'SOLICITADA',
    "fechaRegistro" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRecepcion" TIMESTAMPTZ(3),
    "recibidoPorId" UUID,
    "observaciones" TEXT,

    CONSTRAINT "Devolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleDevolucion" (
    "id" UUID NOT NULL,
    "devolucionId" UUID NOT NULL,
    "detallePedidoId" UUID NOT NULL,
    "loteId" UUID NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "unidad" VARCHAR(20) NOT NULL,
    "estadoProducto" "EstadoProductoRetornado" NOT NULL,
    "decision" "DecisionDevolucion",

    CONSTRAINT "DetalleDevolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionDevolucion" (
    "id" UUID NOT NULL,
    "devolucionId" UUID NOT NULL,
    "registroTemperaturaId" UUID,
    "selloIntegro" BOOLEAN,
    "condicionEmpaque" TEXT,
    "observaciones" TEXT,
    "evaluadoPorId" UUID NOT NULL,
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluacionDevolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroTemperatura" (
    "id" UUID NOT NULL,
    "tipoRegistro" "TipoRegistroTemperatura" NOT NULL,
    "ubicacionId" UUID,
    "despachoId" UUID,
    "devolucionId" UUID,
    "temperaturaC" DECIMAL(5,2) NOT NULL,
    "metodo" VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" UUID NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "RegistroTemperatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoResiduo" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "unidadBase" VARCHAR(20) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TipoResiduo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GestorResiduo" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "tipo" "TipoGestorResiduo" NOT NULL,
    "contacto" TEXT,
    "ubicacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GestorResiduo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Residuo" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "tipoResiduoId" UUID NOT NULL,
    "devolucionId" UUID,
    "gestorId" UUID,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "unidad" VARCHAR(20) NOT NULL,
    "origen" VARCHAR(100),
    "estado" "EstadoResiduo" NOT NULL DEFAULT 'REGISTRADO',
    "fechaGeneracion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRetiro" TIMESTAMPTZ(3),
    "observaciones" TEXT,

    CONSTRAINT "Residuo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoTrazabilidad" (
    "id" UUID NOT NULL,
    "pedidoId" UUID,
    "usuarioId" UUID NOT NULL,
    "tipoEvento" "TipoEventoTrazabilidad" NOT NULL,
    "entidadTipo" VARCHAR(40) NOT NULL,
    "entidadId" UUID NOT NULL,
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estadoAnterior" VARCHAR(40),
    "estadoNuevo" VARCHAR(40),
    "descripcion" TEXT,
    "ubicacionGPSId" UUID,

    CONSTRAINT "EventoTrazabilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "accion" VARCHAR(80) NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "entidad" VARCHAR(50) NOT NULL,
    "entidadId" UUID,
    "fechaHora" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(45),
    "detalle" TEXT,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_codigo_key" ON "Usuario"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_documento_key" ON "Usuario"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "Usuario"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Repartidor_usuarioId_key" ON "Repartidor"("usuarioId");

-- CreateIndex
CREATE INDEX "Repartidor_estado_idx" ON "Repartidor"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigo_key" ON "Cliente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_numeroDocumento_key" ON "Cliente"("numeroDocumento");

-- CreateIndex
CREATE INDEX "Cliente_razonSocial_idx" ON "Cliente"("razonSocial");

-- CreateIndex
CREATE INDEX "Cliente_activo_idx" ON "Cliente"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "ZonaDespacho_codigo_key" ON "ZonaDespacho"("codigo");

-- CreateIndex
CREATE INDEX "ZonaDespacho_activo_idx" ON "ZonaDespacho"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Ruta_codigo_key" ON "Ruta"("codigo");

-- CreateIndex
CREATE INDEX "Ruta_fecha_idx" ON "Ruta"("fecha");

-- CreateIndex
CREATE INDEX "Ruta_estado_idx" ON "Ruta"("estado");

-- CreateIndex
CREATE INDEX "Ruta_zonaId_idx" ON "Ruta"("zonaId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_codigo_key" ON "Vehiculo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_placa_key" ON "Vehiculo"("placa");

-- CreateIndex
CREATE INDEX "Vehiculo_tipo_idx" ON "Vehiculo"("tipo");

-- CreateIndex
CREATE INDEX "Vehiculo_activo_idx" ON "Vehiculo"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_key" ON "Producto"("codigo");

-- CreateIndex
CREATE INDEX "Producto_nombre_idx" ON "Producto"("nombre");

-- CreateIndex
CREATE INDEX "Producto_activo_idx" ON "Producto"("activo");

-- CreateIndex
CREATE INDEX "Lote_fechaVencimiento_idx" ON "Lote"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "Lote_estadoCalidad_idx" ON "Lote"("estadoCalidad");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_productoId_codigo_key" ON "Lote"("productoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "UbicacionAlmacen_codigo_key" ON "UbicacionAlmacen"("codigo");

-- CreateIndex
CREATE INDEX "UbicacionAlmacen_tipo_idx" ON "UbicacionAlmacen"("tipo");

-- CreateIndex
CREATE INDEX "UbicacionAlmacen_activo_idx" ON "UbicacionAlmacen"("activo");

-- CreateIndex
CREATE INDEX "Inventario_ubicacionId_idx" ON "Inventario"("ubicacionId");

-- CreateIndex
CREATE INDEX "Inventario_stockActual_idx" ON "Inventario"("stockActual");

-- CreateIndex
CREATE UNIQUE INDEX "Inventario_loteId_ubicacionId_key" ON "Inventario"("loteId", "ubicacionId");

-- CreateIndex
CREATE INDEX "MovimientoInventario_loteId_fechaHora_idx" ON "MovimientoInventario"("loteId", "fechaHora");

-- CreateIndex
CREATE INDEX "MovimientoInventario_usuarioId_fechaHora_idx" ON "MovimientoInventario"("usuarioId", "fechaHora");

-- CreateIndex
CREATE INDEX "MovimientoInventario_tipo_fechaHora_idx" ON "MovimientoInventario"("tipo", "fechaHora");

-- CreateIndex
CREATE INDEX "MovimientoInventario_referenciaTipo_referenciaId_idx" ON "MovimientoInventario"("referenciaTipo", "referenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_codigo_key" ON "Pedido"("codigo");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");

-- CreateIndex
CREATE INDEX "Pedido_estado_idx" ON "Pedido"("estado");

-- CreateIndex
CREATE INDEX "Pedido_fechaHora_idx" ON "Pedido"("fechaHora");

-- CreateIndex
CREATE INDEX "Pedido_zonaId_idx" ON "Pedido"("zonaId");

-- CreateIndex
CREATE INDEX "DetallePedido_pedidoId_idx" ON "DetallePedido"("pedidoId");

-- CreateIndex
CREATE INDEX "DetallePedido_productoId_idx" ON "DetallePedido"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Despacho_codigo_key" ON "Despacho"("codigo");

-- CreateIndex
CREATE INDEX "Despacho_estado_idx" ON "Despacho"("estado");

-- CreateIndex
CREATE INDEX "Despacho_repartidorId_idx" ON "Despacho"("repartidorId");

-- CreateIndex
CREATE INDEX "Despacho_rutaId_idx" ON "Despacho"("rutaId");

-- CreateIndex
CREATE INDEX "Despacho_fechaHoraSalida_idx" ON "Despacho"("fechaHoraSalida");

-- CreateIndex
CREATE INDEX "DespachoPedido_pedidoId_idx" ON "DespachoPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "DespachoPedido_estado_idx" ON "DespachoPedido"("estado");

-- CreateIndex
CREATE INDEX "DespachoPedido_despachoId_ordenParada_idx" ON "DespachoPedido"("despachoId", "ordenParada");

-- CreateIndex
CREATE UNIQUE INDEX "DespachoPedido_despachoId_pedidoId_key" ON "DespachoPedido"("despachoId", "pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "DespachoPedido_despachoId_ordenParada_key" ON "DespachoPedido"("despachoId", "ordenParada");

-- CreateIndex
CREATE INDEX "DetalleDespacho_despachoPedidoId_idx" ON "DetalleDespacho"("despachoPedidoId");

-- CreateIndex
CREATE INDEX "DetalleDespacho_detallePedidoId_idx" ON "DetalleDespacho"("detallePedidoId");

-- CreateIndex
CREATE INDEX "DetalleDespacho_loteId_idx" ON "DetalleDespacho"("loteId");

-- CreateIndex
CREATE INDEX "UbicacionGPS_despachoId_fechaHora_idx" ON "UbicacionGPS"("despachoId", "fechaHora");

-- CreateIndex
CREATE INDEX "UbicacionGPS_repartidorId_fechaHora_idx" ON "UbicacionGPS"("repartidorId", "fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "TipoIncidencia_codigo_key" ON "TipoIncidencia"("codigo");

-- CreateIndex
CREATE INDEX "TipoIncidencia_activo_idx" ON "TipoIncidencia"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Incidencia_codigo_key" ON "Incidencia"("codigo");

-- CreateIndex
CREATE INDEX "Incidencia_despachoPedidoId_idx" ON "Incidencia"("despachoPedidoId");

-- CreateIndex
CREATE INDEX "Incidencia_tipoIncidenciaId_idx" ON "Incidencia"("tipoIncidenciaId");

-- CreateIndex
CREATE INDEX "Incidencia_estado_idx" ON "Incidencia"("estado");

-- CreateIndex
CREATE INDEX "Incidencia_fechaHora_idx" ON "Incidencia"("fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "MotivoDevolucion_codigo_key" ON "MotivoDevolucion"("codigo");

-- CreateIndex
CREATE INDEX "MotivoDevolucion_activo_idx" ON "MotivoDevolucion"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Devolucion_codigo_key" ON "Devolucion"("codigo");

-- CreateIndex
CREATE INDEX "Devolucion_despachoPedidoId_idx" ON "Devolucion"("despachoPedidoId");

-- CreateIndex
CREATE INDEX "Devolucion_incidenciaId_idx" ON "Devolucion"("incidenciaId");

-- CreateIndex
CREATE INDEX "Devolucion_motivoId_idx" ON "Devolucion"("motivoId");

-- CreateIndex
CREATE INDEX "Devolucion_estado_idx" ON "Devolucion"("estado");

-- CreateIndex
CREATE INDEX "Devolucion_fechaRegistro_idx" ON "Devolucion"("fechaRegistro");

-- CreateIndex
CREATE INDEX "DetalleDevolucion_devolucionId_idx" ON "DetalleDevolucion"("devolucionId");

-- CreateIndex
CREATE INDEX "DetalleDevolucion_detallePedidoId_idx" ON "DetalleDevolucion"("detallePedidoId");

-- CreateIndex
CREATE INDEX "DetalleDevolucion_loteId_idx" ON "DetalleDevolucion"("loteId");

-- CreateIndex
CREATE INDEX "DetalleDevolucion_estadoProducto_idx" ON "DetalleDevolucion"("estadoProducto");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionDevolucion_devolucionId_key" ON "EvaluacionDevolucion"("devolucionId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionDevolucion_registroTemperaturaId_key" ON "EvaluacionDevolucion"("registroTemperaturaId");

-- CreateIndex
CREATE INDEX "EvaluacionDevolucion_evaluadoPorId_idx" ON "EvaluacionDevolucion"("evaluadoPorId");

-- CreateIndex
CREATE INDEX "EvaluacionDevolucion_registroTemperaturaId_idx" ON "EvaluacionDevolucion"("registroTemperaturaId");

-- CreateIndex
CREATE INDEX "EvaluacionDevolucion_fechaHora_idx" ON "EvaluacionDevolucion"("fechaHora");

-- CreateIndex
CREATE INDEX "RegistroTemperatura_ubicacionId_fechaHora_idx" ON "RegistroTemperatura"("ubicacionId", "fechaHora");

-- CreateIndex
CREATE INDEX "RegistroTemperatura_despachoId_fechaHora_idx" ON "RegistroTemperatura"("despachoId", "fechaHora");

-- CreateIndex
CREATE INDEX "RegistroTemperatura_devolucionId_fechaHora_idx" ON "RegistroTemperatura"("devolucionId", "fechaHora");

-- CreateIndex
CREATE INDEX "RegistroTemperatura_usuarioId_fechaHora_idx" ON "RegistroTemperatura"("usuarioId", "fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "TipoResiduo_codigo_key" ON "TipoResiduo"("codigo");

-- CreateIndex
CREATE INDEX "TipoResiduo_activo_idx" ON "TipoResiduo"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "GestorResiduo_codigo_key" ON "GestorResiduo"("codigo");

-- CreateIndex
CREATE INDEX "GestorResiduo_tipo_idx" ON "GestorResiduo"("tipo");

-- CreateIndex
CREATE INDEX "GestorResiduo_activo_idx" ON "GestorResiduo"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Residuo_codigo_key" ON "Residuo"("codigo");

-- CreateIndex
CREATE INDEX "Residuo_tipoResiduoId_idx" ON "Residuo"("tipoResiduoId");

-- CreateIndex
CREATE INDEX "Residuo_devolucionId_idx" ON "Residuo"("devolucionId");

-- CreateIndex
CREATE INDEX "Residuo_gestorId_idx" ON "Residuo"("gestorId");

-- CreateIndex
CREATE INDEX "Residuo_estado_idx" ON "Residuo"("estado");

-- CreateIndex
CREATE INDEX "Residuo_fechaGeneracion_idx" ON "Residuo"("fechaGeneracion");

-- CreateIndex
CREATE INDEX "EventoTrazabilidad_pedidoId_fechaHora_idx" ON "EventoTrazabilidad"("pedidoId", "fechaHora");

-- CreateIndex
CREATE INDEX "EventoTrazabilidad_usuarioId_fechaHora_idx" ON "EventoTrazabilidad"("usuarioId", "fechaHora");

-- CreateIndex
CREATE INDEX "EventoTrazabilidad_entidadTipo_entidadId_fechaHora_idx" ON "EventoTrazabilidad"("entidadTipo", "entidadId", "fechaHora");

-- CreateIndex
CREATE INDEX "EventoTrazabilidad_tipoEvento_fechaHora_idx" ON "EventoTrazabilidad"("tipoEvento", "fechaHora");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_fechaHora_idx" ON "Auditoria"("usuarioId", "fechaHora");

-- CreateIndex
CREATE INDEX "Auditoria_modulo_fechaHora_idx" ON "Auditoria"("modulo", "fechaHora");

-- CreateIndex
CREATE INDEX "Auditoria_entidad_entidadId_idx" ON "Auditoria"("entidad", "entidadId");

-- AddForeignKey
ALTER TABLE "Repartidor" ADD CONSTRAINT "Repartidor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruta" ADD CONSTRAINT "Ruta_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "ZonaDespacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "UbicacionAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_ubicacionOrigenId_fkey" FOREIGN KEY ("ubicacionOrigenId") REFERENCES "UbicacionAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_ubicacionDestinoId_fkey" FOREIGN KEY ("ubicacionDestinoId") REFERENCES "UbicacionAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "ZonaDespacho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePedido" ADD CONSTRAINT "DetallePedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetallePedido" ADD CONSTRAINT "DetallePedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despacho" ADD CONSTRAINT "Despacho_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despacho" ADD CONSTRAINT "Despacho_repartidorId_fkey" FOREIGN KEY ("repartidorId") REFERENCES "Repartidor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despacho" ADD CONSTRAINT "Despacho_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DespachoPedido" ADD CONSTRAINT "DespachoPedido_despachoId_fkey" FOREIGN KEY ("despachoId") REFERENCES "Despacho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DespachoPedido" ADD CONSTRAINT "DespachoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDespacho" ADD CONSTRAINT "DetalleDespacho_despachoPedidoId_fkey" FOREIGN KEY ("despachoPedidoId") REFERENCES "DespachoPedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDespacho" ADD CONSTRAINT "DetalleDespacho_detallePedidoId_fkey" FOREIGN KEY ("detallePedidoId") REFERENCES "DetallePedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDespacho" ADD CONSTRAINT "DetalleDespacho_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UbicacionGPS" ADD CONSTRAINT "UbicacionGPS_despachoId_fkey" FOREIGN KEY ("despachoId") REFERENCES "Despacho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UbicacionGPS" ADD CONSTRAINT "UbicacionGPS_repartidorId_fkey" FOREIGN KEY ("repartidorId") REFERENCES "Repartidor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_despachoPedidoId_fkey" FOREIGN KEY ("despachoPedidoId") REFERENCES "DespachoPedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_tipoIncidenciaId_fkey" FOREIGN KEY ("tipoIncidenciaId") REFERENCES "TipoIncidencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_reportadoPorId_fkey" FOREIGN KEY ("reportadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_resueltaPorId_fkey" FOREIGN KEY ("resueltaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucion" ADD CONSTRAINT "Devolucion_despachoPedidoId_fkey" FOREIGN KEY ("despachoPedidoId") REFERENCES "DespachoPedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucion" ADD CONSTRAINT "Devolucion_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "Incidencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucion" ADD CONSTRAINT "Devolucion_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "MotivoDevolucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucion" ADD CONSTRAINT "Devolucion_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDevolucion" ADD CONSTRAINT "DetalleDevolucion_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "Devolucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDevolucion" ADD CONSTRAINT "DetalleDevolucion_detallePedidoId_fkey" FOREIGN KEY ("detallePedidoId") REFERENCES "DetallePedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDevolucion" ADD CONSTRAINT "DetalleDevolucion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionDevolucion" ADD CONSTRAINT "EvaluacionDevolucion_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "Devolucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionDevolucion" ADD CONSTRAINT "EvaluacionDevolucion_registroTemperaturaId_fkey" FOREIGN KEY ("registroTemperaturaId") REFERENCES "RegistroTemperatura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionDevolucion" ADD CONSTRAINT "EvaluacionDevolucion_evaluadoPorId_fkey" FOREIGN KEY ("evaluadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroTemperatura" ADD CONSTRAINT "RegistroTemperatura_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "UbicacionAlmacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroTemperatura" ADD CONSTRAINT "RegistroTemperatura_despachoId_fkey" FOREIGN KEY ("despachoId") REFERENCES "Despacho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroTemperatura" ADD CONSTRAINT "RegistroTemperatura_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "Devolucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroTemperatura" ADD CONSTRAINT "RegistroTemperatura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Residuo" ADD CONSTRAINT "Residuo_tipoResiduoId_fkey" FOREIGN KEY ("tipoResiduoId") REFERENCES "TipoResiduo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Residuo" ADD CONSTRAINT "Residuo_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "Devolucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Residuo" ADD CONSTRAINT "Residuo_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "GestorResiduo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTrazabilidad" ADD CONSTRAINT "EventoTrazabilidad_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTrazabilidad" ADD CONSTRAINT "EventoTrazabilidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTrazabilidad" ADD CONSTRAINT "EventoTrazabilidad_ubicacionGPSId_fkey" FOREIGN KEY ("ubicacionGPSId") REFERENCES "UbicacionGPS"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
