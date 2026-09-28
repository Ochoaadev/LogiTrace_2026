const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateIncidenciaEstados() {
  try {
    console.log('Updating incidencia estados...')
    
    // Update existing records
    const result1 = await prisma.$executeRaw`UPDATE "Incidencia" SET estado = 'REPORTADA' WHERE estado = 'ABIERTA'`
    console.log(`Updated ${result1} records from ABIERTA to REPORTADA`)
    
    const result2 = await prisma.$executeRaw`UPDATE "Incidencia" SET estado = 'EN_REVISION' WHERE estado = 'EN_GESTION'`
    console.log(`Updated ${result2} records from EN_GESTION to EN_REVISION`)
    
    console.log('Done!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateIncidenciaEstados()