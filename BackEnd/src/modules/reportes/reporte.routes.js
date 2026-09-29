const express = require('express')
const router = express.Router()

const {
  operativoValidation,
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

// Reporte operativo del módulo 09 y sus exportaciones (reporte ejecutivo / personalizado)
const REPORTE_ROLES = ['ADMINISTRADOR', 'SUPERVISOR']

router.get('/operativo', roleMiddleware(...REPORTE_ROLES), operativoValidation, validationMiddleware, reporteController.getReporteOperativo)
router.get('/operativo/export/csv', roleMiddleware(...REPORTE_ROLES), operativoValidation, validationMiddleware, reporteController.exportReporteCsv)
router.get('/operativo/export/pdf', roleMiddleware(...REPORTE_ROLES), operativoValidation, validationMiddleware, reporteController.exportReportePdf)

module.exports = router