const express = require('express')
const router = express.Router()

const { loginValidation } = require('./auth.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { limiteLoginMiddleware } = require('../../middlewares/limiteLoginMiddleware')
const authController = require('./auth.controller')

router.post('/login', limiteLoginMiddleware, loginValidation, validationMiddleware, authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', authMiddleware, authController.me)

module.exports = router