const express = require('express')
const router = express.Router()

const {
  listInventarioValidation,
  createInventarioValidation,
  updateInventarioValidation,
  movimientoValidation,
  listInventarioValidation: listInventarioValidationAlias,
  listMovimientosValidation,
} = require('./inventario.validation')
const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')
const inventarioController = require('./inventario.controller')

router.use(authMiddleware)

// ============================================================
// INVENTARIO (Stock por lote/ubicación)
// ============================================================
router.get(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  listInventarioValidationAlias,
  validationMiddleware,
  inventarioController.listInventario
)

router.get(
  '/resumen',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  inventarioController.getResumenInventario
)

router.get(
  '/stock-bajo',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  inventarioController.getStockBajo
)

// ============================================================
// MOVIMIENTOS DE INVENTARIO (antes de /:id para evitar conflicto)
// ============================================================
router.get(
  '/movimientos',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  listMovimientosValidation,
  validationMiddleware,
  inventarioController.listMovimientos
)

router.get(
  '/movimientos/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  inventarioController.getMovimientoById
)

router.post(
  '/movimiento',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  movimientoValidation,
  validationMiddleware,
  inventarioController.registrarMovimiento
)

// ============================================================
// INVENTARIO (Stock por lote/ubicación) - Rutas con parámetros al final
// ============================================================
router.get(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'),
  inventarioController.getInventarioById
)

router.post(
  '/',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'),
  createInventarioValidation,
  validationMiddleware,
  inventarioController.createInventario
)

router.put(
  '/:id',
  roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'),
  updateInventarioValidation,
  validationMiddleware,
  inventarioController.updateInventario
)

router.delete(
  '/:id',
  roleMiddleware('ADMINISTRADOR'),
  inventarioController.deleteInventario
)

module.exports = router