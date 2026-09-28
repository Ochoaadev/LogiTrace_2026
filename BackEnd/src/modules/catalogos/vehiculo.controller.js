const vehiculoService = require('./vehiculo.service')
const { success } = require('../../utils/response')

async function listVehiculos(req, res, next) {
  try {
    const result = await vehiculoService.listVehiculos(req.query)
    return success(res, result.data, 'Vehículos obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getVehiculoById(req, res, next) {
  try {
    const vehiculo = await vehiculoService.getVehiculoById(req.params.id)
    return success(res, vehiculo, 'Vehículo obtenido')
  } catch (err) {
    next(err)
  }
}

async function createVehiculo(req, res, next) {
  try {
    const vehiculo = await vehiculoService.createVehiculo(req.body)
    return success(res, vehiculo, 'Vehículo creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateVehiculo(req, res, next) {
  try {
    const vehiculo = await vehiculoService.updateVehiculo(req.params.id, req.body)
    return success(res, vehiculo, 'Vehículo actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteVehiculo(req, res, next) {
  try {
    await vehiculoService.deleteVehiculo(req.params.id)
    return success(res, null, 'Vehículo eliminado')
  } catch (err) {
    next(err)
  }
}

module.exports = { listVehiculos, getVehiculoById, createVehiculo, updateVehiculo, deleteVehiculo }