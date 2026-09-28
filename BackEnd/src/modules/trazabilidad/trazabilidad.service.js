const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

async function listTrazabilidad(query) {
  const { page, limit, skip } = getPagination(query)
  const { pedidoId, despachoId, incidenciaId, devolucionId, tipoEvento, fechaDesde, fechaHasta, usuarioId } = query

  const where = {}

  if (pedidoId) where.pedidoId = pedidoId
  if (despachoId) where.despachoId = despachoId
  if (incidenciaId) where.incidenciaId = incidenciaId
  if (devolucionId) where.devolucionId = devolucionId
  if (tipoEvento) where.tipoEvento = tipoEvento
  if (usuarioId) where.usuarioId = usuarioId
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {}
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta)
  }

  const [eventos, total] = await Promise.all([
    prisma.eventoTrazabilidad.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaHora: 'desc' },
      include: {
        pedido: { select: { id: true, codigo: true, cliente: { select: { razonSocial: true } } } },
        usuario: { select: { id: true, nombre: true, codigo: true, rol: true } },
        ubicacionGPS: { select: { id: true, latitud: true, longitud: true, fechaHora: true } },
      },
    }),
    prisma.eventoTrazabilidad.count({ where }),
  ])

  return { data: eventos, total, page, limit }
}

async function getTrazabilidadByPedido(pedidoId, query) {
  const { page, limit, skip } = getPagination(query)

  const [eventos, total] = await Promise.all([
    prisma.eventoTrazabilidad.findMany({
      where: { pedidoId },
      skip,
      take: limit,
      orderBy: { fechaHora: 'asc' },
      include: {
        usuario: { select: { id: true, nombre: true, codigo: true, rol: true } },
        ubicacionGPS: { select: { id: true, latitud: true, longitud: true, fechaHora: true, velocidadKmh: true } },
      },
    }),
    prisma.eventoTrazabilidad.count({ where: { pedidoId } }),
  ])

  return { data: eventos, total, page, limit }
}

async function getTrazabilidadByDespacho(despachoId, query) {
  const { page, limit, skip } = getPagination(query)

  const [eventos, total] = await Promise.all([
    prisma.eventoTrazabilidad.findMany({
      where: { despachoId },
      skip,
      take: limit,
      orderBy: { fechaHora: 'asc' },
      include: {
        usuario: { select: { id: true, nombre: true, codigo: true, rol: true } },
        ubicacionGPS: { select: { id: true, latitud: true, longitud: true, fechaHora: true, velocidadKmh: true } },
      },
    }),
    prisma.eventoTrazabilidad.count({ where: { despachoId } }),
  ])

  return { data: eventos, total, page, limit }
}

async function getTrazabilidadCompleta(pedidoId) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      cliente: { select: { id: true, codigo: true, razonSocial: true } },
      detalles: {
        include: {
          producto: { select: { id: true, codigo: true, nombre: true } },
          detallesDespacho: { include: { lote: true, despachoPedido: { include: { despacho: true } } } },
          detallesDevolucion: { include: { lote: true, devolucion: true } },
        },
      },
      despachos: {
        include: {
          despacho: {
            include: {
              repartidor: { include: { usuario: { select: { nombre: true } } } },
              vehiculo: { select: { codigo: true, placa: true } },
              pedidos: { include: { pedido: { select: { id: true, codigo: true } } } },
              ubicacionesGPS: { orderBy: { fechaHora: 'asc' }, take: 100 },
            },
          },
        },
      },
      eventos: {
        orderBy: { fechaHora: 'asc' },
        include: {
          usuario: { select: { nombre: true, rol: true } },
          ubicacionGPS: { select: { latitud: true, longitud: true, fechaHora: true } },
        },
      },
    },
  })

  if (!pedido) throw new Error('Pedido no encontrado')

  // Obtener incidencias y devoluciones a través de los despachos
  const despachoIds = pedido.despachos.map(d => d.despachoId)
  
  const [incidencias, devoluciones] = await Promise.all([
    prisma.incidencia.findMany({
      where: { despachoPedido: { despachoId: { in: despachoIds } } },
      include: {
        tipo: true,
        reportadoPor: { select: { nombre: true } },
        resueltaPor: { select: { nombre: true } },
        despachoPedido: { include: { despacho: { select: { codigo: true } } } },
      },
    }),
    prisma.devolucion.findMany({
      where: { despachoPedido: { despachoId: { in: despachoIds } } },
      include: {
        motivo: true,
        evaluacion: { include: { evaluadoPor: { select: { nombre: true } }, registroTemperatura: true } },
        detalles: { include: { lote: true, detallePedido: { include: { producto: true } } } },
        registrosTemp: { orderBy: { fechaHora: 'desc' } },
        residuos: { include: { tipoResiduo: true, gestor: true } },
      },
    })])

  return {
    ...pedido,
    incidencias,
    devoluciones,
  }
}

async function getTimeline(pedidoId) {
  const eventos = await prisma.eventoTrazabilidad.findMany({
    where: { pedidoId },
    orderBy: { fechaHora: 'asc' },
    include: {
      usuario: { select: { id: true, nombre: true, codigo: true, rol: true } },
      ubicacionGPS: { select: { latitud: true, longitud: true, fechaHora: true, velocidadKmh: true } },
    },
  })

  return eventos.map(e => ({
    id: e.id,
    fechaHora: e.fechaHora,
    tipoEvento: e.tipoEvento,
    entidadTipo: e.entidadTipo,
    entidadId: e.entidadId,
    estadoAnterior: e.estadoAnterior,
    estadoNuevo: e.estadoNuevo,
    descripcion: e.descripcion,
    usuario: e.usuario,
    despacho: e.despacho,
    incidencia: e.incidencia,
    devolucion: e.devolucion,
    ubicacion: e.ubicacionGPS ? { lat: e.ubicacionGPS.latitud, lng: e.ubicacionGPS.longitud, fechaHora: e.ubicacionGPS.fechaHora, velocidad: e.ubicacionGPS.velocidadKmh } : null,
  }))
}

async function getEstadisticasTrazabilidad(query) {
  const { fechaDesde, fechaHasta, usuarioId } = query

  const where = {}
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {}
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta)
  }
  if (usuarioId) where.usuarioId = usuarioId

  const [totalEventos, porTipo, porEntidad, porUsuario, ultimas24h] = await Promise.all([
    prisma.eventoTrazabilidad.count({ where }),
    prisma.eventoTrazabilidad.groupBy({
      by: ['tipoEvento'],
      where,
      _count: { _all: true },
    }),
    prisma.eventoTrazabilidad.groupBy({
      by: ['entidadTipo'],
      where,
      _count: { _all: true },
    }),
    prisma.eventoTrazabilidad.groupBy({
      by: ['usuarioId'],
      where,
      _count: { _all: true },
    }),
    prisma.eventoTrazabilidad.count({
      where: {
        ...where,
        fechaHora: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const tipoLabels = {
    PEDIDO_CREADO: 'Pedido Creado',
    PEDIDO_ACTUALIZADO: 'Pedido Actualizado',
    ESTADO_PEDIDO_CAMBIADO: 'Estado Pedido Cambiado',
    PEDIDO_PREPARADO: 'Pedido Preparado',
    DESPACHO_CREADO: 'Despacho Creado',
    DESPACHO_ASIGNADO: 'Despacho Asignado',
    SALIDA_DESPACHO: 'Salida Despacho',
    UBICACION_ACTUALIZADA: 'Ubicación Actualizada',
    ENTREGA_REGISTRADA: 'Entrega Registrada',
    INCIDENCIA_REGISTRADA: 'Incidencia Registrada',
    INCIDENCIA_RESUELTA: 'Incidencia Resuelta',
    DEVOLUCION_REGISTRADA: 'Devolución Registrada',
    DEVOLUCION_RECIBIDA: 'Devolución Recibida',
    PRODUCTO_EVALUADO: 'Producto Evaluado',
    INVENTARIO_ACTUALIZADO: 'Inventario Actualizado',
    RESIDUO_REGISTRADO: 'Residuo Registrado',
    DEVOLUCION_CERRADA: 'Devolución Cerrada',
    TRAZABILIDAD_CERRADA: 'Trazabilidad Cerrada',
  }

  return {
    totalEventos,
    porTipo: porTipo.map(t => ({ tipo: t.tipoEvento, label: tipoLabels[t.tipoEvento] || t.tipoEvento, count: t._count._all })),
    porEntidad: porEntidad.map(e => ({ entidad: e.entidadTipo, count: e._count._all })),
    porUsuario: porUsuario.map(u => ({ usuarioId: u.usuarioId, count: u._count._all })),
    ultimas24h,
  }
}

module.exports = {
  listTrazabilidad,
  getTrazabilidadByPedido,
  getTrazabilidadByDespacho,
  getTrazabilidadCompleta,
  getTimeline,
  getEstadisticasTrazabilidad,
}