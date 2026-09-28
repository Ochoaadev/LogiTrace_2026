const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const BCRYPT_ROUNDS = 12

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

async function main() {
  console.log('🌱 Iniciando seed de LogiTrace...')

  // ============================================================
  // USUARIOS
  // ============================================================

  const adminPassword = await hashPassword('SuperTeq2026!Admin#')
  const supervisorPassword = await hashPassword('SuperTeq2026!Supervisor#')
  const operadorPassword = await hashPassword('SuperTeq2026!Operador#')
  const repartidorPassword = await hashPassword('SuperTeq2026!Repartidor#')

  // Admin principal
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@supertequenos.com' },
    update: {},
    create: {
      codigo: 'ADM-001',
      nombre: 'Administrador Principal',
      email: 'admin@supertequenos.com',
      passwordHash: adminPassword,
      rol: 'ADMINISTRADOR',
      documento: 'V-12345678',
      activo: true,
    },
  })
  console.log('✅ Admin creado:', admin.email)

  // Supervisores
  const supervisor1 = await prisma.usuario.upsert({
    where: { email: 'supervisor1@supertequenos.com' },
    update: {},
    create: {
      codigo: 'SUP-001',
      nombre: 'Carlos Supervisor',
      email: 'supervisor1@supertequenos.com',
      passwordHash: supervisorPassword,
      rol: 'SUPERVISOR',
      documento: 'V-23456789',
      activo: true,
    },
  })
  console.log('✅ Supervisor creado:', supervisor1.email)

  // Operadores
  const operador1 = await prisma.usuario.upsert({
    where: { email: 'operador1@supertequenos.com' },
    update: {},
    create: {
      codigo: 'OPE-001',
      nombre: 'María Operadora',
      email: 'operador1@supertequenos.com',
      passwordHash: operadorPassword,
      rol: 'OPERADOR',
      documento: 'V-34567890',
      activo: true,
    },
  })
  console.log('✅ Operador creado:', operador1.email)

  const operador2 = await prisma.usuario.upsert({
    where: { email: 'operador2@supertequenos.com' },
    update: {},
    create: {
      codigo: 'OPE-002',
      nombre: 'Juan Operador',
      email: 'operador2@supertequenos.com',
      passwordHash: operadorPassword,
      rol: 'OPERADOR',
      documento: 'V-45678901',
      activo: true,
    },
  })
  console.log('✅ Operador creado:', operador2.email)

  // Repartidores
  const repartidor1 = await prisma.usuario.upsert({
    where: { email: 'repartidor1@supertequenos.com' },
    update: {},
    create: {
      codigo: 'REP-001',
      nombre: 'Pedro Repartidor',
      email: 'repartidor1@supertequenos.com',
      passwordHash: repartidorPassword,
      rol: 'REPARTIDOR',
      documento: 'V-56789012',
      activo: true,
    },
  })
  await prisma.repartidor.upsert({
    where: { usuarioId: repartidor1.id },
    update: {},
    create: { usuarioId: repartidor1.id, estado: 'DISPONIBLE', numeroLicencia: 'L-123456', telefono: '0412-5678901' },
  })
  console.log('✅ Repartidor creado:', repartidor1.email)

  const repartidor2 = await prisma.usuario.upsert({
    where: { email: 'repartidor2@supertequenos.com' },
    update: {},
    create: {
      codigo: 'REP-002',
      nombre: 'Luis Repartidor',
      email: 'repartidor2@supertequenos.com',
      passwordHash: repartidorPassword,
      rol: 'REPARTIDOR',
      documento: 'V-67890123',
      activo: true,
    },
  })
  await prisma.repartidor.upsert({
    where: { usuarioId: repartidor2.id },
    update: {},
    create: { usuarioId: repartidor2.id, estado: 'DISPONIBLE', numeroLicencia: 'L-789012', telefono: '0414-6789012' },
  })
  console.log('✅ Repartidor creado:', repartidor2.email)

  // ============================================================
  // ZONAS DE DESPACHO (Valera, Trujillo)
  // ============================================================

  const zonas = [
    { codigo: 'ZON-001', nombre: 'Centro de Valera', municipio: 'Valera', activo: true },
    { codigo: 'ZON-002', nombre: 'Urbanización La Beatriz', municipio: 'Valera', activo: true },
    { codigo: 'ZON-003', nombre: 'Urbanización Los Naranjos', municipio: 'Valera', activo: true },
    { codigo: 'ZON-004', nombre: 'Sector La Morita', municipio: 'Valera', activo: true },
    { codigo: 'ZON-005', nombre: 'Urbanización El Llano', municipio: 'Valera', activo: true },
    { codigo: 'ZON-006', nombre: 'Sector Santa Ana', municipio: 'Valera', activo: true },
    { codigo: 'ZON-007', nombre: 'La Puerta', municipio: 'La Puerta', activo: true },
    { codigo: 'ZON-008', nombre: 'Santa Isabel', municipio: 'Santa Isabel', activo: true },
  ]

  for (const zona of zonas) {
    await prisma.zonaDespacho.upsert({
      where: { codigo: zona.codigo },
      update: {},
      create: zona,
    })
  }
  console.log('✅ Zonas de despacho creadas:', zonas.length)

  // ============================================================
  // RUTAS
  // ============================================================

  const zonaCentro = await prisma.zonaDespacho.findUnique({ where: { codigo: 'ZON-001' } })
  const zonaBeatriz = await prisma.zonaDespacho.findUnique({ where: { codigo: 'ZON-002' } })

  await prisma.ruta.upsert({
    where: { codigo: 'RUT-001' },
    update: {},
    create: {
      codigo: 'RUT-001',
      nombre: 'Ruta Centro - Mañana',
      zonaId: zonaCentro.id,
      fecha: new Date(),
      estado: 'PROGRAMADA',
      horaInicio: new Date('1970-01-01T08:00:00.000Z'),
      horaFin: new Date('1970-01-01T14:00:00.000Z'),
    },
  })

  await prisma.ruta.upsert({
    where: { codigo: 'RUT-002' },
    update: {},
    create: {
      codigo: 'RUT-002',
      nombre: 'Ruta Beatriz - Tarde',
      zonaId: zonaBeatriz.id,
      fecha: new Date(),
      estado: 'PROGRAMADA',
      horaInicio: new Date('1970-01-01T14:00:00.000Z'),
      horaFin: new Date('1970-01-01T20:00:00.000Z'),
    },
  })
  console.log('✅ Rutas creadas: 2')

  // ============================================================
  // VEHÍCULOS
  // ============================================================

  const vehiculos = [
    { codigo: 'VEH-001', tipo: 'MOTO', placa: 'A1B2C3', capacidadCarga: 50, unidadCapacidad: 'kg', activo: true },
    { codigo: 'VEH-002', tipo: 'MOTO', placa: 'D4E5F6', capacidadCarga: 50, unidadCapacidad: 'kg', activo: true },
    { codigo: 'VEH-003', tipo: 'MOTO', placa: 'G7H8I9', capacidadCarga: 50, unidadCapacidad: 'kg', activo: true },
    { codigo: 'VEH-004', tipo: 'VEHICULO_LIVIANO', placa: 'J0K1L2', capacidadCarga: 500, unidadCapacidad: 'kg', activo: true },
  ]

  for (const v of vehiculos) {
    await prisma.vehiculo.upsert({
      where: { codigo: v.codigo },
      update: {},
      create: v,
    })
  }
  console.log('✅ Vehículos creados:', vehiculos.length)

  // ============================================================
  // PRODUCTOS
  // ============================================================

  const productos = [
    { codigo: 'TEQ-001', nombre: 'Tequeño Tradicional', descripcion: 'Tequeño de queso blanco artesanal', unidadBase: 'unidad', esPerecedero: true, activo: true },
    { codigo: 'TEQ-002', nombre: 'Tequeño de Queso y Jamón', descripcion: 'Tequeño mixto queso y jamón', unidadBase: 'unidad', esPerecedero: true, activo: true },
    { codigo: 'TEQ-003', nombre: 'Tequeño de Carne Mechada', descripcion: 'Tequeño relleno de carne mechada', unidadBase: 'unidad', esPerecedero: true, activo: true },
    { codigo: 'TEQ-004', nombre: 'Tequeño de Pollo', descripcion: 'Tequeño relleno de pollo desmechado', unidadBase: 'unidad', esPerecedero: true, activo: true },
    { codigo: 'EMP-001', nombre: 'Empanada de Carne', descripcion: 'Empanada frita de carne mechada', unidadBase: 'unidad', esPerecedero: true, activo: true },
    { codigo: 'EMP-002', nombre: 'Empanada de Queso', descripcion: 'Empanada frita de queso blanco', unidadBase: 'unidad', esPerecedero: true, activo: true },
    { codigo: 'EMP-003', nombre: 'Empanada de Pollo', descripcion: 'Empanada frita de pollo desmechado', unidadBase: 'unidad', esPerecedero: true, activo: true },
    { codigo: 'BEB-001', nombre: 'Refresco Cola 350ml', descripcion: 'Gaseosa cola presentación personal', unidadBase: 'unidad', esPerecedero: false, activo: true },
    { codigo: 'BEB-002', nombre: 'Jugo de Naranja 500ml', descripcion: 'Jugo natural de naranja', unidadBase: 'unidad', esPerecedero: true, activo: true },
    { codigo: 'BEB-003', nombre: 'Agua Mineral 500ml', descripcion: 'Agua mineral natural', unidadBase: 'unidad', esPerecedero: false, activo: true },
  ]

  for (const p of productos) {
    await prisma.producto.upsert({
      where: { codigo: p.codigo },
      update: {},
      create: p,
    })
  }
  console.log('✅ Productos creados:', productos.length)

  // ============================================================
  // LOTES (para productos perecederos)
  // ============================================================

  const tequenoTrad = await prisma.producto.findUnique({ where: { codigo: 'TEQ-001' } })
  const tequenoJamon = await prisma.producto.findUnique({ where: { codigo: 'TEQ-002' } })
  const empanadaCarne = await prisma.producto.findUnique({ where: { codigo: 'EMP-001' } })

  const lotes = [
    { codigo: 'LTEQ001-001', productoId: tequenoTrad.id, fechaProduccion: new Date(Date.now() - 2*24*60*60*1000), fechaVencimiento: new Date(Date.now() + 5*24*60*60*1000), estadoCalidad: 'DISPONIBLE' },
    { codigo: 'LTEQ001-002', productoId: tequenoTrad.id, fechaProduccion: new Date(Date.now() - 1*24*60*60*1000), fechaVencimiento: new Date(Date.now() + 6*24*60*60*1000), estadoCalidad: 'DISPONIBLE' },
    { codigo: 'LTEQ002-001', productoId: tequenoJamon.id, fechaProduccion: new Date(Date.now() - 3*24*60*60*1000), fechaVencimiento: new Date(Date.now() + 4*24*60*60*1000), estadoCalidad: 'DISPONIBLE' },
    { codigo: 'LEMP001-001', productoId: empanadaCarne.id, fechaProduccion: new Date(Date.now() - 1*24*60*60*1000), fechaVencimiento: new Date(Date.now() + 3*24*60*60*1000), estadoCalidad: 'DISPONIBLE' },
  ]

  for (const l of lotes) {
    await prisma.lote.upsert({
      where: { productoId_codigo: { productoId: l.productoId, codigo: l.codigo } },
      update: {},
      create: l,
    })
  }
  console.log('✅ Lotes creados:', lotes.length)

  // ============================================================
  // UBICACIONES DE ALMACÉN
  // ============================================================

  const ubicaciones = [
    { codigo: 'CAV-001', nombre: 'Cava Principal', tipo: 'CAVA', activo: true },
    { codigo: 'ALM-001', nombre: 'Almacén Seco', tipo: 'ALMACEN', activo: true },
    { codigo: 'PRE-001', nombre: 'Área de Preparación', tipo: 'PREPARACION', activo: true },
    { codigo: 'REC-001', nombre: 'Recepción de Materia Prima', tipo: 'RECEPCION', activo: true },
    { codigo: 'CUA-001', nombre: 'Cuarentena', tipo: 'CUARENTENA', activo: true },
    { codigo: 'DES-001', nombre: 'Zona de Descarte', tipo: 'DESCARTE', activo: true },
  ]

  for (const u of ubicaciones) {
    await prisma.ubicacionAlmacen.upsert({
      where: { codigo: u.codigo },
      update: {},
      create: u,
    })
  }
  console.log('✅ Ubicaciones de almacén creadas:', ubicaciones.length)

  // ============================================================
  // INVENTARIO INICIAL
  // ============================================================

  const cava = await prisma.ubicacionAlmacen.findUnique({ where: { codigo: 'CAV-001' } })
  const almacen = await prisma.ubicacionAlmacen.findUnique({ where: { codigo: 'ALM-001' } })

  const lote1 = await prisma.lote.findUnique({ where: { productoId_codigo: { productoId: tequenoTrad.id, codigo: 'LTEQ001-001' } } })
  const lote2 = await prisma.lote.findUnique({ where: { productoId_codigo: { productoId: tequenoTrad.id, codigo: 'LTEQ001-002' } } })
  const lote3 = await prisma.lote.findUnique({ where: { productoId_codigo: { productoId: tequenoJamon.id, codigo: 'LTEQ002-001' } } })
  const lote4 = await prisma.lote.findUnique({ where: { productoId_codigo: { productoId: empanadaCarne.id, codigo: 'LEMP001-001' } } })

  const inventarios = [
    { loteId: lote1.id, ubicacionId: cava.id, stockActual: 200, stockMinimo: 50 },
    { loteId: lote2.id, ubicacionId: cava.id, stockActual: 150, stockMinimo: 50 },
    { loteId: lote3.id, ubicacionId: cava.id, stockActual: 100, stockMinimo: 30 },
    { loteId: lote4.id, ubicacionId: cava.id, stockActual: 80, stockMinimo: 20 },
  ]

  for (const inv of inventarios) {
    await prisma.inventario.upsert({
      where: { loteId_ubicacionId: { loteId: inv.loteId, ubicacionId: inv.ubicacionId } },
      update: { stockActual: inv.stockActual, stockMinimo: inv.stockMinimo },
      create: inv,
    })
  }
  console.log('✅ Inventario inicial creado:', inventarios.length)

  // ============================================================
  // CLIENTES
  // ============================================================

  const clientes = [
    { codigo: 'CLI-001', razonSocial: 'Restaurante El Sabor', nombreContacto: 'Ana García', tipoDocumento: 'J', numeroDocumento: 'J-12345678-9', telefono: '0271-2345678', email: 'contacto@elsabor.com', activo: true },
    { codigo: 'CLI-002', razonSocial: 'Cafetería La Esquina', nombreContacto: 'Roberto Pérez', tipoDocumento: 'J', numeroDocumento: 'J-23456789-0', telefono: '0271-3456789', email: 'info@laesquina.com', activo: true },
    { codigo: 'CLI-003', razonSocial: 'Panadería Dulce Hogar', nombreContacto: 'Carmen López', tipoDocumento: 'J', numeroDocumento: 'J-34567890-1', telefono: '0271-4567890', email: 'pedidos@dulcehogar.com', activo: true },
    { codigo: 'CLI-004', razonSocial: 'Licorería El Buen Trago', nombreContacto: 'Miguel Torres', tipoDocumento: 'J', numeroDocumento: 'J-45678901-2', telefono: '0271-5678901', email: 'ventas@elbuentrago.com', activo: true },
    { codigo: 'CLI-005', razonSocial: 'Cliente Particular - Juan Pérez', nombreContacto: 'Juan Pérez', tipoDocumento: 'V', numeroDocumento: 'V-78901234', telefono: '0416-7890123', email: 'juan.perez@email.com', activo: true },
  ]

  for (const c of clientes) {
    await prisma.cliente.upsert({
      where: { codigo: c.codigo },
      update: {},
      create: c,
    })
  }
  console.log('✅ Clientes creados:', clientes.length)

  // ============================================================
  // CATÁLOGOS FIJOS
  // ============================================================

  // Tipos de Incidencia
  const tiposIncidencia = [
    { codigo: 'INC-001', nombre: 'Retraso en Entrega', descripcion: 'El pedido no llegó en el tiempo estimado', activo: true },
    { codigo: 'INC-002', nombre: 'Producto Dañado', descripcion: 'El producto presenta daño físico o derrame', activo: true },
    { codigo: 'INC-003', nombre: 'Dirección Incorrecta', descripcion: 'La dirección de entrega no coincide o es inexistente', activo: true },
    { codigo: 'INC-004', nombre: 'Cliente Ausente', descripcion: 'No había nadie para recibir el pedido', activo: true },
    { codigo: 'INC-005', nombre: 'Producto Faltante', descripcion: 'Faltan items en el pedido entregado', activo: true },
    { codigo: 'INC-006', nombre: 'Error de Preparación', descripcion: 'El pedido no corresponde a lo solicitado', activo: true },
    { codigo: 'INC-007', nombre: 'Otro', descripcion: 'Incidencia no clasificada en los tipos anteriores', activo: true },
  ]

  for (const t of tiposIncidencia) {
    await prisma.tipoIncidencia.upsert({
      where: { codigo: t.codigo },
      update: {},
      create: t,
    })
  }
  console.log('✅ Tipos de incidencia creados:', tiposIncidencia.length)

  // Motivos de Devolución
  const motivosDevolucion = [
    { codigo: 'DEV-001', nombre: 'Producto en Mal Estado', descripcion: 'Producto dañado, derramado o deteriorado', activo: true },
    { codigo: 'DEV-002', nombre: 'Producto Incorrecto', descripcion: 'No corresponde al pedido realizado', activo: true },
    { codigo: 'DEV-003', nombre: 'Cliente Rechaza Pedido', descripcion: 'Cliente decide no recibir el pedido al momento de entrega', activo: true },
    { codigo: 'DEV-004', nombre: 'Falta de Producto', descripcion: 'Faltan unidades en el pedido entregado', activo: true },
    { codigo: 'DEV-005', nombre: 'Retraso Excesivo', descripcion: 'Pedido llegó fuera del tiempo aceptable', activo: true },
    { codigo: 'DEV-006', nombre: 'Error de Facturación', descripcion: 'Cobro incorrecto o duplicado', activo: true },
    { codigo: 'DEV-007', nombre: 'Otro', descripcion: 'Motivo no clasificado anteriormente', activo: true },
  ]

  for (const m of motivosDevolucion) {
    await prisma.motivoDevolucion.upsert({
      where: { codigo: m.codigo },
      update: {},
      create: m,
    })
  }
  console.log('✅ Motivos de devolución creados:', motivosDevolucion.length)

  // Tipos de Residuo
  const tiposResiduo = [
    { codigo: 'RES-001', nombre: 'Orgánicos', unidadBase: 'kg', activo: true },
    { codigo: 'RES-002', nombre: 'Cartón y Papel', unidadBase: 'kg', activo: true },
    { codigo: 'RES-003', nombre: 'Plástico', unidadBase: 'kg', activo: true },
    { codigo: 'RES-004', nombre: 'Aceite Usado', unidadBase: 'litros', activo: true },
    { codigo: 'RES-005', nombre: 'Producto Descartado', unidadBase: 'unidad', activo: true },
    { codigo: 'RES-006', nombre: 'Otro', unidadBase: 'kg', activo: true },
  ]

  for (const t of tiposResiduo) {
    await prisma.tipoResiduo.upsert({
      where: { codigo: t.codigo },
      update: {},
      create: t,
    })
  }
  console.log('✅ Tipos de residuo creados:', tiposResiduo.length)

  // Gestores de Residuo
  const gestores = [
    { codigo: 'GES-001', nombre: 'Reciclaje Valera C.A.', tipo: 'EXTERNO', contacto: '0271-9876543', ubicacion: 'Zona Industrial Valera', activo: true },
    { codigo: 'GES-002', nombre: 'Gestión Interna SuperTequeños', tipo: 'INTERNO', contacto: 'operaciones@supertequenos.com', ubicacion: 'Planta Principal', activo: true },
  ]

  for (const g of gestores) {
    await prisma.gestorResiduo.upsert({
      where: { codigo: g.codigo },
      update: {},
      create: g,
    })
  }
  console.log('✅ Gestores de residuo creados:', gestores.length)

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('\n📋 Credenciales de acceso:')
  console.log('   Admin:      admin@supertequenos.com / SuperTeq2026!Admin#')
  console.log('   Supervisor: supervisor1@supertequenos.com / SuperTeq2026!Supervisor#')
  console.log('   Operador:   operador1@supertequenos.com / SuperTeq2026!Operador#')
  console.log('   Repartidor: repartidor1@supertequenos.com / SuperTeq2026!Repartidor#')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })