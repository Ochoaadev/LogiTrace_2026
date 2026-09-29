// Auditoría de acciones (tabla Auditoria). Antes el módulo era un marcador y nada escribía en la
// tabla. Registra inicios de sesión (exitosos y fallidos) y toda operación de escritura exitosa.
const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

const ACCION_POR_METODO = { POST: 'CREAR', PUT: 'ACTUALIZAR', PATCH: 'ACTUALIZAR', DELETE: 'ELIMINAR' }

const MODULOS = {
  pedidos: 'Pedidos', despachos: 'Despachos', incidencias: 'Incidencias', devoluciones: 'Devoluciones',
  inventario: 'Inventario', trazabilidad: 'Trazabilidad', residuos: 'Residuos', reportes: 'Reportes',
  catalogos: 'Catálogos', usuarios: 'Usuarios', auth: 'Acceso', administracion: 'Administración',
}

// Nunca debe romper la operación que se audita
async function registrar({ usuarioId, accion, modulo, entidad, entidadId = null, ip = null, detalle = null }) {
  try {
    await prisma.auditoria.create({
      data: {
        usuarioId,
        accion: accion.slice(0, 80),
        modulo: modulo.slice(0, 50),
        entidad: entidad.slice(0, 50),
        entidadId: entidadId && UUID.test(entidadId) ? entidadId : null,
        ip: ip ? String(ip).slice(0, 45) : null,
        detalle,
      },
    })
  } catch (err) {
    console.error('No se pudo registrar la auditoría:', err.message)
  }
}

/**
 * Describe una solicitud de escritura: /api/despachos/<id>/estado → módulo Despachos, entidad
 * "despachos", acción ACTUALIZAR, detalle "PATCH /despachos/:id/estado".
 */
function describirSolicitud(req) {
  const ruta = req.originalUrl.split('?')[0].replace(/^\/api/, '')
  const segmentos = ruta.split('/').filter(Boolean)
  const base = segmentos[0] || 'api'
  const entidad = base === 'catalogos' ? segmentos[1] || base : base
  const entidadId = ruta.match(UUID)?.[0] || null
  const accionFinal = segmentos.filter((s) => !UUID.test(s)).slice(base === 'catalogos' ? 2 : 1).join('-')
  return {
    modulo: MODULOS[base] || base,
    entidad,
    entidadId,
    accion: `${ACCION_POR_METODO[req.method] || req.method}${accionFinal ? `_${accionFinal.toUpperCase().replace(/-/g, '_')}` : ''}`,
    detalle: `${req.method} ${ruta.replace(UUID, ':id')}`,
  }
}

function filtros(query) {
  const { modulo, usuarioId, accion, fechaDesde, fechaHasta, search } = query
  const where = {}
  if (modulo) where.modulo = modulo
  if (usuarioId) where.usuarioId = usuarioId
  if (accion) where.accion = { contains: accion, mode: 'insensitive' }
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {}
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta)
  }
  if (search) {
    where.OR = [
      { detalle: { contains: search, mode: 'insensitive' } },
      { accion: { contains: search, mode: 'insensitive' } },
      { usuario: { nombre: { contains: search, mode: 'insensitive' } } },
    ]
  }
  return where
}

async function listAuditoria(query) {
  const { page, limit, skip } = getPagination(query)
  const where = filtros(query)
  const [data, total] = await Promise.all([
    prisma.auditoria.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaHora: 'desc' },
      include: { usuario: { select: { id: true, codigo: true, nombre: true, rol: true } } },
    }),
    prisma.auditoria.count({ where }),
  ])
  return { data, total, page, limit }
}

/** Actividad de las últimas 24 horas: total, fallos de autenticación y serie por hora. */
async function getResumenAuditoria() {
  const desde = new Date(Date.now() - 24 * 3600 * 1000)
  const [total, fallidos, registros, eventosTrazabilidad] = await Promise.all([
    prisma.auditoria.count({ where: { fechaHora: { gte: desde } } }),
    prisma.auditoria.count({ where: { fechaHora: { gte: desde }, accion: 'INICIO_SESION_FALLIDO' } }),
    prisma.auditoria.findMany({ where: { fechaHora: { gte: desde } }, select: { fechaHora: true } }),
    prisma.eventoTrazabilidad.count({ where: { fechaHora: { gte: desde } } }),
  ])
  const porHora = Array.from({ length: 24 }, () => 0)
  registros.forEach((r) => {
    const horas = Math.floor((r.fechaHora - desde) / 3600000)
    porHora[Math.min(23, Math.max(0, horas))] += 1
  })
  return { desde, total, fallidosAutenticacion: fallidos, eventosTrazabilidad, porHora }
}

module.exports = { registrar, describirSolicitud, listAuditoria, getResumenAuditoria }
