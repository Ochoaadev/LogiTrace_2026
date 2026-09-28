const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const inventario = await prisma.inventario.findMany({
    where: { lote: { producto: { codigo: 'BEB-003' } } },
    include: { lote: true, ubicacion: true },
  })
  console.log(JSON.stringify(inventario, null, 2))
  await prisma.$disconnect()
}

main()