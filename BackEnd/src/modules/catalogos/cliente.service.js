const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')

const CAMPOS_CLIENTE = ['codigo', 'razonSocial', 'nombreContacto', 'tipoDocumento', 'numeroDocumento', 'telefono', 'email', 'activo']
const permitidos = (data) => Object.fromEntries(Object.entries(data).filter(([k, v]) => CAMPOS_CLIENTE.includes(k) && v !== undefined))
const soloDigitos = (v) => String(v || '').replace(/\D/g, '')

/**
 * Documento en formato único (V-12345678, J-12345678-9, P-AB123456) para que la misma cédula escrita
 * con puntos, espacios o sin guion no se registre dos veces.
 */
function normalizarDocumento(tipo, numero) {
  if (!numero) return { tipoDocumento: tipo || null, numeroDocumento: null }
  let limpio = String(numero).toUpperCase().replace(/[^A-Z0-9]/g, '')
  const letra = /^[VEJGP]/.test(limpio) ? limpio[0] : null
  const t = (tipo || letra || '').toUpperCase()
  if (!t) throw new AppError('Indique el tipo de documento (V, E, J, G o P)', 400)
  // "V-12345678" con tipo V: la letra sobra. Un pasaporte puede empezar por letra, así que se conserva.
  if (letra && letra === t && t !== 'P') limpio = limpio.slice(1)
  else if (letra && t !== 'P') throw new AppError(`El documento empieza por ${letra} pero el tipo indicado es ${t}`, 400)
  if (t === 'P') {
    if (/^\s*P\s*-/i.test(numero)) limpio = limpio.slice(1) // "P-AB123456"
    if (!/^[A-Z0-9]{5,20}$/.test(limpio)) throw new AppError('Pasaporte inválido', 400)
    return { tipoDocumento: t, numeroDocumento: `P-${limpio}` }
  }
  if (!/^\d+$/.test(limpio)) throw new AppError('El número de documento solo debe tener dígitos', 400)
  if (t === 'J' || t === 'G') {
    if (limpio.length !== 9) throw new AppError('El RIF debe tener 9 dígitos (ej.: J-12345678-9)', 400)
    return { tipoDocumento: t, numeroDocumento: `${t}-${limpio.slice(0, 8)}-${limpio.slice(8)}` }
  }
  if (limpio.length < 6 || limpio.length > 9) throw new AppError('La cédula debe tener entre 6 y 9 dígitos', 400)
  return { tipoDocumento: t, numeroDocumento: `${t}-${Number(limpio)}` }
}

/** Otro cliente con el mismo documento (compara solo los dígitos, sea cual sea el formato guardado). */
async function documentoDuplicado(numeroDocumento, excluirId) {
  const digitos = soloDigitos(numeroDocumento)
  if (!digitos) return null
  const [fila] = await prisma.$queryRaw`
    SELECT "codigo", "razonSocial" FROM "Cliente"
    WHERE ltrim(regexp_replace(COALESCE("numeroDocumento", ''), '[^0-9]', '', 'g'), '0') = ltrim(${digitos}, '0')
      AND left("numeroDocumento", 1) = left(${numeroDocumento}, 1)
      AND "id"::text <> ${excluirId || ''}
    LIMIT 1`
  return fila || null
}

/** Siguiente código CLI-### libre. */
async function siguienteCodigo() {
  const codigos = await prisma.cliente.findMany({ where: { codigo: { startsWith: 'CLI-' } }, select: { codigo: true } })
  const mayor = codigos.reduce((m, c) => Math.max(m, Number(c.codigo.slice(4)) || 0), 0)
  return `CLI-${String(mayor + 1).padStart(3, '0')}`
}

async function listClientes(query) {
  const { page, limit, skip } = getPagination(query)
  const { activo, search } = query

  const where = {}
  if (activo !== undefined) where.activo = activo === 'true'
  if (search) {
    where.OR = [
      { razonSocial: { contains: search, mode: 'insensitive' } },
      { codigo: { contains: search, mode: 'insensitive' } },
      { nombreContacto: { contains: search, mode: 'insensitive' } },
      { numeroDocumento: { contains: search, mode: 'insensitive' } },
    ]
    // Cédula o RIF escritos sin guiones ni puntos (12.345.678 o 12345678 encuentran V-12345678)
    const digitos = soloDigitos(search)
    if (digitos.length >= 4) {
      const filas = await prisma.$queryRaw`
        SELECT "id" FROM "Cliente"
        WHERE regexp_replace(COALESCE("numeroDocumento", ''), '[^0-9]', '', 'g') LIKE ${'%' + digitos + '%'}`
      if (filas.length) where.OR.push({ id: { in: filas.map((f) => f.id) } })
    }
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      skip,
      take: limit,
      orderBy: { razonSocial: 'asc' },
    }),
    prisma.cliente.count({ where }),
  ])

  return { data: clientes, total, page, limit }
}

async function getClienteById(id) {
  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404)
  return cliente
}

async function createCliente(data) {
  const datos = permitidos(data)
  Object.assign(datos, normalizarDocumento(datos.tipoDocumento, datos.numeroDocumento))
  if (datos.numeroDocumento) {
    const otro = await documentoDuplicado(datos.numeroDocumento)
    if (otro) throw new AppError(`El documento ${datos.numeroDocumento} ya está registrado (${otro.codigo} · ${otro.razonSocial})`, 409)
  }
  // El código es opcional: el registro rápido desde un pedido no lo pide
  if (datos.codigo) {
    const existing = await prisma.cliente.findUnique({ where: { codigo: datos.codigo } })
    if (existing) throw new AppError('El código ya existe', 409)
  } else {
    datos.codigo = await siguienteCodigo()
  }

  return prisma.cliente.create({ data: datos })
}

async function updateCliente(id, data) {
  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404)

  const datos = permitidos(data)
  delete datos.codigo // el código no se edita
  if ('numeroDocumento' in datos || 'tipoDocumento' in datos) {
    Object.assign(datos, normalizarDocumento(datos.tipoDocumento ?? cliente.tipoDocumento, datos.numeroDocumento ?? cliente.numeroDocumento))
    if (datos.numeroDocumento) {
      const otro = await documentoDuplicado(datos.numeroDocumento, id)
      if (otro) throw new AppError(`El documento ${datos.numeroDocumento} ya está registrado (${otro.codigo} · ${otro.razonSocial})`, 409)
    }
  }

  return prisma.cliente.update({ where: { id }, data: datos })
}

async function deleteCliente(id) {
  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) throw new AppError('Cliente no encontrado', 404)

  const hasPedidos = await prisma.pedido.count({ where: { clienteId: id } })
  if (hasPedidos > 0) throw new AppError('No se puede eliminar: tiene pedidos asociados', 400)

  return prisma.cliente.delete({ where: { id } })
}

module.exports = { listClientes, getClienteById, createCliente, updateCliente, deleteCliente }