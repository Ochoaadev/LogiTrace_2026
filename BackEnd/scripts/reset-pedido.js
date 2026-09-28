const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const pedidoId = '58db2f45-cb2e-4e3b-827f-d8f4ed645f2f'
  
  await prisma.pedido.update({
    where: { id: pedidoId },
    data: { estado: 'LISTO_PARA_DESPACHO' },
  })
  
  await prisma.despachoPedido.updateMany({
    where: { pedidoId },
    data: { estado: 'REPROGRAMADO' },
  })
  
  console.log('Pedido reseteado a LISTO_PARA_DESPACHO')
  await prisma.$disconnect()
}

main()