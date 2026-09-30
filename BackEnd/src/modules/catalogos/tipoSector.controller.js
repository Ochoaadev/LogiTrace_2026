const tipoSectorService = require('./tipoSector.service')
const { success } = require('../../utils/response')

async function listTiposSector(req, res, next) {
  try {
    const result = await tipoSectorService.listTiposSector(req.query)
    return success(res, result.data, 'Tipos de sector obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getTipoSectorById(req, res, next) {
  try {
    const tipo = await tipoSectorService.getTipoSectorById(req.params.id)
    return success(res, tipo, 'Tipo de sector obtenido')
  } catch (err) {
    next(err)
  }
}

async function createTipoSector(req, res, next) {
  try {
    const tipo = await tipoSectorService.createTipoSector(req.body)
    return success(res, tipo, 'Tipo de sector creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateTipoSector(req, res, next) {
  try {
    const tipo = await tipoSectorService.updateTipoSector(req.params.id, req.body)
    return success(res, tipo, 'Tipo de sector actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteTipoSector(req, res, next) {
  try {
    await tipoSectorService.deleteTipoSector(req.params.id)
    return success(res, null, 'Tipo de sector eliminado')
  } catch (err) {
    next(err)
  }
}

module.exports = { listTiposSector, getTipoSectorById, createTipoSector, updateTipoSector, deleteTipoSector }