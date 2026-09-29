const pedidoService = require('./pedido.service')
const { success } = require('../../utils/response')

async function listPedidos(req, res, next) {
  try {
    const result = await pedidoService.listPedidos(req.query)
    return success(res, result.data, 'Pedidos obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getPedidoById(req, res, next) {
  try {
    const pedido = await pedidoService.getPedidoById(req.params.id)
    return success(res, pedido, 'Pedido obtenido')
  } catch (err) {
    next(err)
  }
}

async function createPedido(req, res, next) {
  try {
    const pedido = await pedidoService.createPedido(req.body, req.user.sub)
    return success(res, pedido, 'Pedido creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updatePedido(req, res, next) {
  try {
    const pedido = await pedidoService.updatePedido(req.params.id, req.body)
    return success(res, pedido, 'Pedido actualizado')
  } catch (err) {
    next(err)
  }
}

async function changeEstado(req, res, next) {
  try {
    const { estado } = req.body
    const observaciones = req.body.observaciones
    const pedido = await pedidoService.changeEstado(req.params.id, estado, req.user.sub, observaciones)
    return success(res, pedido, `Estado cambiado a ${estado}`)
  } catch (err) {
    next(err)
  }
}

async function prepararPedido(req, res, next) {
  try {
    const pedido = await pedidoService.prepararPedido(req.params.id, req.user.sub)
    return success(res, pedido, 'Preparación iniciada')
  } catch (err) {
    next(err)
  }
}

async function listoParaDespacho(req, res, next) {
  try {
    const { itemsPreparados } = req.body
    const pedido = await pedidoService.listoParaDespacho(req.params.id, req.user.sub, itemsPreparados)
    return success(res, pedido, 'Pedido listo para despacho')
  } catch (err) {
    next(err)
  }
}

async function deletePedido(req, res, next) {
  try {
    await pedidoService.deletePedido(req.params.id)
    return success(res, null, 'Pedido eliminado')
  } catch (err) {
    next(err)
  }
}

async function getResumenPedidos(req, res, next) {
  try {
    const resumen = await pedidoService.getResumenPedidos()
    return success(res, resumen, 'Resumen de pedidos obtenido')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getResumenPedidos,
  listPedidos,
  getPedidoById,
  createPedido,
  updatePedido,
  changeEstado,
  prepararPedido,
  listoParaDespacho,
  deletePedido,
}