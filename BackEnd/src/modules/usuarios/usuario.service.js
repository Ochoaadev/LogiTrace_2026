const prisma = require('../../config/database')
const { hashPassword, comparePassword } = require('../auth/auth.service')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')

const DESPACHO_ACTIVO = ['PROGRAMADO', 'PREPARANDO', 'EN_RUTA', 'CON_INCIDENCIA']

// Repartidor con su despacho activo (ubicación operativa en Administración → Usuarios)
const INCLUDE_USUARIO = {
  repartidor: {
    include: {
      despachos: {
        where: { estado: { in: DESPACHO_ACTIVO } },
        take: 1,
        orderBy: { codigo: 'desc' },
        select: {
          id: true,
          codigo: true,
          estado: true,
          vehiculo: { select: { codigo: true, placa: true, tipo: true, esTermico: true } },
          ruta: { select: { nombre: true } },
        },
      },
      _count: { select: { despachos: true } },
    },
  },
}

// Un documento vacío se guarda como null (el campo es único)
const documentoONull = (d) => (d === undefined ? undefined : String(d || '').trim() || null)

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
      { documento: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
      include: INCLUDE_USUARIO,
      omit: { passwordHash: true },
    }),
    prisma.usuario.count({ where }),
  ])

  return { usuarios, total, page, limit }
}

async function getUsuarioById(id) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: INCLUDE_USUARIO,
    omit: { passwordHash: true },
  })

  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }

  return usuario
}

async function validarUnicos({ email, documento }, idActual = null) {
  if (email) {
    const existente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } })
    if (existente && existente.id !== idActual) throw new AppError('El email ya está registrado', 409)
  }
  if (documento) {
    const existente = await prisma.usuario.findUnique({ where: { documento } })
    if (existente && existente.id !== idActual) throw new AppError('El documento ya está registrado', 409)
  }
}

// El teléfono y la licencia son datos del repartidor (la tabla Usuario no tiene esos campos;
// antes se enviaban a Usuario y el registro fallaba cuando se indicaba un teléfono)
async function createUsuario(data) {
  const { nombre, email, password, rol, telefono, numeroLicencia } = data
  const documento = documentoONull(data.documento)
  await validarUnicos({ email, documento })

  const passwordHash = await hashPassword(password)
  const codigo = `USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const usuario = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.usuario.create({
      data: { codigo, nombre, email: email.toLowerCase(), passwordHash, rol, documento },
    })
    if (rol === 'REPARTIDOR') {
      await tx.repartidor.create({
        data: { usuarioId: nuevo.id, estado: 'DISPONIBLE', telefono: telefono || null, numeroLicencia: numeroLicencia || null },
      })
    }
    return nuevo
  })

  return getUsuarioById(usuario.id)
}

async function updateUsuario(id, data) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, include: { repartidor: true } })
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }

  const documento = documentoONull(data.documento)
  await validarUnicos({ email: data.email, documento }, id)

  const updateData = {}
  if (data.nombre) updateData.nombre = data.nombre
  if (data.email) updateData.email = data.email.toLowerCase()
  if (documento !== undefined) updateData.documento = documento

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id }, data: updateData })
    if (usuario.repartidor && (data.telefono !== undefined || data.numeroLicencia !== undefined)) {
      await tx.repartidor.update({
        where: { id: usuario.repartidor.id },
        data: {
          ...(data.telefono !== undefined && { telefono: data.telefono || null }),
          ...(data.numeroLicencia !== undefined && { numeroLicencia: data.numeroLicencia || null }),
        },
      })
    }
  })

  return getUsuarioById(id)
}

async function contarAdminsActivos() {
  return prisma.usuario.count({ where: { rol: 'ADMINISTRADOR', activo: true } })
}

async function changeEstado(id, activo, currentUser) {
  if (id === currentUser.sub) {
    throw new AppError('No puedes desactivarte a ti mismo', 400)
  }

  const usuario = await prisma.usuario.findUnique({ where: { id }, include: { repartidor: true } })
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }

  if (!activo) {
    if (usuario.rol === 'ADMINISTRADOR' && usuario.activo && (await contarAdminsActivos()) <= 1) {
      throw new AppError('Debe haber al menos un administrador activo', 400)
    }
    if (usuario.repartidor?.estado === 'EN_RUTA') {
      throw new AppError('El repartidor tiene un despacho en ruta; finalícelo antes de desactivar la cuenta', 409)
    }
  }

  await prisma.usuario.update({ where: { id }, data: { activo } })
  return getUsuarioById(id)
}

async function changeRol(id, rol, currentUser) {
  if (id === currentUser.sub) {
    throw new AppError('No puedes cambiarte el rol a ti mismo', 400)
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: { repartidor: { include: { _count: { select: { despachos: true, ubicacionesGPS: true } } } } },
  })
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }
  if (usuario.rol === rol) return getUsuarioById(id)

  if (usuario.rol === 'ADMINISTRADOR' && usuario.activo && (await contarAdminsActivos()) <= 1) {
    throw new AppError('Debe haber al menos un administrador activo', 400)
  }

  const wasRepartidor = usuario.rol === 'REPARTIDOR'
  const willBeRepartidor = rol === 'REPARTIDOR'

  // Un repartidor con historial de despachos o GPS no puede dejar de serlo: sus registros
  // quedarían sin responsable (antes el borrado fallaba con error 500 por la referencia)
  if (wasRepartidor && usuario.repartidor) {
    const { despachos, ubicacionesGPS } = usuario.repartidor._count
    if (despachos > 0 || ubicacionesGPS > 0) {
      throw new AppError('El repartidor tiene despachos registrados y su historial debe conservarse. Desactive esta cuenta y cree una nueva con el rol deseado.', 409)
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id }, data: { rol } })
    if (wasRepartidor && !willBeRepartidor && usuario.repartidor) {
      await tx.repartidor.delete({ where: { usuarioId: id } })
    } else if (!wasRepartidor && willBeRepartidor) {
      const existente = await tx.repartidor.findUnique({ where: { usuarioId: id } })
      if (!existente) await tx.repartidor.create({ data: { usuarioId: id, estado: 'DISPONIBLE' } })
    }
  })

  return getUsuarioById(id)
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

// El administrador asigna una contraseña nueva (p. ej. si el usuario la olvidó)
async function resetPassword(id, passwordNueva) {
  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) throw new AppError('Usuario no encontrado', 404)
  await prisma.usuario.update({ where: { id }, data: { passwordHash: await hashPassword(passwordNueva) } })
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
  resetPassword,
}
