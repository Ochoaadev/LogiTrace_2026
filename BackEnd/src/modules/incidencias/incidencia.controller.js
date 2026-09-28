const incidenciaService = require('./incidencia.service')
const { success } = require('../../utils/response')

async function listIncidencias(req, res, next) {
  try {
    const result = await incidenciaService.listIncidencias(req.query)
    return success(res, result.data, 'Incidencias obtenidas', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getIncidenciaById(req, res, next) {
  try {
    const incidencia = await incidenciaService.getIncidenciaById(req.params.id)
    return success(res, incidencia, 'Incidencia obtenida')
  } catch (err) {
    next(err)
  }
}

async function createIncidencia(req, res, next) {
  try {
    const incidencia = await incidenciaService.createIncidencia(req.body, req.user.sub)
    return success(res, incidencia, 'Incidencia registrada', 201)
  } catch (err) {
    next(err)
  }
}

async function updateIncidencia(req, res, next) {
  try {
    const incidencia = await incidenciaService.updateIncidencia(req.params.id, req.body)
    return success(res, incidencia, 'Incidencia actualizada')
  } catch (err) {
    next(err)
  }
}

async function changeEstado(req, res, next) {
  try {
    const { estado, decisionOperativa, observaciones } = req.body
    const incidencia = await incidenciaService.changeEstado(req.params.id, estado, req.user.sub, decisionOperativa, observaciones)
    return success(res, incidencia, `Incidencia ${estado.toLowerCase()}`)
  } catch (err) {
    next(err)
  }
}

async function deleteIncidencia(req, res, next) {
  try {
    await incidenciaService.deleteIncidencia(req.params.id)
    return success(res, null, 'Incidencia eliminada')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listIncidencias,
  getIncidenciaById,
  createIncidencia,
  updateIncidencia,
  changeEstado,
  deleteIncidencia,
}