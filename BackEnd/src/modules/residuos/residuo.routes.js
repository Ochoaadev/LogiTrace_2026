const express = require('express')
const router = express.Router()

const {
  listResiduosValidation,
  createResiduoValidation,
  updateResiduoValidation,
  changeEstadoResiduoValidation,
} = require('./residuo.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const residuoController = require('./residuo.controller')

router.use(authMiddleware)

router.get(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  listResiduosValidation,
  validationMiddleware,
  residuoController.listResiduos
)

router.get(
  '/resumen',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'),
  residuoController.getResumen
)

router.get(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  residuoController.getResiduoById
)

router.post(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  createResiduoValidation,
  validationMiddleware,
  residuoController.createResiduo
)

router.put(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  updateResiduoValidation,
  validationMiddleware,
  residuoController.updateResiduo
)

router.patch(
  '/:id/estado',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  changeEstadoResiduoValidation,
  validationMiddleware,
  residuoController.changeEstado
)

router.delete(
  '/:id',
  roleMiddleware('ADMINISTRADOR'),
  residuoController.deleteResiduo
)

module.exports = router