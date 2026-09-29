const express = require('express')
const { query } = require('express-validator')
const router = express.Router()

const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const { success } = require('../../utils/response')
const auditoriaService = require('./auditoria.service')

router.use(authMiddleware, roleMiddleware('ADMINISTRADOR'))

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('usuarioId').optional().isUUID().withMessage('Usuario inválido'),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('modulo').optional().isString(),
  query('accion').optional().isString(),
  query('search').optional().isString(),
]

router.get('/', listValidation, validationMiddleware, async (req, res, next) => {
  try {
    const r = await auditoriaService.listAuditoria(req.query)
    return success(res, r.data, 'Registros de auditoría obtenidos', 200, { total: r.total, page: r.page, limit: r.limit })
  } catch (err) {
    next(err)
  }
})

router.get('/resumen', async (req, res, next) => {
  try {
    return success(res, await auditoriaService.getResumenAuditoria(), 'Resumen de auditoría obtenido')
  } catch (err) {
    next(err)
  }
})

module.exports = router
