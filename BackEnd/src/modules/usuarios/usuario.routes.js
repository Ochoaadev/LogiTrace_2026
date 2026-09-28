const express = require('express')
const router = express.Router()

const {
  listUsuariosValidation,
  createUsuarioValidation,
  updateUsuarioValidation,
  changeEstadoValidation,
  changeRolValidation,
  changePasswordValidation,
} = require('./usuario.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const usuarioController = require('./usuario.controller')

router.get(
  '/',
  authMiddleware,
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'),
  listUsuariosValidation,
  validationMiddleware,
  usuarioController.listUsuarios
)

router.get(
  '/:id',
  authMiddleware,
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'),
  usuarioController.getUsuarioById
)

router.post(
  '/',
  authMiddleware,
  roleMiddleware('ADMINISTRADOR'),
  createUsuarioValidation,
  validationMiddleware,
  usuarioController.createUsuario
)

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('ADMINISTRADOR'),
  updateUsuarioValidation,
  validationMiddleware,
  usuarioController.updateUsuario
)

router.patch(
  '/:id/estado',
  authMiddleware,
  roleMiddleware('ADMINISTRADOR'),
  changeEstadoValidation,
  validationMiddleware,
  usuarioController.changeEstado
)

router.patch(
  '/:id/rol',
  authMiddleware,
  roleMiddleware('ADMINISTRADOR'),
  changeRolValidation,
  validationMiddleware,
  usuarioController.changeRol
)

router.patch(
  '/:id/password',
  authMiddleware,
  changePasswordValidation,
  validationMiddleware,
  usuarioController.changePassword
)

module.exports = router