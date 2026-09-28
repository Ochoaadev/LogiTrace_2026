const express = require('express')
const router = express.Router()

const {
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