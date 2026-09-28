const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const lotes = await prisma.lote.findMany({
    take: 10,
    select: { id: true, codigo: true, productoId: true },
  })
  console.log(JSON.stringify(lotes, null, 2))
  await prisma.$disconnect()
}

main()