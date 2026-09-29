const residuoService = require('./residuo.service')
const prisma = require('../../config/database')
const { success } = require('../../utils/response')

const MENSAJE_ESTADO = {
  EN_ALMACENAMIENTO: 'Residuo en almacenamiento temporal',
  RETIRADO: 'Retiro registrado',
  DISPOSICION_FINAL: 'Disposición final confirmada',
  ANULADO: 'Registro anulado',
}

async function listResiduos(req, res, next) {
  try {
    const result = await residuoService.listResiduos(req.query)
    return success(res, result.data, 'Residuos obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getResiduoById(req, res, next) {
  try {
    const residuo = await residuoService.getResiduoById(req.params.id)
    return success(res, residuo, 'Residuo obtenido')
  } catch (err) {
    next(err)
  }
}

async function createResiduo(req, res, next) {
  try {
    const residuo = await residuoService.createResiduo(req.body, req.user.sub)
    return success(res, residuo, 'Residuo registrado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateResiduo(req, res, next) {
  try {
    const residuo = await residuoService.updateResiduo(req.params.id, req.body)
    return success(res, residuo, 'Residuo actualizado')
  } catch (err) {
    next(err)
  }
}

async function changeEstado(req, res, next) {
  try {
    const { estado, observaciones, gestorId } = req.body
    const residuo = await residuoService.changeEstado(req.params.id, estado, req.user.sub, { observaciones, gestorId })
    return success(res, residuo, MENSAJE_ESTADO[estado] || 'Estado actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteResiduo(req, res, next) {
  try {
    await residuoService.deleteResiduo(req.params.id)
    return success(res, null, 'Residuo eliminado')
  } catch (err) {
    next(err)
  }
}

async function getResumen(req, res, next) {
  try {
    const resumen = await residuoService.getResumenResiduos(req.query)
    return success(res, resumen, 'Resumen de residuos obtenido')
  } catch (err) {
    next(err)
  }
}

async function exportCsv(req, res, next) {
  try {
    const csv = await residuoService.exportResiduosCsv(req.query)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="residuos-${new Date().toISOString().slice(0, 10)}.csv"`)
    return res.send(csv)
  } catch (err) {
    next(err)
  }
}

async function exportManifiesto(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { nombre: true } })
    const doc = await residuoService.buildManifiestoPdf(req.query, usuario?.nombre)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="manifiesto-residuos-${new Date().toISOString().slice(0, 10)}.pdf"`)
    doc.pipe(res)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  exportCsv,
  exportManifiesto,
  listResiduos,
  getResiduoById,
  createResiduo,
  updateResiduo,
  changeEstado,
  deleteResiduo,
  getResumen,
}