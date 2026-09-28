const zonaService = require('./zona.service')
const { success } = require('../../utils/response')

async function listZonas(req, res, next) {
  try {
    const result = await zonaService.listZonas(req.query)
    return success(res, result.data, 'Zonas obtenidas', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getZonaById(req, res, next) {
  try {
    const zona = await zonaService.getZonaById(req.params.id)
    return success(res, zona, 'Zona obtenida')
  } catch (err) {
    next(err)
  }
}

async function createZona(req, res, next) {
  try {
    const zona = await zonaService.createZona(req.body)
    return success(res, zona, 'Zona creada', 201)
  } catch (err) {
    next(err)
  }
}

async function updateZona(req, res, next) {
  try {
    const zona = await zonaService.updateZona(req.params.id, req.body)
    return success(res, zona, 'Zona actualizada')
  } catch (err) {
    next(err)
  }
}

async function deleteZona(req, res, next) {
  try {
    await zonaService.deleteZona(req.params.id)
    return success(res, null, 'Zona eliminada')
  } catch (err) {
    next(err)
  }
}

module.exports = { listZonas, getZonaById, createZona, updateZona, deleteZona }