// Salida de inventario al preparar pedidos. Antes, "listo para despacho" sin lotes indicados (como lo
// envía la interfaz) no descontaba stock, mientras que el reingreso de una devolución sí lo sumaba:
// el inventario de la cava crecía con cada devolución. Detectado en las pruebas PF-08, PF-12 y PF-14.
const { AppError } = require('../../utils/AppError')

const redondear = (n) => Math.round(n * 100) / 100

/**
 * Lotes a descontar para cada producto del pedido, por FEFO (vence primero, sale primero), solo de
 * lotes DISPONIBLES en cava (los no perecederos también pueden salir del almacén). Un producto sin
 * ningún registro de inventario no se controla por stock y se omite.
 */
async function asignarLotesFefo(tx, pedido) {
  const items = []
  for (const detalle of pedido.detalles) {
    const inventariado = await tx.inventario.count({ where: { lote: { productoId: detalle.productoId } } })
    if (!inventariado) continue

    const existencias = await tx.inventario.findMany({
      where: {
        stockActual: { gt: 0 },
        lote: { productoId: detalle.productoId, estadoCalidad: 'DISPONIBLE' },
        ubicacion: { tipo: { in: detalle.producto.esPerecedero ? ['CAVA'] : ['CAVA', 'ALMACEN'] } },
      },
      include: { lote: { select: { codigo: true, fechaVencimiento: true } } },
      orderBy: [{ lote: { fechaVencimiento: { sort: 'asc', nulls: 'last' } } }, { lote: { codigo: 'asc' } }],
    })

    let pendiente = Number(detalle.cantidad)
    for (const e of existencias) {
      if (pendiente <= 0) break
      const toma = redondear(Math.min(pendiente, Number(e.stockActual)))
      items.push({ loteId: e.loteId, ubicacionId: e.ubicacionId, cantidad: toma, unidad: detalle.unidad })
      pendiente = redondear(pendiente - toma)
    }
    if (pendiente > 0) {
      throw new AppError(`Stock insuficiente en cava para ${detalle.producto.nombre}: faltan ${pendiente} ${detalle.unidad}`, 400)
    }
  }
  return items
}

/**
 * Registra en la parada (DetalleDespacho) los lotes que salieron al preparar el pedido, para que la
 * trazabilidad y una eventual devolución refieran al lote real despachado.
 */
async function vincularLotesParada(tx, despachoPedidoId, pedidoId) {
  const [pedido, salidas] = await Promise.all([
    tx.pedido.findUnique({ where: { id: pedidoId }, include: { detalles: true } }),
    tx.movimientoInventario.findMany({
      where: { referenciaTipo: 'Pedido', referenciaId: pedidoId, tipo: 'SALIDA' },
      include: { lote: { select: { productoId: true } } },
      orderBy: { fechaHora: 'asc' },
    }),
  ])
  const restante = new Map(salidas.map((s) => [s.id, Number(s.cantidad)]))
  for (const detalle of pedido.detalles) {
    let pendiente = Number(detalle.cantidad)
    for (const s of salidas) {
      if (pendiente <= 0) break
      const disponible = restante.get(s.id)
      if (s.lote.productoId !== detalle.productoId || disponible <= 0) continue
      const toma = redondear(Math.min(pendiente, disponible))
      await tx.detalleDespacho.create({
        data: { despachoPedidoId, detallePedidoId: detalle.id, loteId: s.loteId, cantidad: toma, unidad: detalle.unidad },
      })
      restante.set(s.id, redondear(disponible - toma))
      pendiente = redondear(pendiente - toma)
    }
  }
}

/** Devuelve a su ubicación el stock que salió al preparar un pedido que luego se cancela. */
async function revertirSalidasPedido(tx, pedido, usuarioId) {
  const salidas = await tx.movimientoInventario.findMany({
    where: { referenciaTipo: 'Pedido', referenciaId: pedido.id, tipo: 'SALIDA' },
  })
  for (const s of salidas) {
    await tx.inventario.update({
      where: { loteId_ubicacionId: { loteId: s.loteId, ubicacionId: s.ubicacionOrigenId } },
      data: { stockActual: { increment: s.cantidad } },
    })
    await tx.movimientoInventario.create({
      data: {
        tipo: 'REINGRESO',
        loteId: s.loteId,
        ubicacionDestinoId: s.ubicacionOrigenId,
        cantidad: s.cantidad,
        unidad: s.unidad,
        usuarioId,
        referenciaTipo: 'Pedido',
        referenciaId: pedido.id,
        observaciones: `Anulación de la preparación del pedido ${pedido.codigo}`,
      },
    })
  }
  return salidas.length
}

module.exports = { asignarLotesFefo, vincularLotesParada, revertirSalidasPedido }
