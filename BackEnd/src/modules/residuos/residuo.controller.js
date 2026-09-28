const residuoService = require('./residuo.service')
const { success } = require('../../utils/response')

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
    const { estado, observaciones } = req.body
    const residuo = await residuoService.changeEstado(req.params.id, estado, req.user.sub, observaciones)
    return success(res, residuo, `Residuo ${estado.toLowerCase().replace('_', ' ')}`)
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

module.exports = {
  listResiduos,
  getResiduoById,
  createResiduo,
  updateResiduo,
  changeEstado,
  deleteResiduo,
  getResumen,
}