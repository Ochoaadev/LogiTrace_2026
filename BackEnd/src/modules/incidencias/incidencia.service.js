const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { codigoUnico } = require('../../utils/codigos')
const { LIMITE_CRITICO_C } = require('../trazabilidad/expediente.service')

async function listIncidencias(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, tipoIncidenciaId, despachoPedidoId, fechaDesde, fechaHasta, search, abiertas } = query

  const where = {}

  if (abiertas === 'true') where.estado = { in: ESTADOS_ABIERTOS }
  if (estado) where.estado = estado
  if (tipoIncidenciaId) where.tipoIncidenciaId = tipoIncidenciaId
  if (despachoPedidoId) where.despachoPedidoId = despachoPedidoId
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {}
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta)
  }
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { descripcion: { contains: search, mode: 'insensitive' } },
      { despachoPedido: { pedido: { codigo: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  const [incidencias, total] = await Promise.all([
    prisma.incidencia.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaHora: 'desc' },
      include: {
        despachoPedido: {
          include: {
            pedido: {
              select: {
                id: true,
                codigo: true,
                direccionEntrega: true,
                cliente: { select: { razonSocial: true } },
                zona: { select: { nombre: true } },
                detalles: { select: { cantidad: true, unidad: true } },
              },
            },
            despacho: {
              select: {
                id: true,
                codigo: true,
                repartidor: { include: { usuario: { select: { nombre: true } } } },
                vehiculo: { select: { codigo: true, tipo: true } },
              },
            },
          },
        },
        tipo: { select: { id: true, codigo: true, nombre: true } },
        reportadoPor: { select: { id: true, nombre: true, codigo: true } },
        resueltaPor: { select: { id: true, nombre: true, codigo: true } },
        _count: { select: { devoluciones: true } },
      },
    }),
    prisma.incidencia.count({ where }),
  ])

  return { data: incidencias, total, page, limit }
}

const ESTADOS_ABIERTOS = ['REPORTADA', 'EN_REVISION', 'EN_ATENCION']
const DIAS_RESUMEN = 30

function inicioDiaVE(offsetDias = 0) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  const d = new Date(`${hoy}T00:00:00-04:00`)
  d.setDate(d.getDate() + offsetDias)
  return d
}

/**
 * Indicadores del módulo 04 (tarjetas, filtros por causa, leyenda, paneles) y las paradas en
 * tránsito para el registro rápido. Período de análisis: últimos 30 días.
 */
async function getResumenIncidencias() {
  const hoy = inicioDiaVE(0)
  const desde = inicioDiaVE(-DIAS_RESUMEN)

  const [abiertas, resueltasHoy, periodo, porTipoTotal, tipos, enTransito] = await Promise.all([
    prisma.incidencia.count({ where: { estado: { in: ESTADOS_ABIERTOS } } }),
    prisma.incidencia.count({ where: { estado: { in: ['RESUELTA', 'CERRADA'] }, fechaResolucion: { gte: hoy } } }),
    prisma.incidencia.findMany({
      where: { fechaHora: { gte: desde } },
      select: {
        estado: true,
        fechaHora: true,
        fechaResolucion: true,
        tipoIncidenciaId: true,
        _count: { select: { devoluciones: true } },
        despachoPedido: {
          select: {
            despachoId: true,
            pedido: { select: { zona: { select: { id: true, nombre: true, municipio: true } } } },
          },
        },
      },
    }),
    prisma.incidencia.groupBy({ by: ['tipoIncidenciaId'], _count: { _all: true } }),
    prisma.tipoIncidencia.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
    // Paradas en tránsito donde puede ocurrir una incidencia (registro rápido)
    prisma.despachoPedido.findMany({
      where: { estado: { in: ['PENDIENTE', 'EN_RUTA', 'EN_ESPERA', 'CON_INCIDENCIA'] }, despacho: { estado: { in: ['EN_RUTA', 'CON_INCIDENCIA'] } } },
      select: {
        id: true,
        ordenParada: true,
        pedido: { select: { codigo: true, cliente: { select: { razonSocial: true } } } },
        despacho: {
          select: {
            codigo: true,
            repartidor: { select: { usuario: { select: { nombre: true } } } },
            vehiculo: { select: { codigo: true } },
          },
        },
      },
      orderBy: [{ despacho: { codigo: 'asc' } }, { ordenParada: 'asc' }],
    }),
  ])

  // Causa más frecuente del período
  const conteoTipo = {}
  for (const i of periodo) conteoTipo[i.tipoIncidenciaId] = (conteoTipo[i.tipoIncidenciaId] || 0) + 1
  const [tipoTop, nTop] = Object.entries(conteoTipo).sort((a, b) => b[1] - a[1])[0] || []

  const resueltas = periodo.filter((i) => i.fechaResolucion)
  const tiempoResolucion = resueltas.length
    ? Math.round(resueltas.reduce((s, i) => s + (i.fechaResolucion - i.fechaHora) / 60000, 0) / resueltas.length)
    : null

  // Cadena de frío en los despachos que tuvieron incidencias
  const despachoIds = [...new Set(periodo.map((i) => i.despachoPedido.despachoId))]
  const registros = despachoIds.length
    ? await prisma.registroTemperatura.findMany({
        where: { despachoId: { in: despachoIds } },
        orderBy: { fechaHora: 'desc' },
        select: { temperaturaC: true, fechaHora: true, despacho: { select: { codigo: true } } },
      })
    : []
  const quiebres = registros.filter((r) => Number(r.temperaturaC) > LIMITE_CRITICO_C)

  // Zonas con más incidencias
  const porZona = {}
  for (const i of periodo) {
    const z = i.despachoPedido.pedido.zona
    if (!z) continue
    porZona[z.id] = porZona[z.id] || { ...z, incidencias: 0, abiertas: 0 }
    porZona[z.id].incidencias += 1
    if (ESTADOS_ABIERTOS.includes(i.estado)) porZona[z.id].abiertas += 1
  }

  return {
    dias: DIAS_RESUMEN,
    abiertas,
    resueltasHoy,
    causaFrecuente: tipoTop
      ? { nombre: tipos.find((t) => t.id === tipoTop)?.nombre, porcentaje: Math.round((nTop / periodo.length) * 100), total: nTop }
      : null,
    tiempoResolucionMin: tiempoResolucion,
    impactoFrio: {
      quiebres: quiebres.length,
      registros: registros.length,
      limiteCriticoC: LIMITE_CRITICO_C,
      ultimo: registros[0] ? { temperaturaC: Number(registros[0].temperaturaC), fechaHora: registros[0].fechaHora, despacho: registros[0].despacho?.codigo } : null,
      rango: registros.length
        ? { min: Math.min(...registros.map((r) => Number(r.temperaturaC))), max: Math.max(...registros.map((r) => Number(r.temperaturaC))) }
        : null,
    },
    // Chips de filtro: total histórico por tipo de causa
    porTipo: tipos.map((t) => ({ id: t.id, nombre: t.nombre, total: porTipoTotal.find((x) => x.tipoIncidenciaId === t.id)?._count._all || 0 })),
    leyenda: {
      abiertas: periodo.filter((i) => ESTADOS_ABIERTOS.includes(i.estado)).length,
      resueltas: periodo.filter((i) => ['RESUELTA', 'CERRADA'].includes(i.estado)).length,
      conDevolucion: periodo.filter((i) => i._count.devoluciones > 0).length,
    },
    zonasCriticas: Object.values(porZona).sort((a, b) => b.incidencias - a.incidencias).slice(0, 3),
    enTransito: enTransito.map((dp) => ({
      despachoPedidoId: dp.id,
      pedido: dp.pedido.codigo,
      cliente: dp.pedido.cliente?.razonSocial,
      despacho: dp.despacho.codigo,
      parada: dp.ordenParada,
      repartidor: dp.despacho.repartidor?.usuario?.nombre || null,
      vehiculo: dp.despacho.vehiculo?.codigo || null,
    })),
  }
}

// CSV del reporte de novedades (mismos filtros que la lista). Separador ";" para Excel es-VE.
async function exportIncidenciasCsv(query) {
  const { data } = await listIncidencias({ ...query, page: 1, limit: 100 })
  const fecha = (d) => (d ? new Date(d).toLocaleString('es-VE', { timeZone: 'America/Caracas' }) : '')
  const celda = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const filas = data.map((i) => [
    i.codigo, fecha(i.fechaHora), i.estado, i.tipo?.nombre, i.despachoPedido?.pedido?.codigo,
    i.despachoPedido?.pedido?.cliente?.razonSocial, i.despachoPedido?.pedido?.zona?.nombre,
    i.despachoPedido?.despacho?.codigo, i.reportadoPor?.nombre, i.descripcion, i.decisionOperativa,
    fecha(i.fechaResolucion), i.resueltaPor?.nombre,
  ].map(celda).join(';'))
  const encabezado = ['Código', 'Fecha y hora', 'Estado', 'Causa', 'Pedido', 'Cliente', 'Zona', 'Despacho', 'Reportó', 'Descripción', 'Decisión operativa', 'Resuelta', 'Resolvió']
  return '\uFEFF' + [encabezado.join(';'), ...filas].join('\r\n')
}

async function getIncidenciaById(id) {
  const incidencia = await prisma.incidencia.findUnique({
    where: { id },
    include: {
      despachoPedido: {
        include: {
          pedido: {
            include: {
              cliente: { select: { id: true, codigo: true, razonSocial: true, telefono: true } },
              detalles: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
            },
          },
          despacho: {
            include: {
              repartidor: { include: { usuario: { select: { nombre: true } } } },
              vehiculo: { select: { codigo: true, placa: true } },
            },
          },
        },
      },
      tipo: true,
      reportadoPor: { select: { id: true, nombre: true, codigo: true } },
      resueltaPor: { select: { id: true, nombre: true, codigo: true } },
      devoluciones: { include: { motivo: true } },
    },
  })
  if (!incidencia) throw new AppError('Incidencia no encontrada', 404)
  return incidencia
}

async function createIncidencia(data, usuarioId, user) {
  const { despachoPedidoId, tipoIncidenciaId, descripcion, latitud, longitud, decisionOperativa } = data

  const dp = await prisma.despachoPedido.findUnique({
    where: { id: despachoPedidoId },
    include: { pedido: true, despacho: true },
  })
  if (!dp) throw new AppError('Despacho-pedido no encontrado', 404)
  // Un repartidor solo reporta incidencias de las paradas de su propio despacho
  if (user?.rol === 'REPARTIDOR') {
    const repartidor = await prisma.repartidor.findUnique({ where: { usuarioId: user.sub } })
    if (!repartidor || repartidor.id !== dp.despacho.repartidorId) throw new AppError('Esta parada no pertenece a un despacho asignado a usted', 403)
  }
  // Una incidencia ocurre durante la entrega: el despacho debe estar en ruta y la parada abierta
  if (!['EN_RUTA', 'CON_INCIDENCIA'].includes(dp.despacho.estado)) {
    throw new AppError(`Solo se reportan incidencias de despachos en ruta (estado: ${dp.despacho.estado})`, 400)
  }
  if (['ENTREGADO', 'DEVUELTO'].includes(dp.estado)) {
    throw new AppError(`La parada ya fue cerrada (${dp.estado.toLowerCase()})`, 400)
  }

  const tipo = await prisma.tipoIncidencia.findUnique({ where: { id: tipoIncidenciaId } })
  if (!tipo) throw new AppError('Tipo de incidencia no encontrado', 404)
  if (!tipo.activo) throw new AppError('Tipo de incidencia inactivo', 400)

  const codigo = await codigoUnico('INC', 'incidencia')

  const incidencia = await prisma.$transaction(async (tx) => {
    const nueva = await tx.incidencia.create({
      data: {
        codigo,
        despachoPedidoId,
        tipoIncidenciaId,
        reportadoPorId: usuarioId,
        descripcion,
        latitud,
        longitud,
        decisionOperativa,
        estado: 'REPORTADA',
      },
    })

    await tx.despachoPedido.update({
      where: { id: despachoPedidoId },
      data: { estado: 'CON_INCIDENCIA' },
    })
    if (dp.pedido.estado === 'EN_RUTA') {
      await tx.pedido.update({ where: { id: dp.pedidoId }, data: { estado: 'CON_INCIDENCIA' } })
    }

    const despacho = await tx.despacho.findUnique({ where: { id: dp.despachoId } })
    if (despacho && despacho.estado !== 'CON_INCIDENCIA') {
      await tx.despacho.update({
        where: { id: dp.despachoId },
        data: { estado: 'CON_INCIDENCIA' },
      })
    }

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: dp.pedidoId,
        usuarioId,
        tipoEvento: 'INCIDENCIA_REGISTRADA',
        entidadTipo: 'Incidencia',
        entidadId: nueva.id,
        estadoAnterior: 'EN_RUTA',
        estadoNuevo: 'CON_INCIDENCIA',
        descripcion: `Incidencia registrada: ${tipo.nombre} - ${descripcion}`,
        ubicacionGPSId: null,
      },
    })

    return nueva
  })

  return getIncidenciaById(incidencia.id)
}

async function updateIncidencia(id, data) {
  const incidencia = await prisma.incidencia.findUnique({ where: { id } })
  if (!incidencia) throw new AppError('Incidencia no encontrada', 404)
  if (['RESUELTA', 'CERRADA', 'CANCELADA'].includes(incidencia.estado)) {
    throw new AppError('No se puede modificar una incidencia cerrada', 400)
  }

  return prisma.incidencia.update({
    where: { id },
    data,
    include: { tipo: true, despachoPedido: { include: { pedido: true } } },
  })
}

async function changeEstado(id, nuevoEstado, usuarioId, decisionOperativa, observaciones) {
  const incidencia = await prisma.incidencia.findUnique({
    where: { id },
    include: { despachoPedido: { include: { pedido: true, despacho: true } } },
  })
  if (!incidencia) throw new AppError('Incidencia no encontrada', 404)

  const estadoActual = incidencia.estado

  const transicionesValidas = {
    REPORTADA: ['EN_REVISION', 'CANCELADA'],
    EN_REVISION: ['EN_ATENCION', 'REPORTADA', 'CANCELADA'],
    EN_ATENCION: ['RESUELTA', 'EN_REVISION'],
    RESUELTA: ['CERRADA', 'EN_ATENCION'],
    CERRADA: [],
    CANCELADA: [],
  }

  if (!transicionesValidas[estadoActual]?.includes(nuevoEstado)) {
    throw new AppError(`Transición inválida: ${estadoActual} → ${nuevoEstado}`, 400)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = { estado: nuevoEstado }
    // CERRADA viene de RESUELTA, que ya fijó fecha y responsable
    if (nuevoEstado === 'RESUELTA') {
      data.fechaResolucion = new Date()
      data.resueltaPorId = usuarioId
    }
    if (decisionOperativa) data.decisionOperativa = decisionOperativa

    const i = await tx.incidencia.update({ where: { id }, data })

    // Al resolver o anular la incidencia, la parada vuelve a ruta, pero solo si sigue detenida
    // por la incidencia: si ya se entregó o pasó a devolución no se reabre (antes CERRADA la
    // reabría siempre, aunque la entrega ya estuviera hecha).
    if (['RESUELTA', 'CANCELADA'].includes(nuevoEstado)) {
      const dp = await tx.despachoPedido.findUnique({
        where: { id: incidencia.despachoPedidoId },
        include: { despacho: true, pedido: true },
      })
      if (dp?.estado === 'CON_INCIDENCIA') {
        await tx.despachoPedido.update({ where: { id: dp.id }, data: { estado: 'EN_RUTA' } })
        if (dp.pedido.estado === 'CON_INCIDENCIA') {
          await tx.pedido.update({ where: { id: dp.pedidoId }, data: { estado: 'EN_RUTA' } })
        }
      }
      if (dp?.despacho.estado === 'CON_INCIDENCIA') {
        const otrasAbiertas = await tx.incidencia.count({
          where: {
            despachoPedido: { despachoId: dp.despachoId },
            estado: { in: ['REPORTADA', 'EN_REVISION', 'EN_ATENCION'] },
            NOT: { id },
          },
        })
        if (otrasAbiertas === 0) {
          await tx.despacho.update({ where: { id: dp.despachoId }, data: { estado: 'EN_RUTA' } })
        }
      }
    }

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: incidencia.despachoPedido.pedidoId,
        usuarioId,
        tipoEvento: nuevoEstado === 'RESUELTA' ? 'INCIDENCIA_RESUELTA' : 'INCIDENCIA_REGISTRADA',
        entidadTipo: 'Incidencia',
        entidadId: id,
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
        descripcion: observaciones || decisionOperativa || `Incidencia ${nuevoEstado.toLowerCase()}`,
      },
    })

    return i
  })

  return getIncidenciaById(updated.id)
}

async function deleteIncidencia(id) {
  const incidencia = await prisma.incidencia.findUnique({ where: { id } })
  if (!incidencia) throw new AppError('Incidencia no encontrada', 404)
  if (incidencia.estado !== 'REPORTADA' && incidencia.estado !== 'CANCELADA') {
    throw new AppError('Solo se puede eliminar en REPORTADA o CANCELADA', 400)
  }

  await prisma.$transaction(async (tx) => {
    await tx.despachoPedido.update({
      where: { id: incidencia.despachoPedidoId },
      data: { estado: 'EN_RUTA' },
    })

    const dp = await tx.despachoPedido.findUnique({
      where: { id: incidencia.despachoPedidoId },
      include: { despacho: { include: { pedidos: true } } },
    })
    if (dp && dp.despacho) {
      const otrasIncidencias = await tx.incidencia.count({
        where: { despachoPedido: { despachoId: dp.despachoId }, estado: { in: ['REPORTADA', 'EN_REVISION', 'EN_ATENCION'] } },
      })
      if (otrasIncidencias === 0) {
        await tx.despacho.update({
          where: { id: dp.despachoId },
          data: { estado: 'EN_RUTA' },
        })
      }
    }

    await tx.incidencia.delete({ where: { id } })
  })

  return true
}

module.exports = {
  getResumenIncidencias,
  exportIncidenciasCsv,
  listIncidencias,
  getIncidenciaById,
  createIncidencia,
  updateIncidencia,
  changeEstado,
  deleteIncidencia,
}