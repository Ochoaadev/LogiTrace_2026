const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const repartidores = await prisma.repartidor.findMany({
    select: { id: true, usuario: { select: { nombre: true, email: true } } },
  })
  console.log(JSON.stringify(repartidores, null, 2))
  await prisma.$disconnect()
}

main()