const prisma = require('../../config/database')
const { hashPassword, comparePassword } = require('../auth/auth.service')
const { success, error } = require('../../utils/response')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')

async function listUsuarios(query) {
  const { page, limit, skip } = getPagination(query)
  const { rol, activo, search } = query

  const where = {}

  if (rol) where.rol = rol
  if (activo !== undefined) where.activo = activo === 'true'
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { codigo: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { repartidor: true },
      omit: { passwordHash: true },
    }),
    prisma.usuario.count({ where }),
  ])

  return { usuarios, total, page, limit }
}

async function getUsuarioById(id) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: { repartidor: true },
    omit: { passwordHash: true },
  })

  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }

  return usuario
}

async function createUsuario(data) {
  const { nombre, email, password, rol, documento, telefono } = data

  const existingEmail = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
  })
  if (existingEmail) {
    throw new AppError('El email ya está registrado', 409)
  }

  if (documento) {
    const existingDoc = await prisma.usuario.findUnique({
      where: { documento },
    })
    if (existingDoc) {
      throw new AppError('El documento ya está registrado', 409)
    }
  }

  const passwordHash = await hashPassword(password)

  const codigo = `USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const usuario = await prisma.usuario.create({
    data: {
      codigo,
      nombre,
      email: email.toLowerCase(),
      passwordHash,
      rol,
      documento,
      telefono,
    },
    include: { repartidor: true },
    omit: { passwordHash: true },
  })

  if (rol === 'REPARTIDOR') {
    await prisma.repartidor.create({
      data: { usuarioId: usuario.id, estado: 'DISPONIBLE' },
    })
    const usuarioConRepartidor = await prisma.usuario.findUnique({
      where: { id: usuario.id },
      include: { repartidor: true },
      omit: { passwordHash: true },
    })
    return usuarioConRepartidor
  }

  return usuario
}

async function updateUsuario(id, data, currentUser) {
  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }

  if (data.email && data.email !== usuario.email) {
    const existing = await prisma.usuario.findUnique({
      where: { email: data.email.toLowerCase() },
    })
    if (existing) {
      throw new AppError('El email ya está en uso', 400)
    }
  }

  if (data.documento && data.documento !== usuario.documento) {
    const existing = await prisma.usuario.findUnique({
      where: { documento: data.documento },
    })
    if (existing) {
      throw new AppError('El documento ya está en uso', 400)
    }
  }

  const updateData = {}
  if (data.nombre) updateData.nombre = data.nombre
  if (data.email) updateData.email = data.email.toLowerCase()
  if (data.documento !== undefined) updateData.documento = data.documento
  if (data.telefono !== undefined) updateData.telefono = data.telefono

  const updated = await prisma.usuario.update({
    where: { id },
    data: updateData,
    include: { repartidor: true },
    omit: { passwordHash: true },
  })

  return updated
}

async function changeEstado(id, activo, currentUser) {
  if (id === currentUser.sub) {
    throw new AppError('No puedes desactivarte a ti mismo', 400)
  }

  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }

  if (usuario.rol === 'ADMINISTRADOR' && !activo) {
    const adminCount = await prisma.usuario.count({
      where: { rol: 'ADMINISTRADOR', activo: true },
    })
    if (adminCount <= 1) {
      throw new AppError('Debe haber al menos un administrador activo', 400)
    }
  }

  const updated = await prisma.usuario.update({
    where: { id },
    data: { activo },
    include: { repartidor: true },
    omit: { passwordHash: true },
  })

  return updated
}

async function changeRol(id, rol, currentUser) {
  if (id === currentUser.sub) {
    throw new AppError('No puedes cambiarte el rol a ti mismo', 400)
  }

  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }

  if (usuario.rol === 'ADMINISTRADOR' && rol !== 'ADMINISTRADOR') {
    const adminCount = await prisma.usuario.count({
      where: { rol: 'ADMINISTRADOR', activo: true },
    })
    if (adminCount <= 1) {
      throw new AppError('Debe haber al menos un administrador activo', 400)
    }
  }

  const wasRepartidor = usuario.rol === 'REPARTIDOR'
  const willBeRepartidor = rol === 'REPARTIDOR'

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.usuario.update({
      where: { id },
      data: { rol },
      include: { repartidor: true },
      omit: { passwordHash: true },
    })

    if (wasRepartidor && !willBeRepartidor) {
      await tx.repartidor.delete({ where: { usuarioId: id } })
    } else if (!wasRepartidor && willBeRepartidor) {
      await tx.repartidor.create({
        data: { usuarioId: id, estado: 'DISPONIBLE' },
      })
    }

    return user
  })

  return updated
}

async function changePassword(userId, { passwordActual, passwordNueva }) {
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } })
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }

  const valid = await comparePassword(passwordActual, usuario.passwordHash)
  if (!valid) {
    throw new AppError('La contraseña actual es incorrecta', 400)
  }

  const passwordHash = await hashPassword(passwordNueva)

  await prisma.usuario.update({
    where: { id: userId },
    data: { passwordHash },
  })

  return true
}

module.exports = {
  listUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  changeEstado,
  changeRol,
  changePassword,
}