// Reporte operativo del módulo 09: indicadores de rendimiento calculados con consultas agregadas
// sobre pedidos, paradas de despacho, incidencias, devoluciones, temperaturas y residuos.
const PDFDocument = require('pdfkit')
const prisma = require('../../config/database')
const { AppError } = require('../../utils/AppError')
const { celdaCsv } = require('../../utils/csv')
const { PARAMETROS } = require('../../config/parametros')
const { LIMITE_CRITICO_C } = require('../trazabilidad/expediente.service')
const { getResumenResiduos } = require('../residuos/residuo.service')

const DIA = 24 * 3600 * 1000
const TZ = 'America/Caracas'
const PREFIJO_DEMO = 'DMR-'

// Metas de referencia de la operación (se muestran junto a cada indicador)
// Metas de referencia de la operación (src/config/parametros.js)
const METAS = {
  eficaciaMinima: PARAMETROS.eficaciaMinima, // % de entregas conformes
  cicloEstandarMin: PARAMETROS.cicloEstandarMin, // minutos de salida a entrega
  incidenciasMaxima: PARAMETROS.incidenciasMaxima, // % de paradas con incidencia
  retornosMaximo: PARAMETROS.tasaRetornoMax, // % de paradas con devolución
}

const PARADAS_CERRADAS = ['ENTREGADO', 'DEVUELTO', 'REPROGRAMADO']
const INCIDENCIAS_ABIERTAS = ['REPORTADA', 'EN_REVISION', 'EN_ATENCION']
const SECCIONES = ['entregas', 'incidencias', 'devoluciones', 'residuos']

const promedio = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
const redondear = (n, d = 1) => (n === null || n === undefined ? null : Math.round(n * 10 ** d) / 10 ** d)
const porcentaje = (n, total) => (total ? redondear((n / total) * 100) : null)
const minutosEntre = (a, b) => (b - a) / 60000
const delta = (actual, anterior) => (actual === null || anterior === null ? null : redondear(actual - anterior))

function resolverPeriodo(query) {
  const hasta = query.fechaHasta ? new Date(query.fechaHasta) : new Date()
  const desde = query.fechaDesde ? new Date(query.fechaDesde) : new Date(hasta.getTime() - 30 * DIA)
  if (desde >= hasta) throw new AppError('La fecha inicial debe ser anterior a la final', 400)
  const largo = hasta - desde
  return {
    desde,
    hasta,
    dias: Math.max(1, Math.ceil(largo / DIA - 0.001)),
    anterior: { desde: new Date(desde.getTime() - largo), hasta: desde },
  }
}

const filtroZonaParada = (zonaId) => (zonaId ? { pedido: { zonaId } } : {})

// Paradas despachadas (salida del despacho dentro del periodo)
function paradasDelPeriodo(desde, hasta, zonaId) {
  return prisma.despachoPedido.findMany({
    where: { despacho: { fechaHoraSalida: { gte: desde, lt: hasta } }, ...filtroZonaParada(zonaId) },
    select: {
      estado: true,
      horaEntrega: true,
      despacho: { select: { fechaHoraSalida: true } },
      pedido: { select: { zonaId: true } },
      _count: { select: { incidencias: true } },
    },
  })
}

function indicadoresEntrega(paradas) {
  const cerradas = paradas.filter((p) => PARADAS_CERRADAS.includes(p.estado))
  const conformes = cerradas.filter((p) => p.estado === 'ENTREGADO' && p._count.incidencias === 0)
  const ciclos = paradas
    .filter((p) => p.estado === 'ENTREGADO' && p.horaEntrega && p.despacho.fechaHoraSalida)
    .map((p) => minutosEntre(p.despacho.fechaHoraSalida, p.horaEntrega))
    .filter((m) => m >= 0)
  return {
    despachadas: paradas.length,
    cerradas: cerradas.length,
    conformes: conformes.length,
    eficacia: porcentaje(conformes.length, cerradas.length),
    cicloMin: redondear(promedio(ciclos)),
    entregasMedidas: ciclos.length,
  }
}

async function contarPeriodo(desde, hasta, zonaId) {
  const [incidencias, devoluciones] = await Promise.all([
    prisma.incidencia.count({ where: { fechaHora: { gte: desde, lt: hasta }, estado: { not: 'CANCELADA' }, despachoPedido: filtroZonaParada(zonaId) } }),
    prisma.devolucion.count({ where: { fechaRegistro: { gte: desde, lt: hasta }, estado: { not: 'CANCELADA' }, despachoPedido: filtroZonaParada(zonaId) } }),
  ])
  return { incidencias, devoluciones }
}

function estadoSector(eficacia) {
  if (eficacia === null) return 'SIN_DATOS'
  if (eficacia >= METAS.eficaciaMinima) return 'OPTIMO'
  if (eficacia >= METAS.eficaciaMinima - 7) return 'REGULAR'
  return 'ATENCION'
}

/**
 * Reporte consolidado del periodo (por defecto, últimos 30 días) y comparación con el periodo
 * anterior de igual duración. zonaId limita pedidos, paradas, incidencias y devoluciones al sector;
 * temperaturas y residuos son de planta y no dependen del sector.
 */
async function getReporteOperativo(query) {
  const { zonaId } = query
  const periodo = resolverPeriodo(query)
  const { desde, hasta, anterior } = periodo
  const enPeriodo = { gte: desde, lt: hasta }

  const [
    zona, zonas, paradas, paradasAnt, conteoAnt, pedidosPorZona, pedidosPorEstado,
    incidencias, devoluciones, temperaturas, tiposIncidencia, motivos, residuos, pedidosDemo,
  ] = await Promise.all([
    zonaId ? prisma.zonaDespacho.findUnique({ where: { id: zonaId }, select: { id: true, nombre: true } }) : null,
    prisma.zonaDespacho.findMany({ where: zonaId ? { id: zonaId } : { activo: true }, select: { id: true, codigo: true, nombre: true, municipio: true } }),
    paradasDelPeriodo(desde, hasta, zonaId),
    paradasDelPeriodo(anterior.desde, anterior.hasta, zonaId),
    contarPeriodo(anterior.desde, anterior.hasta, zonaId),
    prisma.pedido.groupBy({ by: ['zonaId'], where: { fechaHora: enPeriodo, estado: { not: 'CANCELADO' }, ...(zonaId && { zonaId }) }, _count: { _all: true } }),
    prisma.pedido.groupBy({ by: ['estado'], where: { fechaHora: enPeriodo, ...(zonaId && { zonaId }) }, _count: { _all: true } }),
    prisma.incidencia.findMany({
      where: { fechaHora: enPeriodo, estado: { not: 'CANCELADA' }, despachoPedido: filtroZonaParada(zonaId) },
      orderBy: { fechaHora: 'desc' },
      select: {
        id: true, codigo: true, estado: true, fechaHora: true, fechaResolucion: true, tipoIncidenciaId: true,
        despachoPedido: { select: { pedido: { select: { codigo: true, zonaId: true } } } },
      },
    }),
    prisma.devolucion.findMany({
      where: { fechaRegistro: enPeriodo, estado: { not: 'CANCELADA' }, despachoPedido: filtroZonaParada(zonaId) },
      select: { estado: true, fechaRegistro: true, fechaRecepcion: true, motivoId: true, detalles: { select: { decision: true } } },
    }),
    prisma.registroTemperatura.findMany({ where: { fechaHora: enPeriodo }, select: { tipoRegistro: true, temperaturaC: true } }),
    prisma.tipoIncidencia.findMany({ select: { id: true, nombre: true, descripcion: true } }),
    prisma.motivoDevolucion.findMany({ select: { id: true, nombre: true } }),
    getResumenResiduos({ fechaDesde: desde.toISOString(), fechaHasta: hasta.toISOString() }),
    // Pedidos generados por scripts/seed-demo-reportes.js (la pantalla lo indica como modo demostración)
    prisma.pedido.count({ where: { codigo: { startsWith: PREFIJO_DEMO }, fechaHora: enPeriodo } }),
  ])
  if (zonaId && !zona) throw new AppError('Sector no encontrado', 404)

  // ---- Indicadores principales
  const entrega = indicadoresEntrega(paradas)
  const entregaAnt = indicadoresEntrega(paradasAnt)
  const tasaIncidencias = porcentaje(incidencias.length, entrega.despachadas)
  const tasaIncidenciasAnt = porcentaje(conteoAnt.incidencias, entregaAnt.despachadas)
  const tasaRetornos = porcentaje(devoluciones.length, entrega.despachadas)
  const tasaRetornosAnt = porcentaje(conteoAnt.devoluciones, entregaAnt.despachadas)

  const decisiones = { REINGRESO: 0, CUARENTENA: 0, DESCARTE: 0 }
  devoluciones.forEach((d) => d.detalles.forEach((x) => { if (x.decision) decisiones[x.decision] += 1 }))

  const temps = temperaturas.map((t) => ({ tipo: t.tipoRegistro, c: Number(t.temperaturaC) }))
  const dentro = (lista) => lista.filter((t) => t.c <= LIMITE_CRITICO_C).length
  const cava = temps.filter((t) => t.tipo === 'CAVA')
  const cadenaFrio = {
    limiteC: LIMITE_CRITICO_C,
    registros: temps.length,
    dentro: dentro(temps),
    porcentaje: porcentaje(dentro(temps), temps.length),
    minC: temps.length ? Math.min(...temps.map((t) => t.c)) : null,
    maxC: temps.length ? Math.max(...temps.map((t) => t.c)) : null,
    cava: { registros: cava.length, dentro: dentro(cava) },
  }

  // ---- Sectores
  const volumenTotal = pedidosPorZona.filter((p) => p.zonaId).reduce((s, p) => s + p._count._all, 0)
  const sectores = zonas.map((z) => {
    const deZona = paradas.filter((p) => p.pedido.zonaId === z.id)
    const ind = indicadoresEntrega(deZona)
    const volumen = pedidosPorZona.find((p) => p.zonaId === z.id)?._count._all || 0
    return {
      ...z,
      volumen,
      participacion: porcentaje(volumen, volumenTotal),
      paradasCerradas: ind.cerradas,
      eficacia: ind.eficacia,
      cicloMin: ind.cicloMin,
      incidencias: incidencias.filter((i) => i.despachoPedido.pedido.zonaId === z.id).length,
      estado: estadoSector(ind.eficacia),
    }
  })
    .filter((s) => zonaId || s.volumen > 0 || s.paradasCerradas > 0 || s.incidencias > 0)
    .sort((a, b) => b.volumen - a.volumen)

  // ---- Incidencias
  const causas = tiposIncidencia
    .map((t) => {
      const casos = incidencias.filter((i) => i.tipoIncidenciaId === t.id).length
      return { id: t.id, nombre: t.nombre, descripcion: t.descripcion, casos, porcentaje: porcentaje(casos, incidencias.length) }
    })
    .filter((c) => c.casos > 0)
    .sort((a, b) => b.casos - a.casos)
  const resoluciones = incidencias.filter((i) => i.fechaResolucion).map((i) => minutosEntre(i.fechaHora, i.fechaResolucion))
  const incidenciasPorEstado = {}
  incidencias.forEach((i) => { incidenciasPorEstado[i.estado] = (incidenciasPorEstado[i.estado] || 0) + 1 })
  const nombreTipo = new Map(tiposIncidencia.map((t) => [t.id, t.nombre]))

  // ---- Devoluciones
  const porMotivo = motivos
    .map((m) => {
      const casos = devoluciones.filter((d) => d.motivoId === m.id).length
      return { id: m.id, nombre: m.nombre, casos, porcentaje: porcentaje(casos, devoluciones.length) }
    })
    .filter((m) => m.casos > 0)
    .sort((a, b) => b.casos - a.casos)
  const devolucionesPorEstado = {}
  devoluciones.forEach((d) => { devolucionesPorEstado[d.estado] = (devolucionesPorEstado[d.estado] || 0) + 1 })
  const recepciones = devoluciones.filter((d) => d.fechaRecepcion).map((d) => minutosEntre(d.fechaRegistro, d.fechaRecepcion))

  return {
    periodo: { desde, hasta, dias: periodo.dias, anterior },
    zona,
    datosDemo: pedidosDemo > 0,
    metas: METAS,
    indicadores: {
      eficacia: { valor: entrega.eficacia, delta: delta(entrega.eficacia, entregaAnt.eficacia), conformes: entrega.conformes, cerradas: entrega.cerradas },
      ciclo: { minutos: entrega.cicloMin, delta: delta(entrega.cicloMin, entregaAnt.cicloMin), entregas: entrega.entregasMedidas },
      incidencias: { valor: tasaIncidencias, delta: delta(tasaIncidencias, tasaIncidenciasAnt), casos: incidencias.length, despachadas: entrega.despachadas },
      retornos: {
        valor: tasaRetornos,
        delta: delta(tasaRetornos, tasaRetornosAnt),
        casos: devoluciones.length,
        decisiones,
        cavaConforme: cava.length ? dentro(cava) === cava.length : null,
      },
    },
    pedidos: {
      total: pedidosPorEstado.reduce((s, e) => s + e._count._all, 0),
      porEstado: Object.fromEntries(pedidosPorEstado.map((e) => [e.estado, e._count._all])),
    },
    sectores,
    causas,
    cadenaFrio,
    incidencias: {
      total: incidencias.length,
      abiertas: incidencias.filter((i) => INCIDENCIAS_ABIERTAS.includes(i.estado)).length,
      porEstado: incidenciasPorEstado,
      resolucionPromedioMin: redondear(promedio(resoluciones)),
      resueltas: resoluciones.length,
      recientes: incidencias.slice(0, 5).map((i) => ({
        id: i.id, codigo: i.codigo, estado: i.estado, fechaHora: i.fechaHora,
        tipo: nombreTipo.get(i.tipoIncidenciaId), pedido: i.despachoPedido.pedido.codigo,
      })),
    },
    devoluciones: {
      total: devoluciones.length,
      porEstado: devolucionesPorEstado,
      porMotivo,
      decisiones,
      recepcionPromedioMin: redondear(promedio(recepciones)),
    },
    residuos: {
      porTipo: residuos.porTipo.filter((t) => t.registros > 0),
      retiros: residuos.retiros.periodo,
      pendientesRetiro: residuos.pendientesRetiro,
      trazabilidad: residuos.trazabilidad,
    },
  }
}

// ---------------------------------------------------------------- Exportación

const fecha = (d) => new Date(d).toLocaleDateString('es-VE', { timeZone: TZ })
const fechaHora = (d) => new Date(d).toLocaleString('es-VE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' })
const pct = (v) => (v === null || v === undefined ? 'Sin datos' : `${String(v).replace('.', ',')}%`)
const num = (v) => (v === null || v === undefined ? 'Sin datos' : String(v).replace('.', ','))
const ESTADO_SECTOR = { OPTIMO: 'Óptimo', REGULAR: 'Regular', ATENCION: 'Atención', SIN_DATOS: 'Sin entregas cerradas' }
const cantidades = (lista) => lista.map((c) => `${num(c.total)} ${c.unidad}`).join(' + ') || '0'

function seccionesPedidas(query) {
  const pedidas = String(query.secciones || '').split(',').map((s) => s.trim()).filter((s) => SECCIONES.includes(s))
  return pedidas.length ? pedidas : SECCIONES
}

/** Filas "Sección;Indicador;Valor;Detalle" del reporte (CSV compatible con Excel es-VE). */
function filasReporte(r, secciones) {
  const i = r.indicadores
  const filas = [
    ['Periodo', 'Desde', fecha(r.periodo.desde), ''],
    ['Periodo', 'Hasta', fecha(r.periodo.hasta), `${r.periodo.dias} días`],
    ['Periodo', 'Sector', r.zona?.nombre || 'Todos los sectores', ''],
  ]
  if (secciones.includes('entregas')) {
    filas.push(
      ['Entregas', 'Eficacia de entrega', pct(i.eficacia.valor), `${i.eficacia.conformes} conformes de ${i.eficacia.cerradas} cerradas · meta ≥ ${r.metas.eficaciaMinima}%`],
      ['Entregas', 'Tiempo promedio de ciclo (min)', num(i.ciclo.minutos), `${i.ciclo.entregas} entregas medidas · estándar ${r.metas.cicloEstandarMin} min`],
      ['Entregas', 'Pedidos registrados', r.pedidos.total, ''],
      ...r.sectores.map((s) => ['Sectores', s.nombre, `${s.volumen} pedidos`, `Entrega conforme ${pct(s.eficacia)} · ${s.incidencias} incidencias · ${ESTADO_SECTOR[s.estado]}`]),
      ['Cadena de frío', 'Mediciones dentro del límite', pct(r.cadenaFrio.porcentaje), `${r.cadenaFrio.dentro} de ${r.cadenaFrio.registros} · límite ${r.cadenaFrio.limiteC} °C`],
    )
  }
  if (secciones.includes('incidencias')) {
    filas.push(
      ['Incidencias', 'Tasa de incidencias', pct(i.incidencias.valor), `${i.incidencias.casos} casos en ${i.incidencias.despachadas} paradas · umbral < ${r.metas.incidenciasMaxima}%`],
      ['Incidencias', 'Abiertas', r.incidencias.abiertas, ''],
      ['Incidencias', 'Resolución promedio (min)', num(r.incidencias.resolucionPromedioMin), `${r.incidencias.resueltas} resueltas`],
      ...r.causas.map((c) => ['Causas', c.nombre, `${c.casos} casos`, pct(c.porcentaje)]),
    )
  }
  if (secciones.includes('devoluciones')) {
    filas.push(
      ['Devoluciones', 'Tasa de retornos', pct(i.retornos.valor), `${i.retornos.casos} devoluciones · umbral < ${r.metas.retornosMaximo}%`],
      ['Devoluciones', 'Decisiones', `${i.retornos.decisiones.REINGRESO} reingresos`, `${i.retornos.decisiones.CUARENTENA} cuarentenas · ${i.retornos.decisiones.DESCARTE} descartes`],
      ['Devoluciones', 'Recepción promedio (min)', num(r.devoluciones.recepcionPromedioMin), ''],
      ...r.devoluciones.porMotivo.map((m) => ['Motivos', m.nombre, `${m.casos} casos`, pct(m.porcentaje)]),
    )
  }
  if (secciones.includes('residuos')) {
    filas.push(
      ...r.residuos.porTipo.map((t) => ['Residuos', t.nombre, cantidades(t.cantidades), `${t.registros} registros · destino ${t.destinoHabitual || 'sin gestor habitual'}`]),
      ['Residuos', 'Retiros por gestores', r.residuos.retiros, `${r.residuos.pendientesRetiro} pendientes en planta`],
      ['Residuos', 'Destino trazable', pct(r.residuos.trazabilidad.porcentaje), ''],
    )
  }
  return filas
}

async function exportReporteCsv(query) {
  const r = await getReporteOperativo(query)
    const celda = celdaCsv
  const lineas = [['Sección', 'Indicador', 'Valor', 'Detalle'], ...filasReporte(r, seccionesPedidas(query))]
  return '﻿' + lineas.map((f) => f.map(celda).join(';')).join('\r\n')
}

const AZUL = '#0f62fe'
const GRIS = '#525252'
const NEGRO = '#161616'
const MARGEN = 48

/** Reporte ejecutivo en PDF: indicadores, sectores, causas, devoluciones y residuos del periodo. */
async function buildReportePdf(query, generadoPor) {
  const r = await getReporteOperativo(query)
  const secciones = seccionesPedidas(query)
  const i = r.indicadores
  const doc = new PDFDocument({ size: 'LETTER', margin: MARGEN, info: { Title: 'Reporte de rendimiento operativo' } })
  const ancho = doc.page.width - MARGEN * 2

  const titulo = (texto) => {
    if (doc.y > doc.page.height - 150) doc.addPage()
    doc.moveDown(0.9)
    doc.x = MARGEN
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRIS).text(texto.toUpperCase(), { characterSpacing: 0.8 })
    const y = doc.y + 3
    doc.moveTo(MARGEN, y).lineTo(MARGEN + ancho, y).lineWidth(0.5).strokeColor('#c6c6c6').stroke()
    doc.moveDown(0.6)
  }
  const tabla = (columnas, filas) => {
    const fila = (valores, encabezado = false) => {
      if (doc.y > doc.page.height - 90) doc.addPage()
      const y = doc.y
      let x = MARGEN
      doc.font(encabezado ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(encabezado ? GRIS : NEGRO)
      const alturas = valores.map((v, k) => doc.heightOfString(String(v ?? '—'), { width: columnas[k].ancho - 6 }))
      valores.forEach((v, k) => {
        doc.text(String(v ?? '—'), x, y, { width: columnas[k].ancho - 6 })
        x += columnas[k].ancho
      })
      doc.y = y + Math.max(...alturas) + 4
      doc.moveTo(MARGEN, doc.y - 2).lineTo(MARGEN + ancho, doc.y - 2).lineWidth(0.5).strokeColor('#e0e0e0').stroke()
    }
    fila(columnas.map((c) => c.titulo.toUpperCase()), true)
    filas.forEach((f) => fila(f))
    doc.x = MARGEN
  }
  const linea = (texto) => { doc.x = MARGEN; doc.font('Helvetica').fontSize(10).fillColor(NEGRO).text(texto, { width: ancho }) }

  // Encabezado
  doc.rect(MARGEN, MARGEN, 18, 18).fill(AZUL)
  doc.font('Helvetica-Bold').fontSize(14).fillColor(NEGRO).text('LogiTrace', MARGEN + 26, MARGEN + 1)
  doc.font('Helvetica').fontSize(8).fillColor(GRIS).text('SuperTequeños C.A. · Valera, Trujillo', MARGEN + 26, MARGEN + 17)
  doc.moveDown(2)
  doc.x = MARGEN
  doc.font('Helvetica').fontSize(8).fillColor(AZUL).text('MÓDULO 09 · ANÁLISIS OPERATIVO Y CONSOLIDACIÓN DE DATOS', { characterSpacing: 0.8 })
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NEGRO).text('Reporte de rendimiento operativo')
  doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(
    `Periodo: ${fecha(r.periodo.desde)} al ${fecha(r.periodo.hasta)} (${r.periodo.dias} días) · Sector: ${r.zona?.nombre || 'todos'} · `
      + `Emitido: ${fechaHora(new Date())}${generadoPor ? ` por ${generadoPor}` : ''}`
  )

  titulo('Indicadores principales')
  const variacion = (d, unidad = ' pts') => (d === null ? '' : ` (${d > 0 ? '+' : ''}${num(d)}${unidad} vs. periodo anterior)`)
  linea(`Eficacia de entrega: ${pct(i.eficacia.valor)} · ${i.eficacia.conformes} conformes de ${i.eficacia.cerradas} (meta mínima ${r.metas.eficaciaMinima}%)${variacion(i.eficacia.delta)}`)
  linea(`Tiempo promedio de ciclo: ${num(i.ciclo.minutos)} min (estándar ${r.metas.cicloEstandarMin} min)${variacion(i.ciclo.delta, ' min')}`)
  linea(`Tasa de incidencias: ${pct(i.incidencias.valor)} · ${i.incidencias.casos} casos (umbral < ${r.metas.incidenciasMaxima}%)${variacion(i.incidencias.delta)}`)
  linea(`Logística inversa: ${pct(i.retornos.valor)} · ${i.retornos.casos} devoluciones (umbral < ${r.metas.retornosMaximo}%)${variacion(i.retornos.delta)}`)

  if (secciones.includes('entregas')) {
    titulo('Distribución y cumplimiento por sector')
    if (!r.sectores.length) linea('Sin pedidos en el periodo.')
    else {
      tabla(
        [{ titulo: 'Sector', ancho: 190 }, { titulo: 'Pedidos', ancho: 70 }, { titulo: 'Entrega conforme', ancho: 100 }, { titulo: 'Incidencias', ancho: 70 }, { titulo: 'Estado', ancho: ancho - 430 }],
        r.sectores.map((s) => [s.nombre, `${s.volumen} (${pct(s.participacion)})`, pct(s.eficacia), s.incidencias, ESTADO_SECTOR[s.estado]])
      )
    }
    titulo('Cadena de frío (mediciones manuales)')
    linea(r.cadenaFrio.registros
      ? `${r.cadenaFrio.dentro} de ${r.cadenaFrio.registros} mediciones dentro del límite de ${r.cadenaFrio.limiteC} °C (${pct(r.cadenaFrio.porcentaje)}); rango ${num(r.cadenaFrio.minC)} a ${num(r.cadenaFrio.maxC)} °C.`
      : 'Sin mediciones registradas en el periodo.')
  }
  if (secciones.includes('incidencias')) {
    titulo('Causas de retraso e incidencias')
    if (!r.causas.length) linea('Sin incidencias en el periodo.')
    else tabla([{ titulo: 'Causa', ancho: 300 }, { titulo: 'Casos', ancho: 80 }, { titulo: 'Participación', ancho: ancho - 380 }], r.causas.map((c) => [c.nombre, c.casos, pct(c.porcentaje)]))
    linea(`Abiertas: ${r.incidencias.abiertas} · resolución promedio: ${num(r.incidencias.resolucionPromedioMin)} min (${r.incidencias.resueltas} resueltas).`)
  }
  if (secciones.includes('devoluciones')) {
    titulo('Devoluciones y calidad')
    const d = r.devoluciones.decisiones
    linea(`${r.devoluciones.total} devoluciones · reingresos ${d.REINGRESO} · cuarentenas ${d.CUARENTENA} · descartes ${d.DESCARTE} · recepción promedio ${num(r.devoluciones.recepcionPromedioMin)} min.`)
    if (r.devoluciones.porMotivo.length) {
      doc.moveDown(0.4)
      tabla([{ titulo: 'Motivo', ancho: 300 }, { titulo: 'Casos', ancho: 80 }, { titulo: 'Participación', ancho: ancho - 380 }], r.devoluciones.porMotivo.map((m) => [m.nombre, m.casos, pct(m.porcentaje)]))
    }
  }
  if (secciones.includes('residuos')) {
    titulo('Balance de residuos de planta')
    if (!r.residuos.porTipo.length) linea('Sin residuos registrados en el periodo.')
    else tabla([{ titulo: 'Tipo', ancho: 170 }, { titulo: 'Cantidad', ancho: 110 }, { titulo: 'Destino habitual', ancho: ancho - 280 }], r.residuos.porTipo.map((t) => [t.nombre, cantidades(t.cantidades), t.destinoHabitual || 'Sin gestor habitual']))
    linea(`Retiros por gestores: ${r.residuos.retiros} · pendientes en planta: ${r.residuos.pendientesRetiro} · destino trazable: ${pct(r.residuos.trazabilidad.porcentaje)}.`)
  }

  doc.moveDown(1.5)
  doc.x = MARGEN
  doc.fontSize(7).fillColor(GRIS).text(
    'Indicadores calculados por LogiTrace con consultas agregadas sobre PostgreSQL (pedidos, despachos, incidencias, devoluciones, '
      + 'temperaturas manuales y residuos). Entrega conforme: parada entregada sin incidencias sobre el total de paradas cerradas.',
    { width: ancho }
  )
  doc.end()
  return doc
}

module.exports = { getReporteOperativo, exportReporteCsv, buildReportePdf, METAS, SECCIONES }
