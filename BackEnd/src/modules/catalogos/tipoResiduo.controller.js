const tipoResiduoService = require('./tipoResiduo.service')
const { success } = require('../../utils/response')

async function listTiposResiduo(req, res, next) {
  try {
    const result = await tipoResiduoService.listTiposResiduo(req.query)
    return success(res, result.data, 'Tipos de residuo obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getTipoResiduoById(req, res, next) {
  try {
    const tipo = await tipoResiduoService.getTipoResiduoById(req.params.id)
    return success(res, tipo, 'Tipo de residuo obtenido')
  } catch (err) {
    next(err)
  }
}

async function createTipoResiduo(req, res, next) {
  try {
    const tipo = await tipoResiduoService.createTipoResiduo(req.body)
    return success(res, tipo, 'Tipo de residuo creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateTipoResiduo(req, res, next) {
  try {
    const tipo = await tipoResiduoService.updateTipoResiduo(req.params.id, req.body)
    return success(res, tipo, 'Tipo de residuo actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteTipoResiduo(req, res, next) {
  try {
    await tipoResiduoService.deleteTipoResiduo(req.params.id)
    return success(res, null, 'Tipo de residuo eliminado')
  } catch (err) {
    next(err)
  }
}

module.exports = { listTiposResiduo, getTipoResiduoById, createTipoResiduo, updateTipoResiduo, deleteTipoResiduo }