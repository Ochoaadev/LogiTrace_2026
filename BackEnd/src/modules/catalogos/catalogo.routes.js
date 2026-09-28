const express = require('express')
const router = express.Router()

const {
  listProductosValidation,
  createProductoValidation,
  updateProductoValidation,
} = require('./producto.validation')
const {
  listClientesValidation,
  createClienteValidation,
  updateClienteValidation,
} = require('./cliente.validation')
const {
  listZonasValidation,
  createZonaValidation,
  updateZonaValidation,
} = require('./zona.validation')
const {
  listVehiculosValidation,
  createVehiculoValidation,
  updateVehiculoValidation,
} = require('./vehiculo.validation')
const {
  listTiposIncidenciaValidation,
  createTipoIncidenciaValidation,
  updateTipoIncidenciaValidation,
} = require('./tipoIncidencia.validation')
const {
  listMotivosDevolucionValidation,
  createMotivoDevolucionValidation,
  updateMotivoDevolucionValidation,
} = require('./motivoDevolucion.validation')
const {
  listTiposResiduoValidation,
  createTipoResiduoValidation,
  updateTipoResiduoValidation,
} = require('./tipoResiduo.validation')
const {
  listGestoresResiduoValidation,
  createGestorResiduoValidation,
  updateGestorResiduoValidation,
} = require('./gestorResiduo.validation')

const { validationMiddleware } = require('../../middlewares/validationMiddleware')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const { roleMiddleware } = require('../../middlewares/roleMiddleware')

const productoController = require('./producto.controller')
const clienteController = require('./cliente.controller')
const zonaController = require('./zona.controller')
const vehiculoController = require('./vehiculo.controller')
const tipoIncidenciaController = require('./tipoIncidencia.controller')
const motivoDevolucionController = require('./motivoDevolucion.controller')
const tipoResiduoController = require('./tipoResiduo.controller')
const gestorResiduoController = require('./gestorResiduo.controller')

// Todas las rutas requieren autenticación
router.use(authMiddleware)

// ============================================================
// PRODUCTOS
// ============================================================
router.get('/productos', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), listProductosValidation, validationMiddleware, productoController.listProductos)
router.get('/productos/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), productoController.getProductoById)
router.post('/productos', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), createProductoValidation, validationMiddleware, productoController.createProducto)
router.put('/productos/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), updateProductoValidation, validationMiddleware, productoController.updateProducto)
router.delete('/productos/:id', roleMiddleware('ADMINISTRADOR'), productoController.deleteProducto)

// ============================================================
// CLIENTES
// ============================================================
router.get('/clientes', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), listClientesValidation, validationMiddleware, clienteController.listClientes)
router.get('/clientes/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), clienteController.getClienteById)
router.post('/clientes', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), createClienteValidation, validationMiddleware, clienteController.createCliente)
router.put('/clientes/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), updateClienteValidation, validationMiddleware, clienteController.updateCliente)
router.delete('/clientes/:id', roleMiddleware('ADMINISTRADOR'), clienteController.deleteCliente)

// ============================================================
// ZONAS DE DESPACHO
// ============================================================
router.get('/zonas', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), listZonasValidation, validationMiddleware, zonaController.listZonas)
router.get('/zonas/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), zonaController.getZonaById)
router.post('/zonas', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), createZonaValidation, validationMiddleware, zonaController.createZona)
router.put('/zonas/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), updateZonaValidation, validationMiddleware, zonaController.updateZona)
router.delete('/zonas/:id', roleMiddleware('ADMINISTRADOR'), zonaController.deleteZona)

// ============================================================
// VEHÍCULOS
// ============================================================
router.get('/vehiculos', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), listVehiculosValidation, validationMiddleware, vehiculoController.listVehiculos)
router.get('/vehiculos/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), vehiculoController.getVehiculoById)
router.post('/vehiculos', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), createVehiculoValidation, validationMiddleware, vehiculoController.createVehiculo)
router.put('/vehiculos/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), updateVehiculoValidation, validationMiddleware, vehiculoController.updateVehiculo)
router.delete('/vehiculos/:id', roleMiddleware('ADMINISTRADOR'), vehiculoController.deleteVehiculo)

// ============================================================
// TIPOS DE INCIDENCIA
// ============================================================
router.get('/tipos-incidencia', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), listTiposIncidenciaValidation, validationMiddleware, tipoIncidenciaController.listTiposIncidencia)
router.get('/tipos-incidencia/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), tipoIncidenciaController.getTipoIncidenciaById)
router.post('/tipos-incidencia', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), createTipoIncidenciaValidation, validationMiddleware, tipoIncidenciaController.createTipoIncidencia)
router.put('/tipos-incidencia/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), updateTipoIncidenciaValidation, validationMiddleware, tipoIncidenciaController.updateTipoIncidencia)
router.delete('/tipos-incidencia/:id', roleMiddleware('ADMINISTRADOR'), tipoIncidenciaController.deleteTipoIncidencia)

// ============================================================
// MOTIVOS DE DEVOLUCIÓN
// ============================================================
router.get('/motivos-devolucion', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), listMotivosDevolucionValidation, validationMiddleware, motivoDevolucionController.listMotivosDevolucion)
router.get('/motivos-devolucion/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), motivoDevolucionController.getMotivoDevolucionById)
router.post('/motivos-devolucion', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), createMotivoDevolucionValidation, validationMiddleware, motivoDevolucionController.createMotivoDevolucion)
router.put('/motivos-devolucion/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), updateMotivoDevolucionValidation, validationMiddleware, motivoDevolucionController.updateMotivoDevolucion)
router.delete('/motivos-devolucion/:id', roleMiddleware('ADMINISTRADOR'), motivoDevolucionController.deleteMotivoDevolucion)

// ============================================================
// TIPOS DE RESIDUO
// ============================================================
router.get('/tipos-residuo', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), listTiposResiduoValidation, validationMiddleware, tipoResiduoController.listTiposResiduo)
router.get('/tipos-residuo/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), tipoResiduoController.getTipoResiduoById)
router.post('/tipos-residuo', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), createTipoResiduoValidation, validationMiddleware, tipoResiduoController.createTipoResiduo)
router.put('/tipos-residuo/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), updateTipoResiduoValidation, validationMiddleware, tipoResiduoController.updateTipoResiduo)
router.delete('/tipos-residuo/:id', roleMiddleware('ADMINISTRADOR'), tipoResiduoController.deleteTipoResiduo)

// ============================================================
// GESTORES DE RESIDUO
// ============================================================
router.get('/gestores-residuo', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), listGestoresResiduoValidation, validationMiddleware, gestorResiduoController.listGestoresResiduo)
router.get('/gestores-residuo/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'), gestorResiduoController.getGestorResiduoById)
router.post('/gestores-residuo', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), createGestorResiduoValidation, validationMiddleware, gestorResiduoController.createGestorResiduo)
router.put('/gestores-residuo/:id', roleMiddleware('ADMINISTRADOR', 'SUPERVISOR'), updateGestorResiduoValidation, validationMiddleware, gestorResiduoController.updateGestorResiduo)
router.delete('/gestores-residuo/:id', roleMiddleware('ADMINISTRADOR'), gestorResiduoController.deleteGestorResiduo)

module.exports = router