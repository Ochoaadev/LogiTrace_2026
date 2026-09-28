const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const ubicaciones = await prisma.ubicacionAlmacen.findMany({
    take: 10,
    select: { id: true, codigo: true, nombre: true },
  })
  console.log(JSON.stringify(ubicaciones, null, 2))
  await prisma.$disconnect()
}

main()