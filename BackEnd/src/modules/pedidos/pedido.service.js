const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

function generateCodigo() {
  const fecha = new Date()
  const yymmdd = fecha.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `PED-${yymmdd}-${random}`
}

function calculateEstadoSiguiente(estadoActual, accion) {
  const transiciones = {
    REGISTRADO: { preparar: 'EN_PREPARACION', cancelar: 'CANCELADO' },
    EN_PREPARACION: { listo: 'LISTO_PARA_DESPACHO', cancelar: 'CANCELADO' },
    LISTO_PARA_DESPACHO: { despachar: 'EN_RUTA', cancelar: 'CANCELADO' },
    EN_RUTA: { entregar: 'ENTREGADO', incidencia: 'CON_INCIDENCIA' },
    CON_INCIDENCIA: { resolver: 'EN_RUTA', devolver: 'DEVUELTO' },
    ENTREGADO: { cerrar: 'CERRADO', devolver: 'DEVUELTO' },
    DEVUELTO: { evaluar: 'CERRADO' },
    CERRADO: {},
    CANCELADO: {},
  }
  return transiciones[estadoActual]?.[accion] || null
}

async function listPedidos(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, prioridad, clienteId, zonaId, fechaDesde, fechaHasta, search } = query

  const where = {}

  if (estado) where.estado = estado
  if (prioridad) where.prioridad = prioridad
  if (clienteId) where.clienteId = clienteId
  if (zonaId) where.zonaId = zonaId
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {}
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta)
  }
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { cliente: { razonSocial: { contains: search, mode: 'insensitive' } } },
      { direccionEntrega: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaHora: 'desc' },
      include: {
        cliente: { select: { id: true, codigo: true, razonSocial: true } },
        zona: { select: { id: true, codigo: true, nombre: true } },
        creadoPor: { select: { id: true, nombre: true, codigo: true } },
        _count: { select: { detalles: true, despachos: true } },
      },
    }),
    prisma.pedido.count({ where }),
  ])

  return { data: pedidos, total, page, limit }
}

async function getPedidoById(id) {
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      zona: true,
      creadoPor: { select: { id: true, nombre: true, codigo: true } },
      detalles: {
        include: {
          producto: { select: { id: true, codigo: true, nombre: true, unidadBase: true, esPerecedero: true } },
          detallesDespacho: { include: { lote: true } },
        },
      },
      despachos: {
        include: {
          despacho: {
            include: {
              repartidor: { include: { usuario: { select: { nombre: true } } } },
              vehiculo: { select: { codigo: true, placa: true } },
            },
          },
        },
      },
      
      eventos: { orderBy: { fechaHora: 'desc' }, take: 20 },
    },
  })
  if (!pedido) throw new Error('Pedido no encontrado')
  return pedido
}

async function createPedido(data, usuarioId) {
  const { clienteId, items, ...rest } = data

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
  if (!cliente) throw new Error('Cliente no encontrado')
  if (!cliente.activo) throw new Error('Cliente inactivo')

  for (const item of items) {
    const producto = await prisma.producto.findUnique({ where: { id: item.productoId } })
    if (!producto) throw new Error(`Producto ${item.productoId} no encontrado`)
    if (!producto.activo) throw new Error(`Producto ${producto.nombre} inactivo`)
  }

  const codigo = generateCodigo()

  const pedido = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.pedido.create({
      data: {
        codigo,
        clienteId,
        creadoPorId: usuarioId,
        ...rest,
      },
    })

    for (const item of items) {
      await tx.detallePedido.create({
        data: {
          pedidoId: nuevo.id,
          productoId: item.productoId,
          cantidad: item.cantidad,
          unidad: item.unidad || 'unidad',
          observaciones: item.observaciones,
        },
      })
    }

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: nuevo.id,
        usuarioId,
        tipoEvento: 'PEDIDO_CREADO',
        entidadTipo: 'Pedido',
        entidadId: nuevo.id,
        estadoNuevo: 'REGISTRADO',
        descripcion: `Pedido creado con ${items.length} item(s)`,
      },
    })

    return nuevo
  })

  return getPedidoById(pedido.id)
}

async function updatePedido(id, data) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido no encontrado')

  if (['ENTREGADO', 'CERRADO', 'CANCELADO', 'DEVUELTO'].includes(pedido.estado)) {
    throw new Error('No se puede modificar un pedido en estado final')
  }

  const { items, ...rest } = data

  const updated = await prisma.$transaction(async (tx) => {
    if (items && items.length > 0) {
      await tx.detallePedido.deleteMany({ where: { pedidoId: id } })
      for (const item of items) {
        await tx.detallePedido.create({
          data: {
            pedidoId: id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            unidad: item.unidad || 'unidad',
            observaciones: item.observaciones,
          },
        })
      }
    }

    return tx.pedido.update({
      where: { id },
      data: rest,
    })
  })

  return getPedidoById(updated.id)
}

async function changeEstado(id, nuevoEstado, usuarioId, observaciones) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido no encontrado')

  const estadoActual = pedido.estado

  const transicionesValidas = {
    REGISTRADO: ['EN_PREPARACION', 'CANCELADO'],
    EN_PREPARACION: ['LISTO_PARA_DESPACHO', 'CANCELADO'],
    LISTO_PARA_DESPACHO: ['EN_RUTA', 'CANCELADO'],
    EN_RUTA: ['ENTREGADO', 'CON_INCIDENCIA'],
    CON_INCIDENCIA: ['EN_RUTA', 'DEVUELTO'],
    ENTREGADO: ['CERRADO', 'DEVUELTO'],
    DEVUELTO: ['CERRADO'],
  }

  if (!transicionesValidas[estadoActual]?.includes(nuevoEstado)) {
    throw new Error(`Transición inválida: ${estadoActual} → ${nuevoEstado}`)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = { estado: nuevoEstado }

    const p = await tx.pedido.update({ where: { id }, data })

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: id,
        usuarioId,
        tipoEvento: 'ESTADO_PEDIDO_CAMBIADO',
        entidadTipo: 'Pedido',
        entidadId: id,
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
        descripcion: observaciones || `Estado cambiado de ${estadoActual} a ${nuevoEstado}`,
      },
    })

    return p
  })

  return getPedidoById(updated.id)
}

async function prepararPedido(id, usuarioId) {
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { detalles: { include: { producto: true } } },
  })
  if (!pedido) throw new Error('Pedido no encontrado')
  if (pedido.estado !== 'REGISTRADO') throw new Error('Solo se puede preparar desde REGISTRADO')

  for (const detalle of pedido.detalles) {
    if (detalle.producto.esPerecedero) {
      const stock = await prisma.inventario.aggregate({
        where: { lote: { productoId: detalle.productoId }, stockActual: { gt: 0 } },
        _sum: { stockActual: true },
      })
      if (!stock._sum.stockActual || stock._sum.stockActual < detalle.cantidad) {
        throw new Error(`Stock insuficiente para ${detalle.producto.nombre}`)
      }
    }
  }

  return changeEstado(id, 'EN_PREPARACION', usuarioId, 'Preparación iniciada')
}

async function listoParaDespacho(id, usuarioId, itemsPreparados) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido no encontrado')
  if (pedido.estado !== 'EN_PREPARACION') throw new Error('Solo desde EN_PREPARACION')

  await prisma.$transaction(async (tx) => {
    if (itemsPreparados && itemsPreparados.length > 0) {
      for (const item of itemsPreparados) {
        const lote = await tx.lote.findUnique({ where: { id: item.loteId } })
        if (!lote) throw new Error(`Lote ${item.loteId} no encontrado`)

        const inventario = await tx.inventario.findUnique({
          where: { loteId_ubicacionId: { loteId: item.loteId, ubicacionId: item.ubicacionId } },
        })
        if (!inventario || inventario.stockActual < item.cantidad) {
          throw new Error(`Stock insuficiente en lote ${lote.codigo}`)
        }

        await tx.inventario.update({
          where: { loteId_ubicacionId: { loteId: item.loteId, ubicacionId: item.ubicacionId } },
          data: { stockActual: { decrement: item.cantidad } },
        })

        await tx.movimientoInventario.create({
          data: {
            tipo: 'SALIDA',
            loteId: item.loteId,
            ubicacionOrigenId: item.ubicacionId,
            cantidad: item.cantidad,
            unidad: item.unidad,
            usuarioId,
            referenciaTipo: 'Pedido',
            referenciaId: id,
            observaciones: `Preparación pedido ${pedido.codigo}`,
          },
        })
      }
    }

    await tx.pedido.update({
      where: { id },
      data: { estado: 'LISTO_PARA_DESPACHO' },
    })

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: id,
        usuarioId,
        tipoEvento: 'PEDIDO_PREPARADO',
        entidadTipo: 'Pedido',
        entidadId: id,
        estadoAnterior: 'EN_PREPARACION',
        estadoNuevo: 'LISTO_PARA_DESPACHO',
        descripcion: 'Pedido listo para despacho',
      },
    })
  })

  return getPedidoById(id)
}

async function deletePedido(id) {
  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) throw new Error('Pedido no encontrado')

  if (pedido.estado !== 'REGISTRADO' && pedido.estado !== 'CANCELADO') {
    throw new Error('Solo se puede eliminar en REGISTRADO o CANCELADO')
  }

  await prisma.$transaction(async (tx) => {
    await tx.detallePedido.deleteMany({ where: { pedidoId: id } })
    await tx.eventoTrazabilidad.deleteMany({ where: { pedidoId: id } })
    await tx.pedido.delete({ where: { id } })
  })

  return true
}

module.exports = {
  listPedidos,
  getPedidoById,
  createPedido,
  updatePedido,
  changeEstado,
  prepararPedido,
  listoParaDespacho,
  deletePedido,
  calculateEstadoSiguiente,
}