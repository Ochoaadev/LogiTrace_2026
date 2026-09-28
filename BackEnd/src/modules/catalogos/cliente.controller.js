const clienteService = require('./cliente.service')
const { success } = require('../../utils/response')

async function listClientes(req, res, next) {
  try {
    const result = await clienteService.listClientes(req.query)
    return success(res, result.data, 'Clientes obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getClienteById(req, res, next) {
  try {
    const cliente = await clienteService.getClienteById(req.params.id)
    return success(res, cliente, 'Cliente obtenido')
  } catch (err) {
    next(err)
  }
}

async function createCliente(req, res, next) {
  try {
    const cliente = await clienteService.createCliente(req.body)
    return success(res, cliente, 'Cliente creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateCliente(req, res, next) {
  try {
    const cliente = await clienteService.updateCliente(req.params.id, req.body)
    return success(res, cliente, 'Cliente actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteCliente(req, res, next) {
  try {
    await clienteService.deleteCliente(req.params.id)
    return success(res, null, 'Cliente eliminado')
  } catch (err) {
    next(err)
  }
}

module.exports = { listClientes, getClienteById, createCliente, updateCliente, deleteCliente }