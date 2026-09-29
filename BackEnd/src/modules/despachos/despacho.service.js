const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { LIMITE_CRITICO_C } = require('../trazabilidad/expediente.service')

function generateCodigo() {
  const fecha = new Date()
  const yymmdd = fecha.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `DES-${yymmdd}-${random}`
}

async function listDespachos(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, repartidorId, rutaId, fechaDesde, fechaHasta, search, vista } = query

  const where = {}

  // Pestañas del listado (módulo 03)
  if (vista === 'en_ruta') where.estado = { in: ['EN_RUTA', 'CON_INCIDENCIA'] }
  if (vista === 'pendientes') where.estado = { in: ['PROGRAMADO', 'PREPARANDO'] }
  if (vista === 'completados_hoy') Object.assign(where, { estado: 'FINALIZADO', fechaHoraCierre: { gte: inicioDiaVE(0) } })
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
      { precintoSeguridad: { contains: search, mode: 'insensitive' } },
      { pedidos: { some: { pedido: { codigo: { contains: search, mode: 'insensitive' } } } } },
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
        vehiculo: { select: { id: true, codigo: true, placa: true, tipo: true, esTermico: true } },
        pedidos: {
          include: {
            pedido: {
              select: {
                id: true,
                codigo: true,
                cliente: { select: { razonSocial: true } },
                direccionEntrega: true,
                zona: { select: { nombre: true } },
                detalles: { select: { cantidad: true, unidad: true } },
              },
            },
          },
          orderBy: { ordenParada: 'asc' },
        },
        // Última temperatura manual del despacho (columna "Temp. cava vehículo")
        registrosTemperatura: { orderBy: { fechaHora: 'desc' }, take: 1, select: { temperaturaC: true, fechaHora: true, tipoRegistro: true } },
        _count: { select: { ubicacionesGPS: true } },
      },
    }),
    prisma.despacho.count({ where }),
  ])

  return { data: despachos, total, page, limit }
}

// Inicio del día en hora de Venezuela (UTC-4), desplazado n días
function inicioDiaVE(offsetDias = 0) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  const d = new Date(`${hoy}T00:00:00-04:00`)
  d.setDate(d.getDate() + offsetDias)
  return d
}

const minutosEntre = (a, b) => (new Date(b) - new Date(a)) / 60000
const promedio = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null)

/**
 * Indicadores del módulo 03 (tarjetas, pestañas y resumen de flota), calculados desde la BD.
 * Tiempo de ciclo = minutos entre la salida del despacho y la entrega de cada parada.
 */
async function getResumenDespachos() {
  const hoy = inicioDiaVE(0)
  const hace30 = inicioDiaVE(-30)
  const hace60 = inicioDiaVE(-60)

  const [activos, pendientes, completadosHoy, listosParaSalida, entregasHoy, entregas60, vehiculos] = await Promise.all([
    prisma.despacho.findMany({
      where: { estado: { in: ['EN_RUTA', 'CON_INCIDENCIA'] } },
      select: { estado: true, vehiculoId: true, vehiculo: { select: { tipo: true, esTermico: true } } },
    }),
    prisma.despacho.findMany({ where: { estado: { in: ['PROGRAMADO', 'PREPARANDO'] } }, select: { vehiculoId: true } }),
    prisma.despacho.count({ where: { estado: 'FINALIZADO', fechaHoraCierre: { gte: hoy } } }),
    prisma.pedido.count({ where: { estado: 'LISTO_PARA_DESPACHO' } }),
    prisma.despachoPedido.count({ where: { estado: 'ENTREGADO', horaEntrega: { gte: hoy } } }),
    prisma.despachoPedido.findMany({
      where: { estado: 'ENTREGADO', horaEntrega: { gte: hace60 }, despacho: { fechaHoraSalida: { not: null } } },
      select: { horaEntrega: true, despacho: { select: { fechaHoraSalida: true } } },
    }),
    prisma.vehiculo.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' },
      select: { id: true, codigo: true, tipo: true, placa: true, descripcion: true, capacidadCarga: true, unidadCapacidad: true, esTermico: true },
    }),
  ])

  const ciclo = (desde, hasta) =>
    promedio(
      entregas60
        .filter((e) => e.horaEntrega >= desde && (!hasta || e.horaEntrega < hasta))
        .map((e) => minutosEntre(e.despacho.fechaHoraSalida, e.horaEntrega))
        .filter((m) => m >= 0)
    )

  const distribucion = {}
  for (const d of activos) {
    const clave = d.vehiculo ? `${d.vehiculo.tipo}${d.vehiculo.esTermico ? '_TERMICO' : ''}` : 'SIN_VEHICULO'
    distribucion[clave] = (distribucion[clave] || 0) + 1
  }

  // Flota: qué unidades están ocupadas por un despacho activo o programado
  const despachosPorVehiculo = await prisma.despacho.findMany({
    where: { estado: { in: ['PROGRAMADO', 'PREPARANDO', 'EN_RUTA', 'CON_INCIDENCIA'] }, vehiculoId: { not: null } },
    select: { codigo: true, estado: true, vehiculoId: true, repartidor: { select: { usuario: { select: { nombre: true } } } } },
  })
  const flota = vehiculos.map((v) => {
    const asignado = despachosPorVehiculo.find((d) => d.vehiculoId === v.id)
    return {
      ...v,
      capacidadCarga: v.capacidadCarga ? Number(v.capacidadCarga) : null,
      estadoOperativo: asignado ? (['EN_RUTA', 'CON_INCIDENCIA'].includes(asignado.estado) ? 'EN_RUTA' : 'ASIGNADO') : 'DISPONIBLE',
      despacho: asignado?.codigo || null,
      repartidor: asignado?.repartidor?.usuario?.nombre || null,
    }
  })
  const disponibles = flota.filter((v) => v.estadoOperativo === 'DISPONIBLE').length

  // Posición actual (último GPS) de cada despacho en ruta y sus destinos, para el mapa del inicio
  const enMapa = await prisma.despacho.findMany({
    where: { estado: { in: ['EN_RUTA', 'CON_INCIDENCIA'] } },
    select: {
      codigo: true,
      estado: true,
      repartidor: { select: { usuario: { select: { nombre: true } } } },
      ubicacionesGPS: { orderBy: { fechaHora: 'desc' }, take: 1, select: { latitud: true, longitud: true, fechaHora: true } },
      pedidos: { select: { estado: true, pedido: { select: { codigo: true, direccionEntrega: true, latitudEntrega: true, longitudEntrega: true, zona: { select: { nombre: true } } } } } },
    },
  })
  const posiciones = enMapa.map((d) => ({
    despacho: d.codigo,
    estado: d.estado,
    repartidor: d.repartidor?.usuario?.nombre || null,
    ultimaPosicion: d.ubicacionesGPS[0]
      ? { lat: Number(d.ubicacionesGPS[0].latitud), lng: Number(d.ubicacionesGPS[0].longitud), fechaHora: d.ubicacionesGPS[0].fechaHora }
      : null,
    zonas: [...new Set(d.pedidos.map((p) => p.pedido.zona?.nombre).filter(Boolean))],
    destinos: d.pedidos
      .filter((p) => p.pedido.latitudEntrega && p.pedido.longitudEntrega)
      .map((p) => ({ lat: Number(p.pedido.latitudEntrega), lng: Number(p.pedido.longitudEntrega), direccion: p.pedido.direccionEntrega, etiqueta: p.pedido.codigo })),
  }))

  return {
    enRuta: { total: activos.length, conIncidencia: activos.filter((d) => d.estado === 'CON_INCIDENCIA').length, distribucion },
    pendientes: pendientes.length,
    completadosHoy,
    listosParaSalida,
    entregasHoy,
    tiempoCiclo: { minutos: ciclo(hace30), anterior: ciclo(hace60, hace30), dias: 30 },
    flota,
    disponibilidadFlota: flota.length ? Math.round((disponibles / flota.length) * 100) : null,
    limiteCriticoC: LIMITE_CRITICO_C,
    posiciones,
  }
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
      registrosTemperatura: {
        orderBy: { fechaHora: 'desc' },
        take: 20,
        include: { usuario: { select: { nombre: true } }, ubicacion: { select: { nombre: true } } },
      },
    },
  })
  if (!despacho) throw new AppError('Despacho no encontrado', 404)
  // El límite de la cadena de frío se define en un solo lugar (expediente.service / env)
  return { ...despacho, limiteCriticoC: LIMITE_CRITICO_C }
}

async function createDespacho(data, usuarioId) {
  const { rutaId, repartidorId, vehiculoId, pedidos, ...rest } = data

  const repartidor = await prisma.repartidor.findUnique({
    where: { id: repartidorId },
    include: { usuario: true },
  })
  if (!repartidor) throw new AppError('Repartidor no encontrado', 404)
  if (!repartidor.usuario.activo) throw new AppError('Usuario del repartidor inactivo', 400)
  if (repartidor.estado !== 'DISPONIBLE') {
    throw new AppError(`Repartidor no disponible (estado: ${repartidor.estado})`, 400)
  }

  if (vehiculoId) {
    const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } })
    if (!vehiculo) throw new AppError('Vehículo no encontrado', 404)
    if (!vehiculo.activo) throw new AppError('Vehículo inactivo', 400)
  }

  if (rutaId) {
    const ruta = await prisma.ruta.findUnique({ where: { id: rutaId } })
    if (!ruta) throw new AppError('Ruta no encontrada', 404)
  }

  for (const p of pedidos) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: p.pedidoId },
      include: { despachos: true },
    })
    if (!pedido) throw new AppError(`Pedido ${p.pedidoId} no encontrado`, 404)
    if (pedido.estado !== 'LISTO_PARA_DESPACHO') {
      throw new AppError(`Pedido ${pedido.codigo} no está listo para despacho (estado: ${pedido.estado})`, 400)
    }
    const yaDespachado = pedido.despachos.some(d => ['EN_RUTA', 'FINALIZADO'].includes(d.estado))
    if (yaDespachado) throw new AppError(`Pedido ${pedido.codigo} ya fue despachado`, 409)
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
  if (!despacho) throw new AppError('Despacho no encontrado', 404)
  if (['FINALIZADO', 'CANCELADO'].includes(despacho.estado)) {
    throw new AppError('No se puede modificar un despacho finalizado', 400)
  }

  return prisma.despacho.update({ where: { id }, data })
}

async function changeEstado(id, nuevoEstado, usuarioId, observaciones) {
  const despacho = await prisma.despacho.findUnique({
    where: { id },
    include: { pedidos: { include: { pedido: true } } },
  })
  if (!despacho) throw new AppError('Despacho no encontrado', 404)

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
    throw new AppError(`Transición inválida: ${estadoActual} → ${nuevoEstado}`, 400)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = { estado: nuevoEstado }
    if (nuevoEstado === 'EN_RUTA' && !despacho.fechaHoraSalida) data.fechaHoraSalida = new Date()
    if (nuevoEstado === 'FINALIZADO') data.fechaHoraCierre = new Date()

    const d = await tx.despacho.update({ where: { id }, data })

    if (nuevoEstado === 'EN_RUTA' && despacho.repartidorId) {
      await tx.repartidor.update({
        where: { id: despacho.repartidorId },
        data: { estado: 'EN_RUTA' },
      })
    }
    // Al salir a ruta, las paradas pendientes pasan a "en ruta" (antes quedaban PENDIENTE todo el viaje)
    if (nuevoEstado === 'EN_RUTA') {
      await tx.despachoPedido.updateMany({
        where: { despachoId: id, estado: 'PENDIENTE' },
        data: { estado: 'EN_RUTA' },
      })
    }
    if (['FINALIZADO', 'CANCELADO'].includes(nuevoEstado) && despacho.repartidorId) {
      await tx.repartidor.update({
        where: { id: despacho.repartidorId },
        data: { estado: 'DISPONIBLE' },
      })
    }
    if (nuevoEstado === 'FINALIZADO') {
      // Solo las paradas aún abiertas se dan por entregadas; las devueltas o con incidencia
      // conservan su estado (antes se sobrescribían todas como ENTREGADO).
      const ABIERTAS = ['PENDIENTE', 'EN_RUTA', 'EN_ESPERA']
      for (const dp of despacho.pedidos.filter((x) => ABIERTAS.includes(x.estado))) {
        if (dp.pedido.estado === 'EN_RUTA') {
          await tx.pedido.update({
            where: { id: dp.pedidoId },
            data: { estado: 'ENTREGADO' },
          })
          await tx.eventoTrazabilidad.create({
            data: {
              pedidoId: dp.pedidoId,
              usuarioId,
              tipoEvento: 'ENTREGA_REGISTRADA',
              entidadTipo: 'Despacho',
              entidadId: id,
              estadoAnterior: 'EN_RUTA',
              estadoNuevo: 'ENTREGADO',
              descripcion: `Entrega registrada al finalizar el despacho ${despacho.codigo} (parada ${dp.ordenParada})`,
            },
          })
        }
        await tx.despachoPedido.update({
          where: { id: dp.id },
          data: { estado: 'ENTREGADO', horaEntrega: dp.horaEntrega || new Date() },
        })
      }
    }
    if (nuevoEstado === 'CANCELADO') {
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
  if (!despacho) throw new AppError('Despacho no encontrado', 404)
  if (despacho.estado !== 'EN_RUTA') throw new AppError('Solo se puede actualizar ubicación en EN_RUTA', 400)

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
  if (!despacho) throw new AppError('Despacho no encontrado', 404)
  if (['EN_RUTA', 'FINALIZADO', 'CANCELADO'].includes(despacho.estado)) {
    throw new AppError('No se puede reordenar en estado actual', 400)
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
  if (!despacho) throw new AppError('Despacho no encontrado', 404)
  if (despacho.estado !== 'PROGRAMADO' && despacho.estado !== 'CANCELADO') {
    throw new AppError('Solo se puede eliminar en PROGRAMADO o CANCELADO', 400)
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

// Tablero de flujo operativo: despachos activos por estado. Los finalizados se limitan a los
// últimos días para que la columna no crezca sin límite; los cancelados se ven en la lista.
const DIAS_FINALIZADOS_EN_TABLERO = 3

async function getFlujoOperativo() {
  const desdeFinalizados = new Date(Date.now() - DIAS_FINALIZADOS_EN_TABLERO * 24 * 60 * 60 * 1000)
  const despachos = await prisma.despacho.findMany({
    where: {
      OR: [
        { estado: { in: ['PROGRAMADO', 'PREPARANDO', 'EN_RUTA', 'CON_INCIDENCIA'] } },
        { estado: 'FINALIZADO', fechaHoraCierre: { gte: desdeFinalizados } },
      ],
    },
    include: {
      ruta: { select: { id: true, codigo: true, nombre: true } },
      repartidor: { include: { usuario: { select: { id: true, nombre: true, codigo: true } } } },
      vehiculo: { select: { id: true, codigo: true, placa: true, tipo: true, esTermico: true } },
      pedidos: {
        include: {
          pedido: {
            select: { id: true, codigo: true, prioridad: true, cliente: { select: { razonSocial: true } } },
          },
        },
        orderBy: { ordenParada: 'asc' },
      },
      _count: { select: { ubicacionesGPS: true } },
    },
    orderBy: [{ fechaHoraSalida: 'asc' }, { codigo: 'asc' }],
  })

  const flujo = { PROGRAMADO: [], PREPARANDO: [], EN_RUTA: [], CON_INCIDENCIA: [], FINALIZADO: [] }
  const ORDEN_PRIORIDAD = ['BAJA', 'NORMAL', 'ALTA', 'URGENTE']

  for (const d of despachos) {
    // La prioridad del despacho es la más alta entre sus pedidos
    const prioridad = d.pedidos.reduce(
      (max, dp) => (ORDEN_PRIORIDAD.indexOf(dp.pedido?.prioridad) > ORDEN_PRIORIDAD.indexOf(max) ? dp.pedido.prioridad : max),
      'BAJA'
    )
    flujo[d.estado].push({
      id: d.id,
      codigo: d.codigo,
      estado: d.estado,
      prioridad,
      repartidor: d.repartidor ? { id: d.repartidor.id, nombre: d.repartidor.usuario?.nombre } : null,
      vehiculo: d.vehiculo,
      ruta: d.ruta,
      precinto: d.precintoSeguridad,
      paradas: d.pedidos.map((dp) => ({
        ordenParada: dp.ordenParada,
        pedidoCodigo: dp.pedido?.codigo,
        cliente: dp.pedido?.cliente?.razonSocial,
        estado: dp.estado,
      })),
      fechaSalida: d.fechaHoraSalida,
      fechaCierre: d.fechaHoraCierre,
      posicionesGPS: d._count.ubicacionesGPS,
    })
  }

  return flujo
}

// Agrega un pedido LISTO_PARA_DESPACHO a un despacho que aún no ha salido, como última parada.
async function agregarPedido(despachoId, pedidoId, usuarioId) {
  const despacho = await prisma.despacho.findUnique({
    where: { id: despachoId },
    include: { pedidos: { select: { ordenParada: true } } },
  })
  if (!despacho) throw new AppError('Despacho no encontrado', 404)
  if (!['PROGRAMADO', 'PREPARANDO'].includes(despacho.estado)) {
    throw new AppError(`Solo se pueden agregar pedidos a un despacho PROGRAMADO o PREPARANDO (estado: ${despacho.estado})`, 400)
  }

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { despachos: { include: { despacho: { select: { estado: true } } } } },
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404)
  if (pedido.estado !== 'LISTO_PARA_DESPACHO') {
    throw new AppError(`Pedido ${pedido.codigo} no está listo para despacho (estado: ${pedido.estado})`, 400)
  }
  const enOtroDespachoActivo = pedido.despachos.some(
    (dp) => !['FINALIZADO', 'CANCELADO'].includes(dp.despacho.estado)
  )
  if (enOtroDespachoActivo) throw new AppError(`Pedido ${pedido.codigo} ya está asignado a un despacho activo`, 409)

  const ordenParada = despacho.pedidos.reduce((max, dp) => Math.max(max, dp.ordenParada), 0) + 1

  await prisma.$transaction(async (tx) => {
    await tx.despachoPedido.create({
      data: { despachoId, pedidoId, ordenParada, estado: 'PENDIENTE' },
    })

    // Mismo efecto sobre el pedido que al crearlo junto con el despacho (createDespacho)
    await tx.pedido.update({
      where: { id: pedidoId },
      data: { estado: 'EN_RUTA' },
    })

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId,
        usuarioId,
        tipoEvento: 'DESPACHO_ASIGNADO',
        entidadTipo: 'Despacho',
        entidadId: despachoId,
        estadoAnterior: 'LISTO_PARA_DESPACHO',
        estadoNuevo: 'EN_RUTA',
        descripcion: `Asignado al despacho ${despacho.codigo}, orden parada ${ordenParada}`,
      },
    })
  })

  return getDespachoById(despachoId)
}

module.exports = {
  getResumenDespachos,
  listDespachos,
  getDespachoById,
  createDespacho,
  agregarPedido,
  updateDespacho,
  changeEstado,
  updateUbicacion,
  updatePedidosOrden,
  deleteDespacho,
  getFlujoOperativo,
}