const motivoDevolucionService = require('./motivoDevolucion.service')
const { success } = require('../../utils/response')

async function listMotivosDevolucion(req, res, next) {
  try {
    const result = await motivoDevolucionService.listMotivosDevolucion(req.query)
    return success(res, result.data, 'Motivos de devolución obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getMotivoDevolucionById(req, res, next) {
  try {
    const motivo = await motivoDevolucionService.getMotivoDevolucionById(req.params.id)
    return success(res, motivo, 'Motivo de devolución obtenido')
  } catch (err) {
    next(err)
  }
}

async function createMotivoDevolucion(req, res, next) {
  try {
    const motivo = await motivoDevolucionService.createMotivoDevolucion(req.body)
    return success(res, motivo, 'Motivo de devolución creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateMotivoDevolucion(req, res, next) {
  try {
    const motivo = await motivoDevolucionService.updateMotivoDevolucion(req.params.id, req.body)
    return success(res, motivo, 'Motivo de devolución actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteMotivoDevolucion(req, res, next) {
  try {
    await motivoDevolucionService.deleteMotivoDevolucion(req.params.id)
    return success(res, null, 'Motivo de devolución eliminado')
  } catch (err) {
    next(err)
  }
}

module.exports = { listMotivosDevolucion, getMotivoDevolucionById, createMotivoDevolucion, updateMotivoDevolucion, deleteMotivoDevolucion }