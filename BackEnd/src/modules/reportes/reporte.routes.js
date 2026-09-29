const express = require('express')
const router = express.Router()

const {
  listReportesValidation,
  rendimientoValidation,
  kpiValidation,
  timelineValidation,
  limitValidation,
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

const DASHBOARD_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR']

router.get('/pedidos-por-estado', roleMiddleware(...DASHBOARD_ROLES), reporteController.getPedidosPorEstado)
router.get('/timeline', roleMiddleware(...DASHBOARD_ROLES), timelineValidation, validationMiddleware, reporteController.getTimelinePedidos)
router.get('/top-clientes', roleMiddleware(...DASHBOARD_ROLES), limitValidation, validationMiddleware, reporteController.getTopClientes)
router.get('/actividad', roleMiddleware(...DASHBOARD_ROLES), limitValidation, validationMiddleware, reporteController.getActividadReciente)
router.get('/alertas', roleMiddleware(...DASHBOARD_ROLES), reporteController.getAlertas)

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