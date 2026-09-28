const express = require('express')
const router = express.Router()

const {
  listReportesValidation,
  rendimientoValidation,
  kpiValidation,
} = require('./reporte.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const reporteController = require('./reporte.controller')

router.use(authMiddleware)

router.get(
  '/kpis',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  kpiValidation,
  validationMiddleware,
  reporteController.getDashboardKPIs
)

router.get(
  '/pedidos',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  listReportesValidation,
  validationMiddleware,
  reporteController.getReportePedidos
)

router.get(
  '/despachos',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  listReportesValidation,
  validationMiddleware,
  reporteController.getReporteDespachos
)

router.get(
  '/incidencias',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  listReportesValidation,
  validationMiddleware,
  reporteController.getReporteIncidencias
)

router.get(
  '/devoluciones',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  listReportesValidation,
  validationMiddleware,
  reporteController.getReporteDevoluciones
)

router.get(
  '/inventario',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  listReportesValidation,
  validationMiddleware,
  reporteController.getReporteInventario
)

router.get(
  '/rendimiento',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'),
  rendimientoValidation,
  validationMiddleware,
  reporteController.getReporteRendimiento
)

module.exports = router