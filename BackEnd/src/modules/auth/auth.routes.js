const express = require('express')
const router = express.Router()

const { loginValidation, registerValidation, refreshValidation } = require('./auth.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const { limiteLoginMiddleware } = require('../../middlewares/limiteLoginMiddleware')
const authController = require('./auth.controller')

router.post('/login', limiteLoginMiddleware, loginValidation, validationMiddleware, authController.login)
// Primero sesión y perfil, después los datos (antes la validación iba primero y cualquiera,
// incluso sin sesión, recibía sus mensajes; el perfil se comprobaba igual, pero después)
router.post('/register', authMiddleware, roleMiddleware('ADMINISTRADOR'), registerValidation, validationMiddleware, authController.register)
router.post('/refresh', refreshValidation, validationMiddleware, authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', authMiddleware, authController.me)

module.exports = router