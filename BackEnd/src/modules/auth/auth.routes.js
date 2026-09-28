const express = require('express')
const router = express.Router()

const { loginValidation, registerValidation, refreshValidation } = require('./auth.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const authController = require('./auth.controller')

router.post('/login', loginValidation, validationMiddleware, authController.login)
router.post('/register', registerValidation, validationMiddleware, authMiddleware, roleMiddleware('ADMINISTRADOR'), authController.register)
router.post('/refresh', refreshValidation, validationMiddleware, authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', authMiddleware, authController.me)

module.exports = router