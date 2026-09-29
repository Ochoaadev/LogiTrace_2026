// Exportación de trazabilidad: CSV de eventos (para análisis en hoja de cálculo) y PDF del
// expediente de un pedido ("Imprimir expediente de trazabilidad" del Figma).
const PDFDocument = require('pdfkit')
const prisma = require('../../config/database')
const { getExpediente } = require('./expediente.service')

const MAX_FILAS_CSV = 10000
const TZ = 'America/Caracas'

const fechaHora = (d) =>
  d ? new Date(d).toLocaleString('es-VE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }) : '—'

// RFC 4180: comillas si hay separador, comillas o salto de línea
function celdaCsv(valor) {
  if (valor === null || valor === undefined) return ''
  const s = String(valor)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * CSV de eventos. Con pedidoId exporta la línea temporal completa del expediente; sin él,
 * los eventos que cumplan los filtros (fechas, tipo). Separador ";" para que Excel en
 * configuración regional es-VE lo abra en columnas.
 */
async function exportEventosCsv(query) {
  const { pedidoId, tipoEvento, fechaDesde, fechaHasta } = query

  let filas
  if (pedidoId) {
    const exp = await getExpediente(pedidoId)
    filas = exp.timeline.map((e) => ({
      fechaHora: e.fechaHora,
      pedido: exp.pedido.codigo,
      modulo: `${e.modulo.numero} ${e.modulo.nombre}`,
      tipoEvento: e.tipoEvento,
      entidad: e.entidadTipo,
      estadoAnterior: e.estadoAnterior,
      estadoNuevo: e.estadoNuevo,
      descripcion: e.descripcion,
      usuario: e.usuario,
    }))
  } else {
    const where = {}
    if (tipoEvento) where.tipoEvento = tipoEvento
    if (fechaDesde || fechaHasta) {
      where.fechaHora = {}
      if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde)
      if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta)
    }
    const eventos = await prisma.eventoTrazabilidad.findMany({
      where,
      take: MAX_FILAS_CSV,
      orderBy: { fechaHora: 'asc' },
      include: {
        pedido: { select: { codigo: true } },
        usuario: { select: { nombre: true } },
      },
    })
    filas = eventos.map((e) => ({
      fechaHora: e.fechaHora,
      pedido: e.pedido?.codigo,
      modulo: '',
      tipoEvento: e.tipoEvento,
      entidad: e.entidadTipo,
      estadoAnterior: e.estadoAnterior,
      estadoNuevo: e.estadoNuevo,
      descripcion: e.descripcion,
      usuario: e.usuario?.nombre,
    }))
  }

  const encabezado = ['Fecha y hora', 'Pedido', 'Módulo', 'Tipo de evento', 'Entidad', 'Estado anterior', 'Estado nuevo', 'Descripción', 'Usuario']
  const lineas = filas.map((f) =>
    [fechaHora(f.fechaHora), f.pedido, f.modulo, f.tipoEvento, f.entidad, f.estadoAnterior, f.estadoNuevo, f.descripcion, f.usuario]
      .map(celdaCsv)
      .join(';')
  )
  // BOM para que Excel detecte UTF-8 (tildes y ñ)
  return '﻿' + [encabezado.join(';'), ...lineas].join('\r\n')
}

// ---------------------------------------------------------------- PDF

const AZUL = '#0f62fe'
const GRIS = '#525252'
const NEGRO = '#161616'
const ROJO = '#da1e28'
const MARGEN = 48

function seccion(doc, titulo) {
  if (doc.y > doc.page.height - 140) doc.addPage()
  doc.moveDown(0.8)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRIS).text(titulo.toUpperCase(), { characterSpacing: 0.8 })
  const y = doc.y + 3
  doc.moveTo(MARGEN, y).lineTo(doc.page.width - MARGEN, y).lineWidth(0.5).strokeColor('#c6c6c6').stroke()
  doc.moveDown(0.6)
  doc.font('Helvetica').fontSize(10).fillColor(NEGRO)
}

function campo(doc, etiqueta, valor) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRIS).text(`${etiqueta}: `, { continued: true })
  doc.font('Helvetica').fontSize(10).fillColor(NEGRO).text(valor ?? '—')
}

/**
 * Construye el PDF del expediente. Devuelve el documento ya cerrado (stream legible) para que
 * el controlador fije las cabeceras solo después de saber que el pedido existe.
 */
async function buildExpedientePdf(pedidoId, generadoPor) {
  const exp = await getExpediente(pedidoId)
  const doc = new PDFDocument({ size: 'LETTER', margin: MARGEN, info: { Title: `Expediente ${exp.pedido.codigo}` } })

  // Encabezado
  doc.rect(MARGEN, MARGEN, 18, 18).fill(AZUL)
  doc.font('Helvetica-Bold').fontSize(14).fillColor(NEGRO).text('LogiTrace', MARGEN + 26, MARGEN + 1)
  doc.font('Helvetica').fontSize(8).fillColor(GRIS).text('SuperTequeños C.A. · Valera, Trujillo', MARGEN + 26, MARGEN + 17)
  doc.moveDown(2)
  doc.x = MARGEN
  doc.font('Helvetica').fontSize(8).fillColor(AZUL).text('MÓDULO 07 · EXPEDIENTE DE TRAZABILIDAD', { characterSpacing: 0.8 })
  doc.font('Helvetica-Bold').fontSize(20).fillColor(NEGRO).text(`Pedido ${exp.pedido.codigo}`)
  doc.font('Helvetica').fontSize(9).fillColor(GRIS)
    .text(`Estado: ${exp.pedido.estado} · Registrado: ${fechaHora(exp.pedido.fechaHora)} · Emitido: ${fechaHora(new Date())}${generadoPor ? ` por ${generadoPor}` : ''}`)

  seccion(doc, 'Cliente / receptor')
  campo(doc, 'Cliente', exp.cliente.razonSocial)
  campo(doc, 'Contacto', [exp.cliente.contacto, exp.cliente.telefono].filter(Boolean).join(' · ') || null)
  campo(doc, 'Dirección de entrega', exp.pedido.direccionEntrega)
  campo(doc, 'Zona', exp.pedido.zona)

  seccion(doc, 'Carga')
  if (!exp.carga.length) doc.text('Sin productos registrados.')
  exp.carga.forEach((c) => {
    doc.text(`• ${c.cantidad} ${c.unidad} — ${c.producto}${c.lotes.length ? `  (Lote: ${c.lotes.join(', ')})` : ''}`)
  })

  seccion(doc, 'Logística y despacho')
  if (exp.logistica) {
    const l = exp.logistica
    campo(doc, 'Despacho', `${l.codigo} (${l.estado})`)
    campo(doc, 'Repartidor', l.repartidor)
    campo(doc, 'Vehículo', l.vehiculo ? `${l.vehiculo.codigo}${l.vehiculo.placa ? ` · ${l.vehiculo.placa}` : ''}${l.vehiculo.esTermico ? ' · térmico' : ''}` : null)
    campo(doc, 'Precinto de seguridad', l.precinto)
    campo(doc, 'Medio de conservación', l.medioConservacion)
    campo(doc, 'Salida', fechaHora(l.salida))
    campo(doc, 'Entrega', l.horaEntrega ? `${fechaHora(l.horaEntrega)}${l.receptor ? ` · recibió ${l.receptor}` : ''}` : l.estadoEntrega)
  } else {
    doc.text('El pedido aún no ha sido asignado a un despacho.')
  }

  seccion(doc, `Cadena de frío (límite crítico ${exp.cadenaFrio.limiteCriticoC} °C)`)
  if (!exp.cadenaFrio.registros.length) {
    doc.text('Sin registros manuales de temperatura.')
  } else {
    doc.fillColor(exp.cadenaFrio.conforme ? '#198038' : ROJO).font('Helvetica-Bold')
      .text(exp.cadenaFrio.conforme ? 'Cadena de frío preservada' : 'Cadena de frío con registros fuera de rango')
    doc.font('Helvetica').fillColor(NEGRO)
    exp.cadenaFrio.registros.forEach((r) => {
      doc.fillColor(r.fueraDeRango ? ROJO : NEGRO)
        .text(`${fechaHora(r.fechaHora)}  ${r.temperaturaC.toFixed(1)} °C  · ${r.origen || r.tipoRegistro}${r.usuario ? ` · ${r.usuario}` : ''}`)
    })
    doc.fillColor(NEGRO)
  }

  seccion(doc, `Línea temporal de eventos (${exp.timeline.length})`)
  if (!exp.timeline.length) doc.text('Sin eventos registrados.')
  exp.timeline.forEach((e, i) => {
    if (doc.y > doc.page.height - 100) doc.addPage()
    doc.font('Helvetica-Bold').fontSize(10).fillColor(e.categoria === 'incidencia' ? ROJO : NEGRO)
      .text(`${i + 1}. ${fechaHora(e.fechaHora)} — ${e.titulo}`)
    doc.font('Helvetica').fontSize(8).fillColor(AZUL).text(`MÓDULO ${e.modulo.numero} · ${e.modulo.nombre.toUpperCase()}`)
    if (e.descripcion) doc.fontSize(9).fillColor(NEGRO).text(e.descripcion)
    const meta = [
      e.usuario && `Operador: ${e.usuario}`,
      e.estadoNuevo && `Estado: ${e.estadoAnterior || '—'} > ${e.estadoNuevo}`,
    ].filter(Boolean).join('   ')
    if (meta) doc.fontSize(8).fillColor(GRIS).text(meta)
    doc.moveDown(0.5)
  })

  if (exp.incidencias.length || exp.devoluciones.length || exp.movimientos.length) {
    seccion(doc, 'Registros relacionados')
    exp.incidencias.forEach((i) => doc.text(`Incidencia ${i.codigo} · ${i.tipo || ''} · ${i.estado}`))
    exp.devoluciones.forEach((d) => doc.text(`Devolución ${d.codigo} · ${d.motivo || ''} · ${d.estado}`))
    exp.movimientos.forEach((m) => doc.text(`Movimiento ${m.tipo} · ${m.cantidad} ${m.unidad} · lote ${m.lote || '—'} · ${fechaHora(m.fechaHora)}`))
  }

  if (exp.responsables.length) {
    seccion(doc, 'Responsables involucrados')
    exp.responsables.forEach((r) => doc.text(`${r.funcion}: ${r.nombre}`))
  }

  doc.moveDown(1.5)
  doc.fontSize(7).fillColor(GRIS).text(
    'Documento generado automáticamente por LogiTrace a partir de los eventos registrados en cada módulo operativo. '
      + 'Los registros conservan operador y hora exacta; las temperaturas corresponden a mediciones manuales.',
    { align: 'left' }
  )

  doc.end()
  return { codigo: exp.pedido.codigo, doc }
}

module.exports = { exportEventosCsv, buildExpedientePdf }
