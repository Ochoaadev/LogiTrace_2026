const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Reset devoluciones
  await prisma.devolucion.deleteMany({})
  console.log('Devoluciones eliminadas')

  // Reset despacho-pedido
  await prisma.despachoPedido.updateMany({
    where: { estado: { in: ['DEVUELTO', 'REPROGRAMADO'] } },
    data: { estado: 'EN_RUTA' },
  })
  console.log('Despacho-pedidos -> EN_RUTA')

  // Reset pedidos
  await prisma.pedido.updateMany({
    where: { estado: { in: ['ENTREGADO', 'DEVUELTO', 'CERRADO'] } },
    data: { estado: 'EN_RUTA' },
  })
  console.log('Pedidos -> EN_RUTA')

  // Reset despacho
  await prisma.despacho.updateMany({
    where: { estado: { in: ['FINALIZADO', 'CON_INCIDENCIA'] } },
    data: { estado: 'EN_RUTA', fechaHoraCierre: null },
  })
  console.log('Despachos -> EN_RUTA')

  // Reset incidencia
  await prisma.incidencia.updateMany({
    where: { estado: { in: ['EN_REVISION', 'EN_ATENCION', 'RESUELTA', 'CERRADA'] } },
    data: { estado: 'REPORTADA', resueltaPorId: null, fechaResolucion: null },
  })
  console.log('Incidencias -> REPORTADA')

  // Reset despacho-pedido state for incidencia
  await prisma.despachoPedido.updateMany({
    where: { estado: 'CON_INCIDENCIA' },
    data: { estado: 'EN_RUTA' },
  })

  await prisma.$disconnect()
  console.log('Reset completo para test de devoluciones')
}

main()