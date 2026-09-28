const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.repartidor.updateMany({
    where: { estado: { not: 'DISPONIBLE' } },
    data: { estado: 'DISPONIBLE' },
  })
  console.log('Repartidores reseteados a DISPONIBLE')
  await prisma.$disconnect()
}

main()