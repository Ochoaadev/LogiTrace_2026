const express = require('express')
const router = express.Router()

const {
  listDespachosValidation,
  createDespachoValidation,
  updateDespachoValidation,
  changeEstadoDespachoValidation,
  updateUbicacionValidation,
  agregarPedidoValidation,
} = require('./despacho.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const despachoController = require('./despacho.controller')

router.use(authMiddleware)

router.get(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  listDespachosValidation,
  validationMiddleware,
  despachoController.listDespachos
)

router.get(
  '/resumen',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  despachoController.getResumenDespachos
)

router.get(
  '/flujo-operativo',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  despachoController.getFlujoOperativo
)

router.get(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  despachoController.getDespachoById
)

router.post(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  createDespachoValidation,
  validationMiddleware,
  despachoController.createDespacho
)

router.post(
  '/:id/pedidos',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  agregarPedidoValidation,
  validationMiddleware,
  despachoController.agregarPedido
)

router.put(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  updateDespachoValidation,
  validationMiddleware,
  despachoController.updateDespacho
)

router.patch(
  '/:id/estado',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  changeEstadoDespachoValidation,
  validationMiddleware,
  despachoController.changeEstado
)

router.patch(
  '/:id/ubicacion',
  roleMiddleware('REPARTIDOR', 'ADMINISTRADOR', 'SUPERVISOR'),
  updateUbicacionValidation,
  validationMiddleware,
  despachoController.updateUbicacion
)

router.patch(
  '/:id/orden',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  despachoController.updatePedidosOrden
)

router.delete(
  '/:id',
  roleMiddleware('ADMINISTRADOR'),
  despachoController.deleteDespacho
)

module.exports = router