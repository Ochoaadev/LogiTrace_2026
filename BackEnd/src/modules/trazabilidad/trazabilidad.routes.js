const express = require('express')
const router = express.Router()

const {
  buscarExpedientesValidation,
  pedidoIdParam,
  exportCsvValidation,
  registrarTemperaturaValidation,
  listTrazabilidadValidation,
  getTrazabilidadByPedidoValidation,
  getTrazabilidadByDespachoValidation,
} = require('./trazabilidad.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const trazabilidadController = require('./trazabilidad.controller')

router.use(authMiddleware)

router.get(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  listTrazabilidadValidation,
  validationMiddleware,
  trazabilidadController.listTrazabilidad
)

const CONSULTA = roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR')
const EXPORTA = roleMiddleware('ADMINISTRADOR', 'SUPERVISOR')

// Expedientes (Fase 7)
router.get('/expedientes', CONSULTA, buscarExpedientesValidation, validationMiddleware, trazabilidadController.buscarExpedientes)
router.get('/pedido/:id/expediente', CONSULTA, pedidoIdParam, validationMiddleware, trazabilidadController.getExpediente)
router.get('/pedido/:id/export/pdf', EXPORTA, pedidoIdParam, validationMiddleware, trazabilidadController.exportPdf)
router.get('/export/csv', EXPORTA, exportCsvValidation, validationMiddleware, trazabilidadController.exportCsv)

// Registro manual de temperatura (cava, despacho o devolución); el repartidor lo toma en ruta
router.post(
  '/temperaturas',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  registrarTemperaturaValidation,
  validationMiddleware,
  trazabilidadController.registrarTemperatura
)

router.get(
  '/estadisticas',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'),
  trazabilidadController.getEstadisticas
)

router.get(
  '/pedido/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  getTrazabilidadByPedidoValidation,
  validationMiddleware,
  trazabilidadController.getTrazabilidadByPedido
)

router.get(
  '/pedido/:id/completa',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  trazabilidadController.getTrazabilidadCompleta
)

router.get(
  '/pedido/:id/timeline',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  trazabilidadController.getTimeline
)

router.get(
  '/despacho/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  getTrazabilidadByDespachoValidation,
  validationMiddleware,
  trazabilidadController.getTrazabilidadByDespacho
)

module.exports = router