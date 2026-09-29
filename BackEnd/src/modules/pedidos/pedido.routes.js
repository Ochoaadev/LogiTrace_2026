const express = require('express')
const router = express.Router()

const {
  listPedidosValidation,
  createPedidoValidation,
  updatePedidoValidation,
  changeEstadoValidation,
} = require('./pedido.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const pedidoController = require('./pedido.controller')

router.use(authMiddleware)

router.get(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  listPedidosValidation,
  validationMiddleware,
  pedidoController.listPedidos
)

// Indicadores del módulo (antes de '/:id' para que "resumen" no se tome como id)
router.get(
  '/resumen',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  pedidoController.getResumenPedidos
)

router.get(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  pedidoController.getPedidoById
)

router.post(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  createPedidoValidation,
  validationMiddleware,
  pedidoController.createPedido
)

router.put(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  updatePedidoValidation,
  validationMiddleware,
  pedidoController.updatePedido
)

router.patch(
  '/:id/estado',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  changeEstadoValidation,
  validationMiddleware,
  pedidoController.changeEstado
)

router.post(
  '/:id/preparar',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  pedidoController.prepararPedido
)

router.post(
  '/:id/listo-despacho',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  pedidoController.listoParaDespacho
)

router.delete(
  '/:id',
  roleMiddleware('ADMINISTRADOR'),
  pedidoController.deletePedido
)

module.exports = router