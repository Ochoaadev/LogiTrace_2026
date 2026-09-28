const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function check() {
  const user = await prisma.usuario.findUnique({ where: { email: 'admin@supertequenos.com' } })
  console.log('User:', user ? 'exists' : 'NOT FOUND')
  if (user) {
    const valid = await bcrypt.compare('SuperTeq2026!Admin#', user.passwordHash)
    console.log('Password valid:', valid)
    console.log('Hash:', user.passwordHash.substring(0, 30) + '...')
  }
  await prisma.$disconnect()
}
check()