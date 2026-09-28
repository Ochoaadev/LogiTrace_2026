const tipoIncidenciaService = require('./tipoIncidencia.service')
const { success } = require('../../utils/response')

async function listTiposIncidencia(req, res, next) {
  try {
    const result = await tipoIncidenciaService.listTiposIncidencia(req.query)
    return success(res, result.data, 'Tipos de incidencia obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getTipoIncidenciaById(req, res, next) {
  try {
    const tipo = await tipoIncidenciaService.getTipoIncidenciaById(req.params.id)
    return success(res, tipo, 'Tipo de incidencia obtenido')
  } catch (err) {
    next(err)
  }
}

async function createTipoIncidencia(req, res, next) {
  try {
    const tipo = await tipoIncidenciaService.createTipoIncidencia(req.body)
    return success(res, tipo, 'Tipo de incidencia creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateTipoIncidencia(req, res, next) {
  try {
    const tipo = await tipoIncidenciaService.updateTipoIncidencia(req.params.id, req.body)
    return success(res, tipo, 'Tipo de incidencia actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteTipoIncidencia(req, res, next) {
  try {
    await tipoIncidenciaService.deleteTipoIncidencia(req.params.id)
    return success(res, null, 'Tipo de incidencia eliminado')
  } catch (err) {
    next(err)
  }
}

module.exports = { listTiposIncidencia, getTipoIncidenciaById, createTipoIncidencia, updateTipoIncidencia, deleteTipoIncidencia }