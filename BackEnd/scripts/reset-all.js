const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Reset repartidores
  await prisma.repartidor.updateMany({
    where: { estado: { not: 'DISPONIBLE' } },
    data: { estado: 'DISPONIBLE' },
  })
  console.log('Repartidores -> DISPONIBLE')

  // Reset pedidos en estados de despacho
  await prisma.pedido.updateMany({
    where: { estado: { in: ['EN_PREPARACION', 'LISTO_PARA_DESPACHO', 'EN_RUTA', 'CON_INCIDENCIA'] } },
    data: { estado: 'LISTO_PARA_DESPACHO' },
  })
  console.log('Pedidos -> LISTO_PARA_DESPACHO')

  // Reset despachoPedidos
  await prisma.despachoPedido.updateMany({
    where: { estado: { not: 'PENDIENTE' } },
    data: { estado: 'PENDIENTE' },
  })
  console.log('DespachoPedidos -> PENDIENTE')

  // Delete despachos no finalizados
  await prisma.despacho.deleteMany({
    where: { estado: { notIn: ['FINALIZADO', 'CANCELADO'] } },
  })
  console.log('Despachos temporales eliminados')

  await prisma.$disconnect()
  console.log('Reset completo')
}

main()