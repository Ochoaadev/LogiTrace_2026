const express = require('express')
const router = express.Router()

const {
  listDevolucionesValidation,
  createDevolucionValidation,
  updateDevolucionValidation,
  changeEstadoDevolucionValidation,
  recepcionDevolucionValidation,
  evaluacionDevolucionValidation,
  evaluacionDetalleValidation,
} = require('./devolucion.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const devolucionController = require('./devolucion.controller')

router.use(authMiddleware)

router.get(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  listDevolucionesValidation,
  validationMiddleware,
  devolucionController.listDevoluciones
)

router.get(
  '/resumen',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  devolucionController.getResumenDevoluciones
)

router.get(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  devolucionController.getDevolucionById
)

router.post(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  createDevolucionValidation,
  validationMiddleware,
  devolucionController.createDevolucion
)

router.put(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  updateDevolucionValidation,
  validationMiddleware,
  devolucionController.updateDevolucion
)

router.patch(
  '/:id/recepcion',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  recepcionDevolucionValidation,
  validationMiddleware,
  devolucionController.recepcionDevolucion
)

router.post(
  '/:id/evaluacion',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  evaluacionDevolucionValidation,
  validationMiddleware,
  devolucionController.evaluarDevolucion
)

router.post(
  '/:id/evaluar-detalle',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  evaluacionDetalleValidation,
  validationMiddleware,
  devolucionController.evaluarDetalle
)

router.patch(
  '/:id/estado',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  changeEstadoDevolucionValidation,
  validationMiddleware,
  devolucionController.changeEstado
)

router.delete(
  '/:id',
  roleMiddleware('ADMINISTRADOR'),
  devolucionController.deleteDevolucion
)

module.exports = router