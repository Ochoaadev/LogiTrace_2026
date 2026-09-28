const gestorResiduoService = require('./gestorResiduo.service')
const { success } = require('../../utils/response')

async function listGestoresResiduo(req, res, next) {
  try {
    const result = await gestorResiduoService.listGestoresResiduo(req.query)
    return success(res, result.data, 'Gestores de residuo obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getGestorResiduoById(req, res, next) {
  try {
    const gestor = await gestorResiduoService.getGestorResiduoById(req.params.id)
    return success(res, gestor, 'Gestor de residuo obtenido')
  } catch (err) {
    next(err)
  }
}

async function createGestorResiduo(req, res, next) {
  try {
    const gestor = await gestorResiduoService.createGestorResiduo(req.body)
    return success(res, gestor, 'Gestor de residuo creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateGestorResiduo(req, res, next) {
  try {
    const gestor = await gestorResiduoService.updateGestorResiduo(req.params.id, req.body)
    return success(res, gestor, 'Gestor de residuo actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteGestorResiduo(req, res, next) {
  try {
    await gestorResiduoService.deleteGestorResiduo(req.params.id)
    return success(res, null, 'Gestor de residuo eliminado')
  } catch (err) {
    next(err)
  }
}

module.exports = { listGestoresResiduo, getGestorResiduoById, createGestorResiduo, updateGestorResiduo, deleteGestorResiduo }