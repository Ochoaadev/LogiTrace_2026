const PDFDocument = require('pdfkit')
const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { celdaCsv } = require('../../utils/csv')
const { codigoUnico } = require('../../utils/codigos')

const TZ = 'America/Caracas'
const ESTADOS_PENDIENTES = ['REGISTRADO', 'EN_ALMACENAMIENTO']
const ESTADOS_RETIRADOS = ['RETIRADO', 'DISPOSICION_FINAL']

const TRANSICIONES_RESIDUO = {
  REGISTRADO: ['EN_ALMACENAMIENTO', 'ANULADO'],
  EN_ALMACENAMIENTO: ['RETIRADO', 'ANULADO'],
  RETIRADO: ['DISPOSICION_FINAL'],
  DISPOSICION_FINAL: [],
  ANULADO: [],
}

const DESCRIPCION_ESTADO = {
  EN_ALMACENAMIENTO: 'Residuo trasladado a almacenamiento temporal',
  RETIRADO: 'Residuo retirado por el gestor',
  DISPOSICION_FINAL: 'Disposición final confirmada',
  ANULADO: 'Registro de residuo anulado',
}

const INCLUDE_LISTA = {
  tipoResiduo: { select: { id: true, codigo: true, nombre: true, unidadBase: true } },
  devolucion: { select: { id: true, codigo: true, despachoPedido: { select: { pedido: { select: { id: true, codigo: true } } } } } },
  gestor: { select: { id: true, codigo: true, nombre: true, tipo: true, ubicacion: true } },
}

// Inicio del mes en curso en hora de Venezuela (UTC-4, sin horario de verano)
function inicioMesCaracas(ahora = new Date()) {
  const local = new Date(ahora.getTime() - 4 * 3600 * 1000)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, 4))
}

function rangoFechas(campo, fechaDesde, fechaHasta) {
  if (!fechaDesde && !fechaHasta) return {}
  const rango = {}
  if (fechaDesde) rango.gte = new Date(fechaDesde)
  if (fechaHasta) rango.lte = new Date(fechaHasta)
  return { [campo]: rango }
}

function buildWhere(query) {
  const { estado, pendientes, tipoResiduoId, gestorId, devolucionId, fechaDesde, fechaHasta, search } = query
  const where = { ...rangoFechas('fechaGeneracion', fechaDesde, fechaHasta) }

  if (estado) where.estado = estado
  else if (pendientes === 'true') where.estado = { in: ESTADOS_PENDIENTES }
  if (tipoResiduoId) where.tipoResiduoId = tipoResiduoId
  if (gestorId) where.gestorId = gestorId
  if (devolucionId) where.devolucionId = devolucionId
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { tipoResiduo: { nombre: { contains: search, mode: 'insensitive' } } },
      { origen: { contains: search, mode: 'insensitive' } },
      { observaciones: { contains: search, mode: 'insensitive' } },
      { devolucion: { codigo: { contains: search, mode: 'insensitive' } } },
      { gestor: { nombre: { contains: search, mode: 'insensitive' } } },
    ]
  }
  return where
}

async function listResiduos(query) {
  const { page, limit, skip } = getPagination(query)
  const where = buildWhere(query)
  // Los pendientes de retiro se atienden por antigüedad; la bitácora muestra lo más reciente
  const orderBy = query.pendientes === 'true' ? { fechaGeneracion: 'asc' } : { fechaGeneracion: 'desc' }

  const [residuos, total] = await Promise.all([
    prisma.residuo.findMany({ where, skip, take: limit, orderBy, include: INCLUDE_LISTA }),
    prisma.residuo.count({ where }),
  ])

  return { data: residuos, total, page, limit }
}

// Eventos del residuo registrados en trazabilidad (historial de estados)
async function getResiduoById(id) {
  const residuo = await prisma.residuo.findUnique({
    where: { id },
    include: {
      tipoResiduo: true,
      devolucion: {
        include: {
          despachoPedido: {
            include: {
              pedido: { select: { id: true, codigo: true, cliente: { select: { razonSocial: true } } } },
              despacho: { select: { codigo: true } },
            },
          },
        },
      },
      gestor: true,
    },
  })
  if (!residuo) throw new AppError('Residuo no encontrado', 404)

  const eventos = await prisma.eventoTrazabilidad.findMany({
    where: { entidadTipo: 'Residuo', entidadId: id },
    orderBy: { fechaHora: 'asc' },
    select: { id: true, fechaHora: true, estadoAnterior: true, estadoNuevo: true, descripcion: true, usuario: { select: { nombre: true } } },
  })

  return { ...residuo, eventos }
}

async function validarGestor(gestorId) {
  const gestor = await prisma.gestorResiduo.findUnique({ where: { id: gestorId } })
  if (!gestor) throw new AppError('Gestor de residuo no encontrado', 404)
  if (!gestor.activo) throw new AppError('Gestor inactivo', 400)
  return gestor
}

async function createResiduo(data, usuarioId) {
  const { tipoResiduoId, devolucionId, gestorId, cantidad, unidad, origen, observaciones } = data

  if (!(Number(cantidad) > 0)) throw new AppError('La cantidad debe ser mayor a cero', 400)

  const tipoResiduo = await prisma.tipoResiduo.findUnique({ where: { id: tipoResiduoId } })
  if (!tipoResiduo) throw new AppError('Tipo de residuo no encontrado', 404)
  if (!tipoResiduo.activo) throw new AppError('Tipo de residuo inactivo', 400)

  let pedidoId = null
  let devolucion = null
  if (devolucionId) {
    devolucion = await prisma.devolucion.findUnique({ where: { id: devolucionId }, include: { despachoPedido: { select: { pedidoId: true } } } })
    if (!devolucion) throw new AppError('Devolución no encontrada', 404)
    pedidoId = devolucion.despachoPedido?.pedidoId || null
  }

  const gestor = gestorId ? await validarGestor(gestorId) : null

  const residuo = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.residuo.create({
      data: {
        codigo: await codigoUnico('RES', 'residuo', tx),
        tipoResiduoId,
        devolucionId: devolucionId || null,
        gestorId: gestorId || null,
        cantidad,
        unidad,
        origen: origen || (devolucion ? `Devolución ${devolucion.codigo}` : null),
        observaciones: observaciones || null,
        estado: 'REGISTRADO',
      },
    })

    // EventoTrazabilidad no tiene devolucionId (antes se enviaba y la creación fallaba siempre);
    // se vincula al pedido de la devolución para que aparezca en su expediente.
    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId,
        usuarioId,
        tipoEvento: 'RESIDUO_REGISTRADO',
        entidadTipo: 'Residuo',
        entidadId: nuevo.id,
        estadoNuevo: 'REGISTRADO',
        descripcion: `Residuo ${nuevo.codigo} registrado: ${tipoResiduo.nombre}, ${cantidad} ${unidad}`
          + `${gestor ? ` · destino previsto ${gestor.nombre}` : ''}`,
      },
    })

    return nuevo
  })

  return getResiduoById(residuo.id)
}

async function updateResiduo(id, data) {
  const residuo = await prisma.residuo.findUnique({ where: { id } })
  if (!residuo) throw new AppError('Residuo no encontrado', 404)
  if (!ESTADOS_PENDIENTES.includes(residuo.estado)) {
    throw new AppError('Solo se puede modificar un residuo pendiente de retiro', 400)
  }

  const updateData = {}
  if (data.tipoResiduoId) updateData.tipoResiduoId = data.tipoResiduoId
  if (data.gestorId) {
    await validarGestor(data.gestorId)
    updateData.gestorId = data.gestorId
  }
  if (data.cantidad !== undefined) {
    if (!(Number(data.cantidad) > 0)) throw new AppError('La cantidad debe ser mayor a cero', 400)
    updateData.cantidad = data.cantidad
  }
  if (data.unidad) updateData.unidad = data.unidad
  if (data.origen !== undefined) updateData.origen = data.origen
  if (data.observaciones !== undefined) updateData.observaciones = data.observaciones

  await prisma.residuo.update({ where: { id }, data: updateData })
  return getResiduoById(id)
}

/**
 * Circuito del residuo: REGISTRADO → EN_ALMACENAMIENTO → RETIRADO → DISPOSICION_FINAL (o ANULADO
 * mientras siga en planta). El retiro exige un gestor (el indicado aquí o el previsto al registrar)
 * y fija la fecha de retiro. Cada paso queda en la trazabilidad del pedido de origen, si lo hay.
 */
async function changeEstado(id, nuevoEstado, usuarioId, { observaciones, gestorId } = {}) {
  const residuo = await prisma.residuo.findUnique({
    where: { id },
    include: {
      tipoResiduo: { select: { nombre: true } },
      devolucion: { select: { despachoPedido: { select: { pedidoId: true } } } },
    },
  })
  if (!residuo) throw new AppError('Residuo no encontrado', 404)

  const estadoActual = residuo.estado
  if (!TRANSICIONES_RESIDUO[estadoActual]?.includes(nuevoEstado)) {
    throw new AppError(`Transición inválida: ${estadoActual} → ${nuevoEstado}`, 400)
  }

  const data = { estado: nuevoEstado }
  let gestor = null
  if (nuevoEstado === 'RETIRADO') {
    const idGestor = gestorId || residuo.gestorId
    if (!idGestor) throw new AppError('Indique el gestor que retira el residuo', 400)
    gestor = await validarGestor(idGestor)
    data.gestorId = idGestor
    data.fechaRetiro = new Date()
  }
  if (nuevoEstado === 'ANULADO' && !observaciones?.trim()) {
    throw new AppError('Indique el motivo de la anulación', 400)
  }

  await prisma.$transaction(async (tx) => {
    await tx.residuo.update({ where: { id }, data })

    const detalle = [
      DESCRIPCION_ESTADO[nuevoEstado],
      gestor ? gestor.nombre : null,
      observaciones?.trim() || null,
    ].filter(Boolean).join(' · ')

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: residuo.devolucion?.despachoPedido?.pedidoId || null,
        usuarioId,
        tipoEvento: 'RESIDUO_REGISTRADO',
        entidadTipo: 'Residuo',
        entidadId: id,
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
        descripcion: `${residuo.codigo} (${residuo.tipoResiduo.nombre}): ${detalle}`,
      },
    })
  })

  return getResiduoById(id)
}

async function deleteResiduo(id) {
  const residuo = await prisma.residuo.findUnique({ where: { id } })
  if (!residuo) throw new AppError('Residuo no encontrado', 404)
  if (residuo.estado !== 'REGISTRADO' && residuo.estado !== 'ANULADO') {
    throw new AppError('Solo se puede eliminar en REGISTRADO o ANULADO', 400)
  }

  await prisma.residuo.delete({ where: { id } })
  return true
}

// Suma cantidades agrupadas por unidad: [{ unidad, total }]
function sumarPorUnidad(filas) {
  const mapa = new Map()
  filas.forEach((f) => mapa.set(f.unidad, (mapa.get(f.unidad) || 0) + Number(f._sum.cantidad || 0)))
  return [...mapa].map(([unidad, total]) => ({ unidad, total: Math.round(total * 100) / 100 }))
}

/**
 * Resumen del módulo 08. Las cantidades por tipo cubren el periodo (por defecto, el mes en curso);
 * pendientes, trazabilidad y gestores cubren todos los registros vigentes.
 */
async function getResumenResiduos(query) {
  const desde = query.fechaDesde ? new Date(query.fechaDesde) : inicioMesCaracas()
  const hasta = query.fechaHasta ? new Date(query.fechaHasta) : new Date()
  const vigentes = { estado: { not: 'ANULADO' } }
  const enPeriodo = { ...vigentes, fechaGeneracion: { gte: desde, lte: hasta } }

  const [
    tipos, gestores, porTipoUnidad, devolucionPorTipo, porEstado, porGestor,
    retirosPeriodo, ultimoRetiro, totalVigentes, conGestor, pendientesSinGestor,
  ] = await Promise.all([
    prisma.tipoResiduo.findMany({ orderBy: { codigo: 'asc' }, select: { id: true, codigo: true, nombre: true, unidadBase: true, activo: true } }),
    prisma.gestorResiduo.findMany({ orderBy: { codigo: 'asc' } }),
    prisma.residuo.groupBy({ by: ['tipoResiduoId', 'unidad'], where: enPeriodo, _sum: { cantidad: true }, _count: { _all: true } }),
    prisma.residuo.groupBy({ by: ['tipoResiduoId'], where: { ...enPeriodo, devolucionId: { not: null } }, _count: { _all: true } }),
    prisma.residuo.groupBy({ by: ['estado'], _count: { _all: true } }),
    prisma.residuo.groupBy({ by: ['gestorId', 'estado', 'unidad'], where: { ...vigentes, gestorId: { not: null } }, _sum: { cantidad: true }, _count: { _all: true } }),
    prisma.residuo.count({ where: { estado: { in: ESTADOS_RETIRADOS }, fechaRetiro: { gte: desde, lte: hasta } } }),
    prisma.residuo.findFirst({
      where: { estado: { in: ESTADOS_RETIRADOS }, fechaRetiro: { not: null } },
      orderBy: { fechaRetiro: 'desc' },
      select: { codigo: true, fechaRetiro: true, gestor: { select: { nombre: true } } },
    }),
    prisma.residuo.count({ where: vigentes }),
    prisma.residuo.count({ where: { ...vigentes, gestorId: { not: null } } }),
    prisma.residuo.count({ where: { estado: { in: ESTADOS_PENDIENTES }, gestorId: null } }),
  ])

  // Gestor más frecuente por tipo de residuo (destino habitual que muestran las tarjetas)
  const destinos = await prisma.residuo.groupBy({
    by: ['tipoResiduoId', 'gestorId'],
    where: { ...vigentes, gestorId: { not: null } },
    _count: { _all: true },
  })
  const nombreGestor = new Map(gestores.map((g) => [g.id, g.nombre]))
  const destinoHabitual = (tipoId) => {
    const candidatos = destinos.filter((d) => d.tipoResiduoId === tipoId).sort((a, b) => b._count._all - a._count._all)
    return candidatos[0] ? nombreGestor.get(candidatos[0].gestorId) : null
  }

  const porTipo = tipos.map((t) => {
    const filas = porTipoUnidad.filter((f) => f.tipoResiduoId === t.id)
    return {
      ...t,
      cantidades: sumarPorUnidad(filas),
      registros: filas.reduce((s, f) => s + f._count._all, 0),
      desdeDevolucion: devolucionPorTipo.find((d) => d.tipoResiduoId === t.id)?._count._all || 0,
      destinoHabitual: destinoHabitual(t.id),
    }
  })

  const conteoEstado = Object.fromEntries(porEstado.map((e) => [e.estado, e._count._all]))

  const gestoresResumen = gestores.map((g) => {
    const filas = porGestor.filter((f) => f.gestorId === g.id)
    const pendientes = filas.filter((f) => ESTADOS_PENDIENTES.includes(f.estado))
    const retirados = filas.filter((f) => ESTADOS_RETIRADOS.includes(f.estado))
    return {
      id: g.id,
      codigo: g.codigo,
      nombre: g.nombre,
      tipo: g.tipo,
      contacto: g.contacto,
      ubicacion: g.ubicacion,
      activo: g.activo,
      pendientes: { registros: pendientes.reduce((s, f) => s + f._count._all, 0), cantidades: sumarPorUnidad(pendientes) },
      retirados: { registros: retirados.reduce((s, f) => s + f._count._all, 0), cantidades: sumarPorUnidad(retirados) },
    }
  })

  return {
    periodo: { desde, hasta },
    porTipo,
    porEstado: conteoEstado,
    pendientesRetiro: ESTADOS_PENDIENTES.reduce((s, e) => s + (conteoEstado[e] || 0), 0),
    pendientesSinGestor,
    retiros: {
      periodo: retirosPeriodo,
      ultimo: ultimoRetiro ? { codigo: ultimoRetiro.codigo, fecha: ultimoRetiro.fechaRetiro, gestor: ultimoRetiro.gestor?.nombre } : null,
    },
    trazabilidad: {
      vigentes: totalVigentes,
      conGestor,
      porcentaje: totalVigentes ? Math.round((conGestor / totalVigentes) * 100) : null,
    },
    gestores: gestoresResumen,
  }
}

// ---------------------------------------------------------------- Exportación

const fechaHora = (d) =>
  d ? new Date(d).toLocaleString('es-VE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }) : ''


// CSV de la bitácora (mismos filtros que la lista). Separador ";" para Excel es-VE.
async function exportResiduosCsv(query) {
  const residuos = await prisma.residuo.findMany({
    where: buildWhere(query),
    orderBy: { fechaGeneracion: 'desc' },
    take: 10000,
    include: INCLUDE_LISTA,
  })
  const encabezado = ['Código', 'Fecha de registro', 'Tipo de residuo', 'Cantidad', 'Unidad', 'Origen', 'Devolución', 'Pedido', 'Estado', 'Gestor / destino', 'Fecha de retiro', 'Observaciones']
  const filas = residuos.map((r) => [
    r.codigo, fechaHora(r.fechaGeneracion), r.tipoResiduo?.nombre, String(Number(r.cantidad)).replace('.', ','), r.unidad,
    r.origen, r.devolucion?.codigo, r.devolucion?.despachoPedido?.pedido?.codigo, r.estado, r.gestor?.nombre,
    fechaHora(r.fechaRetiro), r.observaciones,
  ].map(celdaCsv).join(';'))
  return '﻿' + [encabezado.join(';'), ...filas].join('\r\n')
}

const AZUL = '#0f62fe'
const GRIS = '#525252'
const NEGRO = '#161616'
const MARGEN = 48

/**
 * Manifiesto de entrega ambiental: residuos retirados en el periodo (por defecto, el mes en curso),
 * agrupados por gestor, con totales por unidad y espacio para firmas de entrega y recepción.
 */
async function buildManifiestoPdf(query, generadoPor) {
  const desde = query.fechaDesde ? new Date(query.fechaDesde) : inicioMesCaracas()
  const hasta = query.fechaHasta ? new Date(query.fechaHasta) : new Date()
  const where = { estado: { in: ESTADOS_RETIRADOS }, gestorId: { not: null }, fechaRetiro: { gte: desde, lte: hasta } }
  if (query.gestorId) where.gestorId = query.gestorId

  const residuos = await prisma.residuo.findMany({
    where,
    orderBy: [{ gestorId: 'asc' }, { fechaRetiro: 'asc' }],
    include: INCLUDE_LISTA,
  })
  if (!residuos.length) throw new AppError('No hay retiros registrados en el periodo seleccionado', 404)

  const grupos = new Map()
  residuos.forEach((r) => {
    if (!grupos.has(r.gestorId)) grupos.set(r.gestorId, { gestor: r.gestor, residuos: [] })
    grupos.get(r.gestorId).residuos.push(r)
  })

  const fecha = (d) => new Date(d).toLocaleDateString('es-VE', { timeZone: TZ })
  const doc = new PDFDocument({ size: 'LETTER', margin: MARGEN, info: { Title: 'Manifiesto de entrega ambiental' } })
  const ancho = doc.page.width - MARGEN * 2

  let primero = true
  for (const { gestor, residuos: lista } of grupos.values()) {
    if (!primero) doc.addPage()
    primero = false

    doc.rect(MARGEN, MARGEN, 18, 18).fill(AZUL)
    doc.font('Helvetica-Bold').fontSize(14).fillColor(NEGRO).text('LogiTrace', MARGEN + 26, MARGEN + 1)
    doc.font('Helvetica').fontSize(8).fillColor(GRIS).text('SuperTequeños C.A. · Planta El Murachí, Valera, Trujillo', MARGEN + 26, MARGEN + 17)
    doc.moveDown(2)
    doc.x = MARGEN
    doc.font('Helvetica').fontSize(8).fillColor(AZUL).text('MÓDULO 08 · GESTIÓN DE RESIDUOS', { characterSpacing: 0.8 })
    doc.font('Helvetica-Bold').fontSize(18).fillColor(NEGRO).text('Manifiesto de entrega ambiental')
    doc.font('Helvetica').fontSize(9).fillColor(GRIS)
      .text(`Periodo: ${fecha(desde)} al ${fecha(hasta)} · Emitido: ${fechaHora(new Date())}${generadoPor ? ` por ${generadoPor}` : ''}`)

    doc.moveDown(1)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRIS).text('GESTOR RECEPTOR', { characterSpacing: 0.8 })
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NEGRO).text(`${gestor.nombre} (${gestor.codigo})`)
    doc.font('Helvetica').fontSize(9).fillColor(GRIS)
      .text(`${gestor.tipo === 'EXTERNO' ? 'Gestor externo autorizado' : 'Gestión interna'}${gestor.ubicacion ? ` · ${gestor.ubicacion}` : ''}`)

    // Tabla de residuos entregados
    const columnas = [
      { titulo: 'Registro', ancho: 92 }, { titulo: 'Retiro', ancho: 62 }, { titulo: 'Tipo', ancho: 120 },
      { titulo: 'Cantidad', ancho: 70 }, { titulo: 'Origen', ancho: ancho - 92 - 62 - 120 - 70 },
    ]
    const fila = (valores, negrita = false) => {
      if (doc.y > doc.page.height - 160) doc.addPage()
      const y = doc.y
      let x = MARGEN
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(negrita ? GRIS : NEGRO)
      const alturas = valores.map((v, i) => doc.heightOfString(v ?? '—', { width: columnas[i].ancho - 6 }))
      valores.forEach((v, i) => {
        doc.text(v ?? '—', x, y, { width: columnas[i].ancho - 6 })
        x += columnas[i].ancho
      })
      doc.y = y + Math.max(...alturas) + 4
      doc.moveTo(MARGEN, doc.y - 2).lineTo(MARGEN + ancho, doc.y - 2).lineWidth(0.5).strokeColor('#e0e0e0').stroke()
    }

    doc.moveDown(1)
    fila(columnas.map((c) => c.titulo.toUpperCase()), true)
    lista.forEach((r) => fila([
      r.codigo, fecha(r.fechaRetiro), r.tipoResiduo.nombre, `${Number(r.cantidad)} ${r.unidad}`,
      [r.origen, r.devolucion ? `Dev. ${r.devolucion.codigo}` : null].filter(Boolean).join(' · ') || null,
    ]))

    const totales = new Map()
    lista.forEach((r) => totales.set(r.unidad, (totales.get(r.unidad) || 0) + Number(r.cantidad)))
    doc.x = MARGEN
    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NEGRO)
      .text(`Total entregado: ${[...totales].map(([u, t]) => `${Math.round(t * 100) / 100} ${u}`).join(' · ')} (${lista.length} registros)`)

    // Firmas
    if (doc.y > doc.page.height - 150) doc.addPage()
    const yFirma = doc.y + 60
    const anchoFirma = (ancho - 40) / 2
    ;[['Entrega (SuperTequeños C.A.)', MARGEN], [`Recibe (${gestor.nombre})`, MARGEN + anchoFirma + 40]].forEach(([texto, x]) => {
      doc.moveTo(x, yFirma).lineTo(x + anchoFirma, yFirma).lineWidth(0.7).strokeColor(NEGRO).stroke()
      doc.font('Helvetica').fontSize(8).fillColor(GRIS).text(`${texto} · nombre, firma y sello`, x, yFirma + 4, { width: anchoFirma })
    })
    doc.x = MARGEN
    doc.y = yFirma + 40
    doc.fontSize(7).fillColor(GRIS).text(
      'Documento generado por LogiTrace a partir de los retiros registrados en el módulo de residuos. '
        + 'Cada registro conserva el operador y la hora de cada cambio de estado en la trazabilidad.',
      { width: ancho }
    )
  }

  doc.end()
  return doc
}

module.exports = {
  listResiduos,
  getResiduoById,
  createResiduo,
  updateResiduo,
  changeEstado,
  deleteResiduo,
  getResumenResiduos,
  exportResiduosCsv,
  buildManifiestoPdf,
  TRANSICIONES_RESIDUO,
}
