const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

function generateCodigo() {
  const fecha = new Date()
  const yymmdd = fecha.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `DES-${yymmdd}-${random}`
}

async function listDespachos(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, repartidorId, rutaId, fechaDesde, fechaHasta, search } = query

  const where = {}

  if (estado) where.estado = estado
  if (repartidorId) where.repartidorId = repartidorId
  if (rutaId) where.rutaId = rutaId
  if (fechaDesde || fechaHasta) {
    where.fechaHoraSalida = {}
    if (fechaDesde) where.fechaHoraSalida.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaHoraSalida.lte = new Date(fechaHasta)
  }
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { repartidor: { usuario: { nombre: { contains: search, mode: 'insensitive' } } } },
      { vehiculo: { placa: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [despachos, total] = await Promise.all([
    prisma.despacho.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaHoraSalida: 'desc' },
      include: {
        ruta: { select: { id: true, codigo: true, nombre: true } },
        repartidor: {
          include: { usuario: { select: { id: true, nombre: true, codigo: true } } },
        },
        vehiculo: { select: { id: true, codigo: true, placa: true, tipo: true } },
        pedidos: {
          include: {
            pedido: {
              select: { id: true, codigo: true, cliente: { select: { razonSocial: true } }, direccionEntrega: true },
            },
          },
          orderBy: { ordenParada: 'asc' },
        },
        _count: { select: { ubicacionesGPS: true } },
      },
    }),
    prisma.despacho.count({ where }),
  ])

  return { data: despachos, total, page, limit }
}

async function getDespachoById(id) {
  const despacho = await prisma.despacho.findUnique({
    where: { id },
    include: {
      ruta: true,
      repartidor: { include: { usuario: { select: { id: true, nombre: true, codigo: true } } } },
      vehiculo: true,
      pedidos: {
        include: {
pedido: {
              include: {
                cliente: { select: { id: true, codigo: true, razonSocial: true, telefono: true } },
              detalles: { include: { producto: { select: { id: true, codigo: true, nombre: true, unidadBase: true } } } },
            },
          },
          detalles: { include: { lote: true, detallePedido: { include: { producto: true } } } },
        },
        orderBy: { ordenParada: 'asc' },
      },
      ubicacionesGPS: { orderBy: { fechaHora: 'desc' }, take: 50 },
      registrosTemperatura: { orderBy: { fechaHora: 'desc' }, take: 10 },
    },
  })
  if (!despacho) throw new Error('Despacho no encontrado')
  return despacho
}

async function createDespacho(data, usuarioId) {
  const { rutaId, repartidorId, vehiculoId, pedidos, ...rest } = data

  const repartidor = await prisma.repartidor.findUnique({
    where: { id: repartidorId },
    include: { usuario: true },
  })
  if (!repartidor) throw new Error('Repartidor no encontrado')
  if (!repartidor.usuario.activo) throw new Error('Usuario del repartidor inactivo')
  if (repartidor.estado !== 'DISPONIBLE') {
    throw new Error(`Repartidor no disponible (estado: ${repartidor.estado})`)
  }

  if (vehiculoId) {
    const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } })
    if (!vehiculo) throw new Error('Vehículo no encontrado')
    if (!vehiculo.activo) throw new Error('Vehículo inactivo')
  }

  if (rutaId) {
    const ruta = await prisma.ruta.findUnique({ where: { id: rutaId } })
    if (!ruta) throw new Error('Ruta no encontrada')
  }

  for (const p of pedidos) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: p.pedidoId },
      include: { despachos: true },
    })
    if (!pedido) throw new Error(`Pedido ${p.pedidoId} no encontrado`)
    if (pedido.estado !== 'LISTO_PARA_DESPACHO') {
      throw new Error(`Pedido ${pedido.codigo} no está listo para despacho (estado: ${pedido.estado})`)
    }
    const yaDespachado = pedido.despachos.some(d => ['EN_RUTA', 'FINALIZADO'].includes(d.estado))
    if (yaDespachado) throw new Error(`Pedido ${pedido.codigo} ya fue despachado`)
  }

  const codigo = generateCodigo()

  const despacho = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.despacho.create({
      data: {
        codigo,
        rutaId,
        repartidorId,
        vehiculoId,
        estado: 'PREPARANDO',
        ...rest,
      },
    })

    for (const p of pedidos) {
      await tx.despachoPedido.create({
        data: {
          despachoId: nuevo.id,
          pedidoId: p.pedidoId,
          ordenParada: p.ordenParada,
          estado: 'PENDIENTE',
        },
      })

      await tx.pedido.update({
        where: { id: p.pedidoId },
        data: { estado: 'EN_RUTA' },
      })

      await tx.eventoTrazabilidad.create({
        data: {
          pedidoId: p.pedidoId,
          usuarioId,
          tipoEvento: 'DESPACHO_CREADO',
          entidadTipo: 'Despacho',
          entidadId: nuevo.id,
          estadoAnterior: 'LISTO_PARA_DESPACHO',
          estadoNuevo: 'EN_RUTA',
          descripcion: `Asignado al despacho ${codigo}, orden parada ${p.ordenParada}`,
        },
      })
    }

    await tx.repartidor.update({
      where: { id: repartidorId },
      data: { estado: 'EN_RUTA' },
    })

    await tx.eventoTrazabilidad.create({
      data: {
        usuarioId,
        tipoEvento: 'DESPACHO_CREADO',
        entidadTipo: 'Despacho',
        entidadId: nuevo.id,
        estadoNuevo: 'PREPARANDO',
        descripcion: `Despacho creado con ${pedidos.length} pedido(s)`,
      },
    })

    return nuevo
  })

  return getDespachoById(despacho.id)
}

async function updateDespacho(id, data) {
  const despacho = await prisma.despacho.findUnique({ where: { id } })
  if (!despacho) throw new Error('Despacho no encontrado')
  if (['FINALIZADO', 'CANCELADO'].includes(despacho.estado)) {
    throw new Error('No se puede modificar un despacho finalizado')
  }

  return prisma.despacho.update({ where: { id }, data })
}

async function changeEstado(id, nuevoEstado, usuarioId, observaciones) {
  const despacho = await prisma.despacho.findUnique({
    where: { id },
    include: { pedidos: { include: { pedido: true } } },
  })
  if (!despacho) throw new Error('Despacho no encontrado')

  const estadoActual = despacho.estado

  const transicionesValidas = {
    PROGRAMADO: ['PREPARANDO', 'CANCELADO'],
    PREPARANDO: ['EN_RUTA', 'CANCELADO'],
    EN_RUTA: ['CON_INCIDENCIA', 'FINALIZADO'],
    CON_INCIDENCIA: ['EN_RUTA', 'CANCELADO'],
    FINALIZADO: [],
    CANCELADO: [],
  }

  const eventoPorEstado = {
    PREPARANDO: 'DESPACHO_ASIGNADO',
    EN_RUTA: 'SALIDA_DESPACHO',
    CON_INCIDENCIA: 'INCIDENCIA_REGISTRADA',
    FINALIZADO: 'ENTREGA_REGISTRADA',
    CANCELADO: 'DESPACHO_ASIGNADO',
  }

  if (!transicionesValidas[estadoActual]?.includes(nuevoEstado)) {
    throw new Error(`Transición inválida: ${estadoActual} → ${nuevoEstado}`)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = { estado: nuevoEstado }
    if (nuevoEstado === 'EN_RUTA' && !despacho.fechaHoraSalida) data.fechaHoraSalida = new Date()
    if (nuevoEstado === 'FINALIZADO') data.fechaHoraCierre = new Date()

    const d = await tx.despacho.update({ where: { id }, data })

    if (nuevoEstado === 'EN_RUTA') {
      await tx.repartidor.update({
        where: { id: despacho.repartidorId },
        data: { estado: 'EN_RUTA' },
      })
    }
    if (nuevoEstado === 'FINALIZADO') {
      await tx.repartidor.update({
        where: { id: despacho.repartidorId },
        data: { estado: 'DISPONIBLE' },
      })
      for (const dp of despacho.pedidos) {
        if (dp.pedido.estado === 'EN_RUTA') {
          await tx.pedido.update({
            where: { id: dp.pedidoId },
            data: { estado: 'ENTREGADO' },
          })
        }
        await tx.despachoPedido.update({
          where: { id: dp.id },
          data: { estado: 'ENTREGADO', horaEntrega: new Date() },
        })
      }
    }
    if (nuevoEstado === 'CANCELADO') {
      await tx.repartidor.update({
        where: { id: despacho.repartidorId },
        data: { estado: 'DISPONIBLE' },
      })
      for (const dp of despacho.pedidos) {
        await tx.pedido.update({
          where: { id: dp.pedidoId },
          data: { estado: 'LISTO_PARA_DESPACHO' },
        })
        await tx.despachoPedido.update({
          where: { id: dp.id },
          data: { estado: 'REPROGRAMADO' },
        })
      }
    }

    await tx.eventoTrazabilidad.create({
      data: {
        usuarioId,
        tipoEvento: eventoPorEstado[nuevoEstado] || 'DESPACHO_ASIGNADO',
        entidadTipo: 'Despacho',
        entidadId: id,
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
        descripcion: observaciones || `Estado cambiado de ${estadoActual} a ${nuevoEstado}`,
      },
    })

    return d
  })

  return getDespachoById(updated.id)
}

async function updateUbicacion(id, { latitud, longitud, precisionMetros, velocidadKmh }, usuarioId) {
  const despacho = await prisma.despacho.findUnique({ where: { id } })
  if (!despacho) throw new Error('Despacho no encontrado')
  if (despacho.estado !== 'EN_RUTA') throw new Error('Solo se puede actualizar ubicación en EN_RUTA')

  await prisma.$transaction(async (tx) => {
    await tx.ubicacionGPS.create({
      data: {
        despachoId: id,
        repartidorId: despacho.repartidorId,
        latitud,
        longitud,
        precisionMetros,
        velocidadKmh,
      },
    })

    await tx.eventoTrazabilidad.create({
      data: {
        usuarioId,
        tipoEvento: 'UBICACION_ACTUALIZADA',
        entidadTipo: 'Despacho',
        entidadId: id,
        descripcion: `Ubicación actualizada: ${latitud}, ${longitud}`,
      },
    })
  })

  return getDespachoById(id)
}

async function updatePedidosOrden(id, pedidos, usuarioId) {
  const despacho = await prisma.despacho.findUnique({
    where: { id },
    include: { pedidos: true },
  })
  if (!despacho) throw new Error('Despacho no encontrado')
  if (['EN_RUTA', 'FINALIZADO', 'CANCELADO'].includes(despacho.estado)) {
    throw new Error('No se puede reordenar en estado actual')
  }

  await prisma.$transaction(async (tx) => {
    for (const p of pedidos) {
      await tx.despachoPedido.update({
        where: { id: p.id },
        data: { ordenParada: p.ordenParada },
      })
    }
  })

  return getDespachoById(id)
}

async function deleteDespacho(id) {
  const despacho = await prisma.despacho.findUnique({
    where: { id },
    include: { pedidos: true },
  })
  if (!despacho) throw new Error('Despacho no encontrado')
  if (despacho.estado !== 'PROGRAMADO' && despacho.estado !== 'CANCELADO') {
    throw new Error('Solo se puede eliminar en PROGRAMADO o CANCELADO')
  }

  await prisma.$transaction(async (tx) => {
    for (const dp of despacho.pedidos) {
      await tx.pedido.update({
        where: { id: dp.pedidoId },
        data: { estado: 'LISTO_PARA_DESPACHO' },
      })
    }
    await tx.despachoPedido.deleteMany({ where: { despachoId: id } })
    await tx.ubicacionGPS.deleteMany({ where: { despachoId: id } })
    await tx.registroTemperatura.deleteMany({ where: { despachoId: id } })
    await tx.eventoTrazabilidad.deleteMany({ 
      where: { entidadTipo: 'Despacho', entidadId: id } 
    })
    await tx.despacho.delete({ where: { id } })
    await tx.repartidor.update({
      where: { id: despacho.repartidorId },
      data: { estado: 'DISPONIBLE' },
    })
  })

  return true
}

async function getFlujoOperativo() {
  const despachos = await prisma.despacho.findMany({
    where: {
      estado: { in: ['PREPARANDO', 'EN_RUTA', 'FINALIZADO', 'CANCELADO'] },
    },
    include: {
      ruta: { select: { id: true, codigo: true, nombre: true } },
      repartidor: { include: { usuario: { select: { id: true, nombre: true, codigo: true } } } },
      vehiculo: { select: { id: true, codigo: true, placa: true } },
      pedidos: {
        include: {
          pedido: {
            select: { id: true, codigo: true, cliente: { select: { razonSocial: true } }, direccionEntrega: true },
          },
        },
        orderBy: { ordenParada: 'asc' },
      },
    },
    orderBy: { fechaHoraSalida: 'asc' },
  })

  const flujo = {
    PREPARANDO: [],
    EN_RUTA: [],
    FINALIZADO: [],
    CANCELADO: [],
  }

  for (const d of despachos) {
    const estado = d.estado
    if (flujo[estado]) {
      flujo[estado].push({
        id: d.id,
        codigo: d.codigo,
        repartidor: d.repartidor ? { id: d.repartidor.id, nombre: d.repartidor.usuario?.nombre, codigo: d.repartidor.usuario?.codigo } : null,
        vehiculo: d.vehiculo ? { id: d.vehiculo.id, codigo: d.vehiculo.codigo, placa: d.vehiculo.placa } : null,
        ruta: d.ruta ? { id: d.ruta.id, codigo: d.ruta.codigo, nombre: d.ruta.nombre } : null,
        cliente: d.pedidos?.[0]?.pedido?.cliente?.razonSocial || null,
        fechaSalida: d.fechaHoraSalida,
        fechaEntrega: d.fechaHoraCierre,
        estado: d.estado,
        prioridad: d.prioridad,
        _count: { ubicacionesGPS: d._count?.ubicacionesGPS || 0 },
      })
    }
  }

  return flujo
}

module.exports = {
  listDespachos,
  getDespachoById,
  createDespacho,
  updateDespacho,
  changeEstado,
  updateUbicacion,
  updatePedidosOrden,
  deleteDespacho,
  getFlujoOperativo,
}