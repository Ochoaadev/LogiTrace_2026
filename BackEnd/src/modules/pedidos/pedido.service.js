const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { codigoUnico } = require('../../utils/codigos')
const { asignarLotesFefo, revertirSalidasPedido } = require('../inventario/asignacionLotes')
const { LIMITE_CRITICO_C } = require('../trazabilidad/expediente.service')

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
  const { estado, prioridad, clienteId, zonaId, fechaDesde, fechaHasta, search, vista } = query

  const where = {}

  // Pestañas del listado: pedidos en operación o ya concluidos
  if (vista === 'activos') where.estado = { in: ESTADOS_ACTIVOS }
  if (vista === 'historial') where.estado = { in: ESTADOS_HISTORIAL }
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
        tipoSector: { select: { id: true, codigo: true, nombre: true } },
        creadoPor: { select: { id: true, nombre: true, codigo: true } },
        detalles: { select: { cantidad: true, unidad: true, producto: { select: { nombre: true } } } },
        // Despacho vigente: repartidor y vehículo que lleva el pedido
        despachos: {
          where: { estado: { not: 'REPROGRAMADO' } },
          select: {
            despacho: {
              select: {
                id: true,
                codigo: true,
                estado: true,
                repartidor: { select: { usuario: { select: { nombre: true } } } },
                vehiculo: { select: { codigo: true, tipo: true, esTermico: true } },
              },
            },
          },
        },
        _count: { select: { detalles: true, despachos: true } },
      },
    }),
    prisma.pedido.count({ where }),
  ])

  return { data: pedidos, total, page, limit }
}

const ESTADOS_ACTIVOS = ['REGISTRADO', 'EN_PREPARACION', 'LISTO_PARA_DESPACHO', 'EN_RUTA', 'CON_INCIDENCIA']
const ESTADOS_HISTORIAL = ['ENTREGADO', 'CERRADO', 'CANCELADO', 'DEVUELTO']
const DIAS_EFECTIVIDAD = 30

// Inicio del día en hora de Venezuela (UTC-4), desplazado n días
function inicioDia(offsetDias = 0) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  const d = new Date(`${hoy}T00:00:00-04:00`)
  d.setDate(d.getDate() + offsetDias)
  return d
}

const sumaCantidades = (detalles) => detalles.reduce((s, d) => s + Number(d.cantidad), 0)

/**
 * Indicadores del módulo 02 (tarjetas y paneles del Figma), todos calculados desde la BD.
 */
async function getResumenPedidos() {
  const hoy = inicioDia(0)
  const ayer = inicioDia(-1)
  const desdeEfectividad = inicioDia(-DIAS_EFECTIVIDAD)

  const [
    enCola, registradosHoy, registradosAyer, enPreparacion, enRuta,
    despachosActivos, finalizados, incidenciasPeriodo, ultimaCava, zonas, lotesCava, activos,
  ] = await Promise.all([
    prisma.pedido.count({ where: { estado: 'REGISTRADO' } }),
    prisma.pedido.count({ where: { fechaHora: { gte: hoy } } }),
    prisma.pedido.count({ where: { fechaHora: { gte: ayer, lt: hoy } } }),
    prisma.pedido.findMany({ where: { estado: 'EN_PREPARACION' }, select: { detalles: { select: { cantidad: true, unidad: true } } } }),
    prisma.pedido.count({ where: { estado: { in: ['EN_RUTA', 'CON_INCIDENCIA'] } } }),
    prisma.despacho.findMany({
      where: { estado: { in: ['PREPARANDO', 'EN_RUTA', 'CON_INCIDENCIA'] } },
      select: {
        codigo: true,
        estado: true,
        vehiculo: { select: { codigo: true, tipo: true, placa: true, capacidadCarga: true, unidadCapacidad: true, esTermico: true } },
        repartidor: { select: { usuario: { select: { nombre: true } } } },
        pedidos: { select: { pedido: { select: { detalles: { select: { cantidad: true } } } } } },
      },
    }),
    prisma.pedido.groupBy({
      by: ['estado'],
      where: { estado: { in: ['ENTREGADO', 'CERRADO', 'DEVUELTO'] }, updatedAt: { gte: desdeEfectividad } },
      _count: { _all: true },
    }),
    prisma.incidencia.count({ where: { fechaHora: { gte: desdeEfectividad } } }),
    prisma.registroTemperatura.findFirst({
      where: { tipoRegistro: 'CAVA' },
      orderBy: { fechaHora: 'desc' },
      include: { ubicacion: { select: { codigo: true, nombre: true } } },
    }),
    prisma.pedido.groupBy({
      by: ['zonaId'],
      where: { zonaId: { not: null }, fechaHora: { gte: desdeEfectividad } },
      _count: { _all: true },
      orderBy: { _count: { zonaId: 'desc' } },
      take: 3,
    }),
    // FEFO: primer lote a vencer con stock en una cava
    prisma.inventario.findFirst({
      where: { stockActual: { gt: 0 }, ubicacion: { tipo: 'CAVA' }, lote: { estadoCalidad: 'DISPONIBLE' } },
      orderBy: { lote: { fechaVencimiento: 'asc' } },
      include: { lote: { include: { producto: { select: { nombre: true } } } }, ubicacion: { select: { nombre: true } } },
    }),
    prisma.pedido.count({ where: { estado: { in: ESTADOS_ACTIVOS } } }),
  ])

  const zonaInfo = await prisma.zonaDespacho.findMany({
    where: { id: { in: zonas.map((z) => z.zonaId) } },
    select: { id: true, nombre: true, municipio: true },
  })

  const conteoFinal = Object.fromEntries(finalizados.map((f) => [f.estado, f._count._all]))
  const entregados = (conteoFinal.ENTREGADO || 0) + (conteoFinal.CERRADO || 0)
  const totalFinalizados = entregados + (conteoFinal.DEVUELTO || 0)

  const vehiculosEnUso = {}
  for (const d of despachosActivos) {
    const tipo = d.vehiculo?.tipo || 'SIN_VEHICULO'
    vehiculosEnUso[tipo] = (vehiculosEnUso[tipo] || 0) + 1
  }

  return {
    activos,
    enCola: { total: enCola, registradosHoy, registradosAyer },
    enPreparacion: {
      total: enPreparacion.length,
      cantidad: enPreparacion.reduce((s, p) => s + sumaCantidades(p.detalles), 0),
      unidades: [...new Set(enPreparacion.flatMap((p) => p.detalles.map((d) => d.unidad)))],
    },
    enRuta: { total: enRuta, vehiculosEnUso },
    efectividad: {
      dias: DIAS_EFECTIVIDAD,
      porcentaje: totalFinalizados ? Math.round((entregados / totalFinalizados) * 1000) / 10 : null,
      entregados,
      devueltos: conteoFinal.DEVUELTO || 0,
      incidencias: incidenciasPeriodo,
    },
    cava: ultimaCava
      ? {
          ubicacion: ultimaCava.ubicacion?.nombre || 'Cava',
          codigo: ultimaCava.ubicacion?.codigo,
          temperaturaC: Number(ultimaCava.temperaturaC),
          fechaHora: ultimaCava.fechaHora,
          conforme: Number(ultimaCava.temperaturaC) <= LIMITE_CRITICO_C,
          limiteCriticoC: LIMITE_CRITICO_C,
        }
      : null,
    capacidad: despachosActivos
      .filter((d) => d.vehiculo)
      .map((d) => {
        const carga = d.pedidos.reduce((s, dp) => s + sumaCantidades(dp.pedido.detalles), 0)
        const capacidad = d.vehiculo.capacidadCarga ? Number(d.vehiculo.capacidadCarga) : null
        return {
          despacho: d.codigo,
          estado: d.estado,
          vehiculo: d.vehiculo.codigo,
          tipo: d.vehiculo.tipo,
          esTermico: d.vehiculo.esTermico,
          repartidor: d.repartidor?.usuario?.nombre || null,
          carga,
          capacidad,
          unidadCapacidad: d.vehiculo.unidadCapacidad,
          porcentaje: capacidad ? Math.round((carga / capacidad) * 100) : null,
        }
      }),
    zonasFrecuentes: zonas.map((z) => {
      const info = zonaInfo.find((x) => x.id === z.zonaId)
      return { zonaId: z.zonaId, nombre: info?.nombre, municipio: info?.municipio, pedidos: z._count._all }
    }),
    loteVigente: lotesCava
      ? {
          codigo: lotesCava.lote.codigo,
          producto: lotesCava.lote.producto?.nombre,
          fechaVencimiento: lotesCava.lote.fechaVencimiento,
          ubicacion: lotesCava.ubicacion?.nombre,
          stock: Number(lotesCava.stockActual),
        }
      : null,
  }
}

async function getPedidoById(id) {
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      zona: true,
      tipoSector: { select: { id: true, codigo: true, nombre: true } },
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
  if (!pedido) throw new AppError('Pedido no encontrado', 404)
  return pedido
}

// Campos del pedido que se pueden guardar desde la API. Antes se pasaba el cuerpo completo a
// Prisma: la validación aceptaba "fechaEntrega" sin que existiera la columna y el registro fallaba.
const CAMPOS_PEDIDO = ['fechaEntrega', 'prioridad', 'metodoEntrega', 'zonaId', 'tipoSectorId', 'direccionEntrega', 'referenciaEntrega', 'latitudEntrega', 'longitudEntrega', 'telefonoContacto', 'observaciones']

function camposPermitidos(data) {
  const limpio = {}
  for (const campo of CAMPOS_PEDIDO) if (data[campo] !== undefined) limpio[campo] = data[campo]
  if (limpio.fechaEntrega) limpio.fechaEntrega = new Date(limpio.fechaEntrega)
  return limpio
}

async function createPedido(data, usuarioId) {
  const { clienteId, items } = data
  const rest = camposPermitidos(data)

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404)
  if (!cliente.activo) throw new AppError('Cliente inactivo', 400)

  for (const item of items) {
    const producto = await prisma.producto.findUnique({ where: { id: item.productoId } })
    if (!producto) throw new AppError(`Producto ${item.productoId} no encontrado`, 404)
    if (!producto.activo) throw new AppError(`Producto ${producto.nombre} inactivo`, 400)
  }

  const codigo = await codigoUnico('PED', 'pedido')

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
  if (!pedido) throw new AppError('Pedido no encontrado', 404)

  if (['ENTREGADO', 'CERRADO', 'CANCELADO', 'DEVUELTO'].includes(pedido.estado)) {
    throw new AppError('No se puede modificar un pedido en estado final', 400)
  }

  const { items } = data
  const rest = camposPermitidos(data)

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
  if (!pedido) throw new AppError('Pedido no encontrado', 404)

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
    throw new AppError(`Transición inválida: ${estadoActual} → ${nuevoEstado}`, 400)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = { estado: nuevoEstado }

    const p = await tx.pedido.update({ where: { id }, data })

    // Un pedido cancelado después de prepararse devuelve su mercancía a la cava
    if (nuevoEstado === 'CANCELADO' && estadoActual === 'LISTO_PARA_DESPACHO') {
      await revertirSalidasPedido(tx, pedido, usuarioId)
    }

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
  if (!pedido) throw new AppError('Pedido no encontrado', 404)
  if (pedido.estado !== 'REGISTRADO') throw new AppError('Solo se puede preparar desde REGISTRADO', 400)

  // Verifica que haya stock despachable (lotes disponibles en cava); antes sumaba cualquier
  // ubicación, incluida la cuarentena. La salida real se registra en "listo para despacho".
  await asignarLotesFefo(prisma, pedido)

  return changeEstado(id, 'EN_PREPARACION', usuarioId, 'Preparación iniciada')
}

/**
 * Lotes que saldrían de la cava al marcar el pedido "listo para despacho" (misma regla FEFO), sin
 * mover inventario: se muestra en la confirmación. Si falta stock, responde el mismo error que la
 * acción real. `sinControl`: productos sin inventario registrado, que saldrían sin descontar stock.
 */
async function previsualizarSalida(id) {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: { detalles: { include: { producto: true } } } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404)
  if (pedido.estado !== 'EN_PREPARACION') throw new AppError('Solo desde EN_PREPARACION', 400)

  const items = await asignarLotesFefo(prisma, pedido)
  const [lotes, ubicaciones] = await Promise.all([
    prisma.lote.findMany({ where: { id: { in: items.map((i) => i.loteId) } }, select: { id: true, codigo: true, fechaVencimiento: true, producto: { select: { codigo: true, nombre: true } } } }),
    prisma.ubicacionAlmacen.findMany({ where: { id: { in: items.map((i) => i.ubicacionId) } }, select: { id: true, nombre: true } }),
  ])
  const conStock = new Set(lotes.map((l) => l.producto.codigo))
  return {
    salidas: items.map((i) => {
      const lote = lotes.find((l) => l.id === i.loteId)
      return {
        producto: lote?.producto.nombre,
        lote: lote?.codigo,
        vence: lote?.fechaVencimiento,
        ubicacion: ubicaciones.find((u) => u.id === i.ubicacionId)?.nombre,
        cantidad: i.cantidad,
        unidad: i.unidad,
      }
    }),
    sinControl: pedido.detalles.filter((d) => !conStock.has(d.producto.codigo)).map((d) => ({ producto: d.producto.nombre, cantidad: Number(d.cantidad), unidad: d.unidad })),
  }
}

async function listoParaDespacho(id, usuarioId) {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: { detalles: { include: { producto: true } } } })
  if (!pedido) throw new AppError('Pedido no encontrado', 404)
  if (pedido.estado !== 'EN_PREPARACION') throw new AppError('Solo desde EN_PREPARACION', 400)

  await prisma.$transaction(async (tx) => {
    // Sin lotes indicados (flujo de la interfaz) se asignan por FEFO desde la cava
    const items = await asignarLotesFefo(tx, pedido)
    for (const item of items) {
      const lote = await tx.lote.findUnique({ where: { id: item.loteId } })
      if (!lote) throw new AppError(`Lote ${item.loteId} no encontrado`, 404)

      const inventario = await tx.inventario.findUnique({
        where: { loteId_ubicacionId: { loteId: item.loteId, ubicacionId: item.ubicacionId } },
      })
      if (!inventario || Number(inventario.stockActual) < Number(item.cantidad)) {
        throw new AppError(`Stock insuficiente en lote ${lote.codigo}`, 400)
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
  if (!pedido) throw new AppError('Pedido no encontrado', 404)

  if (pedido.estado !== 'REGISTRADO' && pedido.estado !== 'CANCELADO') {
    throw new AppError('Solo se puede eliminar en REGISTRADO o CANCELADO', 400)
  }

  await prisma.$transaction(async (tx) => {
    await tx.detallePedido.deleteMany({ where: { pedidoId: id } })
    await tx.eventoTrazabilidad.deleteMany({ where: { pedidoId: id } })
    await tx.pedido.delete({ where: { id } })
  })

  return true
}

module.exports = {
  previsualizarSalida,
  getResumenPedidos,
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