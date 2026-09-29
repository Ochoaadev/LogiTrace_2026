const express = require('express')
const router = express.Router()

const {
  listIncidenciasValidation,
  createIncidenciaValidation,
  updateIncidenciaValidation,
  changeEstadoIncidenciaValidation,
} = require('./incidencia.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const incidenciaController = require('./incidencia.controller')

router.use(authMiddleware)

router.get(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  listIncidenciasValidation,
  validationMiddleware,
  incidenciaController.listIncidencias
)

router.get(
  '/resumen',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  incidenciaController.getResumenIncidencias
)

router.get(
  '/export/csv',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'),
  listIncidenciasValidation,
  validationMiddleware,
  incidenciaController.exportCsv
)

router.get(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  incidenciaController.getIncidenciaById
)

router.post(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  createIncidenciaValidation,
  validationMiddleware,
  incidenciaController.createIncidencia
)

router.put(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  updateIncidenciaValidation,
  validationMiddleware,
  incidenciaController.updateIncidencia
)

router.patch(
  '/:id/estado',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'),
  changeEstadoIncidenciaValidation,
  validationMiddleware,
  incidenciaController.changeEstado
)

router.delete(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  incidenciaController.deleteIncidencia
)

module.exports = router