// Pruebas funcionales (PF-01 a PF-14) y medición de tiempos de respuesta (MR-01 a MR-14) del
// Trabajo Especial de Grado. Ejecuta la batería con 12 participantes SIMULADOS (usuarios de prueba
// con rol OPERADOR, sesiones independientes), 3 rondas cada uno, contra una base de datos aislada.
//
//   node scripts/pruebas/ejecutar-pruebas.js --preparar   → crea o reinicia desde cero la base "logitrace_pruebas"
//                                                           (migraciones + seed base + 60 días de datos demo)
//   node scripts/pruebas/ejecutar-pruebas.js [--etiqueta=nombre]
//                                                         → ejecuta la batería y escribe los resultados
//                                                           en docs/pruebas/<etiqueta>/
//
// El script levanta su propia instancia del backend (puerto 3101) apuntando a la base de pruebas:
// la base de desarrollo no se modifica.
const { spawn, execSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { performance } = require('perf_hooks')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const RAIZ = path.join(__dirname, '..', '..')
const PUERTO = 3101
const API = `http://localhost:${PUERTO}/api`
const PARTICIPANTES = 12
const RONDAS = 3
const UMBRAL_S = 2
// Contraseña aleatoria por ejecución: las cuentas de prueba no tienen una clave fija en el código
const CLAVE_PARTICIPANTE = `Prb!${crypto.randomBytes(12).toString('base64url')}#9a`
const argumento = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}`))
const ETIQUETA = argumento('etiqueta')?.split('=')[1] || 'resultados'
const SALIDA = path.join(RAIZ, '..', 'docs', 'pruebas', ETIQUETA)

function urlPruebas() {
  const env = fs.readFileSync(path.join(RAIZ, '.env'), 'utf8')
  const url = env.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)?.[1]
  if (!url) throw new Error('DATABASE_URL no encontrada en .env')
  return url.replace(/\/[^/?]+\?/, '/logitrace_pruebas?')
}
const DB_URL = urlPruebas()
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } })

// ------------------------------------------------------------------ Entorno

// Reinicia la base de pruebas desde cero (nunca la de desarrollo)
function preparar() {
  if (!/\/logitrace_pruebas\?/.test(DB_URL)) throw new Error('Por seguridad, solo se reinicia la base logitrace_pruebas')
  const env = { ...process.env, DATABASE_URL: DB_URL }
  const correr = (cmd) => execSync(cmd, { cwd: RAIZ, env, stdio: 'inherit' })
  correr('npx prisma migrate reset --force --skip-seed')
  correr('node prisma/seed.js')
  correr('node scripts/seed-demo-reportes.js')
  correr('node scripts/cargar-zonas-valera.js --aplicar')
}

async function asegurarParticipantes() {
  const hash = await bcrypt.hash(CLAVE_PARTICIPANTE, 10)
  const lista = []
  for (let i = 1; i <= PARTICIPANTES; i++) {
    const n = String(i).padStart(2, '0')
    const u = await prisma.usuario.upsert({
      where: { email: `participante${n}@pruebas.logitrace.local` },
      update: { activo: true, passwordHash: hash },
      create: { codigo: `PRB-${n}`, nombre: `Participante ${n}`, email: `participante${n}@pruebas.logitrace.local`, passwordHash: hash, rol: 'OPERADOR' },
    })
    lista.push(u)
  }
  return lista
}

function iniciarBackend() {
  const proceso = spawn(process.execPath, ['src/server.js'], {
    cwd: RAIZ,
    // Los 12 participantes simulados salen de la misma IP a velocidad de máquina: el límite general de
    // peticiones (pensado contra abusos) los frenaría. La batería mide funcionalidad y tiempos, así que su
    // instancia propia lo eleva; el servidor real conserva sus límites.
    env: { ...process.env, PORT: String(PUERTO), DATABASE_URL: DB_URL, NODE_ENV: 'development', LIMITE_POR_IP: '1000000', LIMITE_POR_USUARIO: '1000000' },
    stdio: 'ignore',
  })
  return proceso
}

async function esperarBackend() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${API}/health`)
      if (r.ok) return
    } catch { /* aún iniciando */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('El backend de pruebas no respondió')
}

// ------------------------------------------------------------------ Utilidades

async function llamar(token, metodo, ruta, body) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const texto = await r.text()
  let j = {}
  try { j = JSON.parse(texto) } catch { /* respuesta no JSON */ }
  return { ok: r.ok, status: r.status, data: j.data, message: j.message }
}

// Igual que llamar(), pero lanza error si la API rechaza la operación
async function exigir(token, metodo, ruta, body) {
  const r = await llamar(token, metodo, ruta, body)
  if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status}: ${r.message}`)
  return r.data
}

async function cronometrar(fn) {
  const t0 = performance.now()
  const valor = await fn()
  return { valor, s: (performance.now() - t0) / 1000 }
}

async function stockCava(productoId) {
  const r = await prisma.inventario.aggregate({
    where: { lote: { productoId }, ubicacion: { tipo: 'CAVA' } },
    _sum: { stockActual: true },
  })
  return Number(r._sum.stockActual || 0)
}

// Cada ejecución consume stock de la cava (unas 200 unidades); sin reiniciar la base con --preparar,
// las ejecuciones sucesivas lo agotaban y el sistema rechazaba (correctamente) las salidas. Antes de
// empezar se repone hasta STOCK_MINIMO con una ENTRADA registrada, solo en la base de pruebas.
const STOCK_MINIMO = 500
// Una ejecución interrumpida deja despachos abiertos con los repartidores ocupados y la siguiente no
// puede asignar ninguno (lo detectó ejecucion-8). Antes de empezar se cancelan los despachos aún
// abiertos cuyos pedidos registraron los participantes, y sus repartidores vuelven a quedar libres.
async function liberarRepartidores() {
  if (!/\/logitrace_pruebas\?/.test(DB_URL)) throw new Error('Solo en la base logitrace_pruebas')
  const abiertos = await prisma.despacho.findMany({
    where: {
      estado: { in: ['PROGRAMADO', 'PREPARANDO', 'EN_RUTA', 'CON_INCIDENCIA'] },
      pedidos: { some: { pedido: { creadoPor: { codigo: { startsWith: 'PRB-' } } } } },
    },
    select: { id: true, repartidorId: true },
  })
  for (const d of abiertos) {
    await prisma.despacho.update({ where: { id: d.id }, data: { estado: 'CANCELADO', fechaHoraCierre: new Date(), observaciones: 'Cancelado al iniciar la batería de pruebas (ejecución anterior interrumpida)' } })
  }
  const libres = await prisma.repartidor.updateMany({
    where: { estado: { not: 'DISPONIBLE' }, despachos: { none: { estado: { in: ['PROGRAMADO', 'PREPARANDO', 'EN_RUTA', 'CON_INCIDENCIA'] } } } },
    data: { estado: 'DISPONIBLE' },
  })
  return { cancelados: abiertos.length, liberados: libres.count }
}

async function asegurarStock(cat, usuarioId) {
  if (!/\/logitrace_pruebas\?/.test(DB_URL)) throw new Error('La reposición de stock solo se hace en logitrace_pruebas')
  const actual = await stockCava(cat.producto.id)
  if (actual >= STOCK_MINIMO) return 0
  const existencia = await prisma.inventario.findFirst({
    where: { lote: { productoId: cat.producto.id, estadoCalidad: 'DISPONIBLE' }, ubicacion: { tipo: 'CAVA' } },
    orderBy: { lote: { fechaVencimiento: 'desc' } },
  })
  if (!existencia) throw new Error('No hay un lote DISPONIBLE en cava para reponer. Ejecute --preparar')
  const falta = STOCK_MINIMO - actual
  await prisma.$transaction([
    prisma.inventario.update({ where: { id: existencia.id }, data: { stockActual: { increment: falta } } }),
    prisma.movimientoInventario.create({
      data: {
        tipo: 'ENTRADA', loteId: existencia.loteId, ubicacionDestinoId: existencia.ubicacionId, cantidad: falta,
        unidad: cat.producto.unidadBase, usuarioId, observaciones: 'Reposición automática para la batería de pruebas',
      },
    }),
  ])
  return falta
}

const tiposEvento = async (pedidoId) =>
  (await prisma.eventoTrazabilidad.findMany({ where: { pedidoId }, select: { tipoEvento: true } })).map((e) => e.tipoEvento)

// ------------------------------------------------------------------ Batería

const CASOS = {
  'PF-01': 'Registro de pedido',
  'PF-02': 'Consulta del pedido',
  'PF-03': 'Actualización del estado',
  'PF-04': 'Asignación del despacho',
  'PF-05': 'Registro de incidencia',
  'PF-06': 'Registro de devolución',
  'PF-07': 'Estado del producto retornado',
  'PF-08': 'Actualización del inventario',
  'PF-09': 'Historial de trazabilidad',
  'PF-10': 'Consulta de información relacionada',
  'PF-11': 'Integridad de registros',
  'PF-12': 'Escenario simulado de entrega',
  'PF-13': 'Escenario simulado de incidencia',
  'PF-14': 'Escenario simulado de devolución',
}
const MEDICIONES = {
  'MR-01': ['Registro de pedido', 'Registrar un nuevo pedido con la información requerida.'],
  'MR-02': ['Consulta del pedido', 'Consultar un pedido previamente registrado.'],
  'MR-03': ['Actualización del estado', 'Modificar el estado de un pedido durante su gestión.'],
  'MR-04': ['Asignación del despacho', 'Asignar un pedido a un repartidor o responsable.'],
  'MR-05': ['Registro de incidencia', 'Registrar una incidencia asociada a un pedido.'],
  'MR-06': ['Registro de devolución', 'Registrar una devolución y su causa.'],
  'MR-07': ['Estado del producto retornado', 'Registrar la condición del producto al momento de la devolución.'],
  'MR-08': ['Actualización del inventario', 'Procesar una devolución y actualizar el inventario según el estado del producto.'],
  'MR-09': ['Historial de trazabilidad', 'Consultar el historial de operaciones de un pedido.'],
  'MR-10': ['Consulta de información relacionada', 'Consultar información vinculada con pedidos, despachos, incidencias y devoluciones.'],
  'MR-11': ['Integridad de registros', 'Realizar una operación y consultar posteriormente sus datos para verificar su conservación.'],
  'MR-12': ['Escenario simulado de entrega', 'Ejecutar un flujo de entrega sin incidencia.'],
  'MR-13': ['Escenario simulado de incidencia', 'Ejecutar una entrega en la que ocurra una incidencia.'],
  'MR-14': ['Escenario simulado de devolución', 'Ejecutar una devolución simulada de un pedido.'],
}

/** Ejecuta una ronda completa (14 casos) con la sesión de un participante. */
async function ronda(token, participante, numero, cat) {
  const resultados = {}
  const tiempos = {}
  const caso = (cod) => (resultados[cod] ||= { verificaciones: [], error: null })
  const verificar = (cod, descripcion, cumple, detalle) => caso(cod).verificaciones.push({ descripcion, cumple: !!cumple, detalle: detalle ?? null })
  const ejecutar = async (cod, fn) => {
    caso(cod)
    try { await fn() } catch (e) { resultados[cod].error = e.message }
  }
  const etiqueta = `${participante.codigo} R${numero}`
  const producto = cat.producto
  const cantidad = 2
  const nuevoPedido = (sufijo) => ({
    clienteId: cat.clientes[(numero + Number(participante.codigo.slice(-2))) % cat.clientes.length].id,
    zonaId: cat.zona.id,
    direccionEntrega: `Prueba ${etiqueta} ${sufijo} · Av. Bolívar, Valera`,
    referenciaEntrega: `Caso ${sufijo}`,
    items: [{ productoId: producto.id, cantidad, unidad: producto.unidadBase }],
  })
  // Lleva un pedido hasta "en ruta" con los mismos pasos que la interfaz
  const hastaEnRuta = async (pedidoId) => {
    await exigir(token, 'POST', `/pedidos/${pedidoId}/preparar`)
    await exigir(token, 'POST', `/pedidos/${pedidoId}/listo-despacho`, {})
    const rep = await repartidorDisponible()
    const d = await exigir(token, 'POST', '/despachos', { repartidorId: rep.id, pedidos: [{ pedidoId, ordenParada: 1 }] })
    await exigir(token, 'PATCH', `/despachos/${d.id}/estado`, { estado: 'EN_RUTA' })
    return { despacho: d, repartidorId: rep.id }
  }
  const repartidorDisponible = async () => {
    const reps = await exigir(token, 'GET', '/catalogos/repartidores?estado=DISPONIBLE&limit=50')
    if (!reps.length) throw new Error('No hay repartidores disponibles')
    return reps[0]
  }
  const devolverYCerrar = async (despacho, incidenciaId) => {
    const dev = await exigir(token, 'POST', '/devoluciones', { despachoPedidoId: despacho.pedidos[0].id, motivoId: cat.motivo.id, incidenciaId, observaciones: `Prueba ${etiqueta}: cliente rechaza la mercancía` })
    await exigir(token, 'PATCH', `/devoluciones/${dev.id}/estado`, { estado: 'EN_TRASLADO' })
    await exigir(token, 'PATCH', `/devoluciones/${dev.id}/recepcion`, { temperatura: -17.2, observaciones: 'Recepción en planta' })
    return dev
  }

  // ---------------- Pedido A: ciclo con incidencia y devolución (MR-01 a MR-10)
  let A = null
  let despachoA = null
  let incidenciaA = null
  let devolucionA = null
  const stockInicialA = await stockCava(producto.id)

  await ejecutar('PF-01', async () => {
    const body = nuevoPedido('A')
    const { valor: r, s } = await cronometrar(() => llamar(token, 'POST', '/pedidos', body))
    tiempos['MR-01'] = s
    verificar('PF-01', 'La API acepta el registro (HTTP 201)', r.status === 201, `HTTP ${r.status}`)
    if (!r.ok) throw new Error(r.message)
    A = r.data
    verificar('PF-01', 'Se genera un código único de pedido', /^\S+$/.test(A.codigo || ''), A.codigo)
    verificar('PF-01', 'El pedido inicia en estado REGISTRADO', A.estado === 'REGISTRADO', A.estado)
    const bd = await prisma.pedido.findUnique({ where: { id: A.id }, include: { detalles: true } })
    verificar('PF-01', 'El pedido y su detalle quedan guardados en la BD', bd && bd.detalles.length === 1 && Number(bd.detalles[0].cantidad) === cantidad)
    verificar('PF-01', 'Se registra el evento PEDIDO_CREADO', (await tiposEvento(A.id)).includes('PEDIDO_CREADO'))
  })

  await ejecutar('PF-02', async () => {
    if (!A) throw new Error('Depende de PF-01')
    const { valor: r, s } = await cronometrar(() => llamar(token, 'GET', `/pedidos/${A.id}`))
    tiempos['MR-02'] = s
    verificar('PF-02', 'La consulta responde (HTTP 200)', r.status === 200, `HTTP ${r.status}`)
    const p = r.data || {}
    verificar('PF-02', 'Devuelve el mismo código, cliente y dirección registrados', p.codigo === A.codigo && p.clienteId === A.clienteId && p.direccionEntrega === A.direccionEntrega)
    verificar('PF-02', 'Incluye los productos y cantidades del pedido', p.detalles?.length === 1 && Number(p.detalles[0].cantidad) === cantidad)
  })

  await ejecutar('PF-03', async () => {
    if (!A) throw new Error('Depende de PF-01')
    const { valor: r, s } = await cronometrar(() => llamar(token, 'POST', `/pedidos/${A.id}/preparar`))
    tiempos['MR-03'] = s
    verificar('PF-03', 'La API acepta el cambio de estado', r.ok, `HTTP ${r.status} ${r.message || ''}`)
    const bd = await prisma.pedido.findUnique({ where: { id: A.id } })
    verificar('PF-03', 'El pedido pasa a EN_PREPARACION', bd.estado === 'EN_PREPARACION', bd.estado)
    const invalido = await llamar(token, 'PATCH', `/pedidos/${A.id}/estado`, { estado: 'ENTREGADO' })
    const sigue = await prisma.pedido.findUnique({ where: { id: A.id } })
    verificar('PF-03', 'Se rechaza una transición no permitida (EN_PREPARACION → ENTREGADO)', !invalido.ok && sigue.estado === 'EN_PREPARACION', `HTTP ${invalido.status}`)
    await exigir(token, 'POST', `/pedidos/${A.id}/listo-despacho`, {})
    verificar('PF-03', 'El pedido avanza a LISTO_PARA_DESPACHO', (await prisma.pedido.findUnique({ where: { id: A.id } })).estado === 'LISTO_PARA_DESPACHO')
  })

  await ejecutar('PF-04', async () => {
    if (!A) throw new Error('Depende de PF-01')
    const rep = await repartidorDisponible()
    const body = { repartidorId: rep.id, pedidos: [{ pedidoId: A.id, ordenParada: 1 }] }
    const { valor: r, s } = await cronometrar(() => llamar(token, 'POST', '/despachos', body))
    tiempos['MR-04'] = s
    verificar('PF-04', 'La API crea el despacho (HTTP 201)', r.status === 201, `HTTP ${r.status} ${r.message || ''}`)
    if (!r.ok) throw new Error(r.message)
    despachoA = r.data
    verificar('PF-04', 'El despacho queda asignado al repartidor seleccionado', despachoA.repartidorId === rep.id)
    verificar('PF-04', 'El pedido queda vinculado como parada del despacho', despachoA.pedidos?.[0]?.pedidoId === A.id)
    const repBd = await prisma.repartidor.findUnique({ where: { id: rep.id } })
    verificar('PF-04', 'El repartidor deja de figurar como disponible', repBd.estado !== 'DISPONIBLE', repBd.estado)
    const lotesParada = await prisma.detalleDespacho.findMany({ where: { despachoPedidoId: despachoA.pedidos[0].id } })
    verificar('PF-04', 'La parada registra los lotes despachados y su cantidad', lotesParada.length > 0 && lotesParada.reduce((s, x) => s + Number(x.cantidad), 0) === cantidad, `${lotesParada.length} lote(s)`)
    await exigir(token, 'PATCH', `/despachos/${despachoA.id}/estado`, { estado: 'EN_RUTA' })
    const ped = await prisma.pedido.findUnique({ where: { id: A.id } })
    verificar('PF-04', 'Al salir a ruta el pedido pasa a EN_RUTA', ped.estado === 'EN_RUTA', ped.estado)
  })

  await ejecutar('PF-05', async () => {
    if (!despachoA) throw new Error('Depende de PF-04')
    const body = { despachoPedidoId: despachoA.pedidos[0].id, tipoIncidenciaId: cat.tipoIncidencia.id, descripcion: `Prueba ${etiqueta}: el cliente reporta avería en su congelador` }
    const { valor: r, s } = await cronometrar(() => llamar(token, 'POST', '/incidencias', body))
    tiempos['MR-05'] = s
    verificar('PF-05', 'La API registra la incidencia (HTTP 201)', r.status === 201, `HTTP ${r.status} ${r.message || ''}`)
    if (!r.ok) throw new Error(r.message)
    incidenciaA = r.data
    verificar('PF-05', 'La incidencia inicia en estado REPORTADA con su tipo', incidenciaA.estado === 'REPORTADA' && incidenciaA.tipoIncidenciaId === cat.tipoIncidencia.id)
    const ped = await prisma.pedido.findUnique({ where: { id: A.id } })
    verificar('PF-05', 'El pedido asociado pasa a CON_INCIDENCIA', ped.estado === 'CON_INCIDENCIA', ped.estado)
    verificar('PF-05', 'Se registra el evento INCIDENCIA_REGISTRADA', (await tiposEvento(A.id)).includes('INCIDENCIA_REGISTRADA'))
    await exigir(token, 'PATCH', `/incidencias/${incidenciaA.id}/estado`, { estado: 'EN_REVISION' })
  })

  await ejecutar('PF-06', async () => {
    if (!incidenciaA) throw new Error('Depende de PF-05')
    const body = { despachoPedidoId: despachoA.pedidos[0].id, motivoId: cat.motivo.id, incidenciaId: incidenciaA.id, observaciones: `Prueba ${etiqueta}: cliente rechaza la mercancía` }
    const { valor: r, s } = await cronometrar(() => llamar(token, 'POST', '/devoluciones', body))
    tiempos['MR-06'] = s
    verificar('PF-06', 'La API registra la devolución (HTTP 201)', r.status === 201, `HTTP ${r.status} ${r.message || ''}`)
    if (!r.ok) throw new Error(r.message)
    devolucionA = r.data
    const bd = await prisma.devolucion.findUnique({ where: { id: devolucionA.id }, include: { detalles: true } })
    verificar('PF-06', 'Queda registrada la causa (motivo) y la incidencia de origen', bd.motivoId === cat.motivo.id && bd.incidenciaId === incidenciaA.id)
    verificar('PF-06', 'Se copian los productos y cantidades del pedido con su lote', bd.detalles.length === 1 && Number(bd.detalles[0].cantidad) === cantidad && !!bd.detalles[0].loteId)
    const ped = await prisma.pedido.findUnique({ where: { id: A.id } })
    verificar('PF-06', 'El pedido pasa a DEVUELTO', ped.estado === 'DEVUELTO', ped.estado)
    await exigir(token, 'PATCH', `/devoluciones/${devolucionA.id}/estado`, { estado: 'EN_TRASLADO' })
    await exigir(token, 'PATCH', `/devoluciones/${devolucionA.id}/recepcion`, { temperatura: -17.2, observaciones: 'Recepción en planta' })
  })

  await ejecutar('PF-07', async () => {
    if (!devolucionA) throw new Error('Depende de PF-06')
    const body = { selloIntegro: true, condicionEmpaque: 'Íntegro, sin humedad', observaciones: `Evaluación ${etiqueta}` }
    const { valor: r, s } = await cronometrar(() => llamar(token, 'POST', `/devoluciones/${devolucionA.id}/evaluacion`, body))
    tiempos['MR-07'] = s
    verificar('PF-07', 'La API registra la evaluación del producto', r.ok, `HTTP ${r.status} ${r.message || ''}`)
    const bd = await prisma.devolucion.findUnique({ where: { id: devolucionA.id }, include: { evaluacion: true, registrosTemp: true } })
    verificar('PF-07', 'Se guarda la condición del sello y del empaque', bd.evaluacion?.selloIntegro === true && bd.evaluacion?.condicionEmpaque === body.condicionEmpaque)
    verificar('PF-07', 'Se conserva la temperatura medida en la recepción', bd.registrosTemp.some((t) => Number(t.temperaturaC) === -17.2))
    verificar('PF-07', 'La devolución pasa a EVALUADA', bd.estado === 'EVALUADA', bd.estado)
  })

  await ejecutar('PF-08', async () => {
    if (!devolucionA) throw new Error('Depende de PF-06')
    const detalle = await prisma.detalleDevolucion.findFirst({ where: { devolucionId: devolucionA.id } })
    const antes = await stockCava(producto.id)
    const body = { detalleDevolucionId: detalle.id, estadoProducto: 'APTO_PARA_VENTA', decision: 'REINGRESO', ubicacionId: cat.cava.id }
    const { valor: r, s } = await cronometrar(() => llamar(token, 'POST', `/devoluciones/${devolucionA.id}/evaluar-detalle`, body))
    tiempos['MR-08'] = s
    verificar('PF-08', 'La API procesa la decisión de reingreso', r.ok, `HTTP ${r.status} ${r.message || ''}`)
    const despues = await stockCava(producto.id)
    verificar('PF-08', 'El stock en cava aumenta en la cantidad reingresada', despues === antes + cantidad, `${antes} → ${despues}`)
    const mov = await prisma.movimientoInventario.findFirst({ where: { referenciaTipo: 'Devolucion', referenciaId: devolucionA.id, tipo: 'REINGRESO' } })
    verificar('PF-08', 'Se registra el movimiento de inventario REINGRESO', !!mov)
    verificar('PF-08', 'El inventario conserva el balance del ciclo (salida por despacho + reingreso)', despues === stockInicialA, `inicial ${stockInicialA}, final ${despues}`)
    // Cierre del ciclo: la incidencia se resuelve y el despacho queda finalizado
    await exigir(token, 'PATCH', `/incidencias/${incidenciaA.id}/estado`, { estado: 'EN_ATENCION' })
    await exigir(token, 'PATCH', `/incidencias/${incidenciaA.id}/estado`, { estado: 'RESUELTA', decisionOperativa: 'Retorno a planta y reingreso del producto apto' })
  })

  await ejecutar('PF-09', async () => {
    if (!A) throw new Error('Depende de PF-01')
    const { valor: r, s } = await cronometrar(() => llamar(token, 'GET', `/trazabilidad/pedido/${A.id}/expediente`))
    tiempos['MR-09'] = s
    verificar('PF-09', 'La consulta del expediente responde (HTTP 200)', r.status === 200, `HTTP ${r.status}`)
    const linea = r.data?.timeline || []
    const tipos = linea.map((e) => e.tipoEvento)
    const esperados = ['PEDIDO_CREADO', 'PEDIDO_PREPARADO', 'DESPACHO_CREADO', 'INCIDENCIA_REGISTRADA', 'DEVOLUCION_REGISTRADA', 'INVENTARIO_ACTUALIZADO']
    const faltan = esperados.filter((t) => !tipos.includes(t))
    verificar('PF-09', 'El historial incluye registro, despacho, incidencia, devolución e inventario', !faltan.length, faltan.length ? `faltan: ${faltan.join(', ')}` : `${linea.length} eventos`)
    const ordenado = linea.every((e, i) => i === 0 || new Date(linea[i - 1].fechaHora) <= new Date(e.fechaHora))
    verificar('PF-09', 'Los eventos se presentan en orden cronológico', ordenado)
    verificar('PF-09', 'Cada evento conserva usuario responsable y fecha', linea.every((e) => e.usuario && e.fechaHora))
  })

  await ejecutar('PF-10', async () => {
    if (!devolucionA) throw new Error('Depende de PF-06')
    const { valor: [d, i, v], s } = await cronometrar(() => Promise.all([
      llamar(token, 'GET', `/despachos/${despachoA.id}`),
      llamar(token, 'GET', `/incidencias/${incidenciaA.id}`),
      llamar(token, 'GET', `/devoluciones/${devolucionA.id}`),
    ]))
    tiempos['MR-10'] = s
    verificar('PF-10', 'Las tres consultas responden (HTTP 200)', d.ok && i.ok && v.ok)
    verificar('PF-10', 'El despacho muestra el pedido como parada', d.data?.pedidos?.some((p) => p.pedidoId === A.id))
    verificar('PF-10', 'La incidencia muestra el pedido y el despacho asociados', i.data?.despachoPedido?.pedido?.id === A.id && i.data?.despachoPedido?.despacho?.codigo === despachoA.codigo)
    verificar('PF-10', 'La devolución muestra la incidencia, el pedido y la evaluación', v.data?.incidenciaId === incidenciaA.id && v.data?.despachoPedido?.pedido?.id === A.id && !!v.data?.evaluacion)
  })

  // ---------------- PF-11 integridad
  await ejecutar('PF-11', async () => {
    const body = nuevoPedido('B')
    const { valor: [creado, leido], s } = await cronometrar(async () => {
      const c = await llamar(token, 'POST', '/pedidos', body)
      const l = c.ok ? await llamar(token, 'GET', `/pedidos/${c.data.id}`) : null
      return [c, l]
    })
    tiempos['MR-11'] = s
    verificar('PF-11', 'La operación se registra y se puede consultar después', creado.ok && leido?.ok)
    const bd = await prisma.pedido.findUnique({ where: { id: creado.data.id }, include: { detalles: true } })
    verificar('PF-11', 'Los datos guardados en la BD coinciden con los enviados', bd.clienteId === body.clienteId && bd.direccionEntrega === body.direccionEntrega && bd.referenciaEntrega === body.referenciaEntrega && Number(bd.detalles[0].cantidad) === cantidad)
    verificar('PF-11', 'Los datos consultados por la API coinciden con los de la BD', leido.data.codigo === bd.codigo && leido.data.direccionEntrega === bd.direccionEntrega)
    const total = await prisma.pedido.count()
    const invalido = await llamar(token, 'POST', '/pedidos', { ...body, clienteId: '00000000-0000-4000-8000-000000000000' })
    verificar('PF-11', 'Se rechaza un registro con referencias inexistentes sin crear datos', !invalido.ok && (await prisma.pedido.count()) === total, `HTTP ${invalido.status}`)
    if (A) {
      const aHoy = await prisma.pedido.findUnique({ where: { id: A.id }, include: { detalles: true } })
      verificar('PF-11', 'El pedido A conserva sus datos originales tras todo el ciclo', aHoy.codigo === A.codigo && aHoy.direccionEntrega === A.direccionEntrega && Number(aHoy.detalles[0].cantidad) === cantidad)
    }
    await exigir(token, 'PATCH', `/pedidos/${creado.data.id}/estado`, { estado: 'CANCELADO' })
  })

  // ---------------- PF-12 entrega sin incidencia
  await ejecutar('PF-12', async () => {
    const stock0 = await stockCava(producto.id)
    let C = null
    let despacho = null
    let repartidorId = null
    const { s } = await cronometrar(async () => {
      C = await exigir(token, 'POST', '/pedidos', nuevoPedido('C'))
      ;({ despacho, repartidorId } = await hastaEnRuta(C.id))
      await exigir(token, 'PATCH', `/despachos/${despacho.id}/estado`, { estado: 'FINALIZADO' })
    })
    tiempos['MR-12'] = s
    const ped = await prisma.pedido.findUnique({ where: { id: C.id } })
    const parada = await prisma.despachoPedido.findFirst({ where: { pedidoId: C.id } })
    const desp = await prisma.despacho.findUnique({ where: { id: despacho.id } })
    const rep = await prisma.repartidor.findUnique({ where: { id: repartidorId } })
    verificar('PF-12', 'El pedido termina ENTREGADO', ped.estado === 'ENTREGADO', ped.estado)
    verificar('PF-12', 'La parada registra la hora de entrega', parada.estado === 'ENTREGADO' && !!parada.horaEntrega)
    verificar('PF-12', 'El despacho queda FINALIZADO y el repartidor DISPONIBLE', desp.estado === 'FINALIZADO' && rep.estado === 'DISPONIBLE', `${desp.estado} / ${rep.estado}`)
    verificar('PF-12', 'Se registra el evento ENTREGA_REGISTRADA', (await tiposEvento(C.id)).includes('ENTREGA_REGISTRADA'))
    const stock1 = await stockCava(producto.id)
    verificar('PF-12', 'El inventario refleja la salida de la mercancía entregada', stock1 === stock0 - cantidad, `${stock0} → ${stock1}`)
  })

  // ---------------- PF-13 entrega con incidencia
  await ejecutar('PF-13', async () => {
    let D = null
    let despacho = null
    let inc = null
    const { s } = await cronometrar(async () => {
      D = await exigir(token, 'POST', '/pedidos', nuevoPedido('D'))
      ;({ despacho } = await hastaEnRuta(D.id))
      inc = await exigir(token, 'POST', '/incidencias', { despachoPedidoId: despacho.pedidos[0].id, tipoIncidenciaId: cat.tipoRetraso.id, descripcion: `Prueba ${etiqueta}: tráfico en la vía principal` })
      await exigir(token, 'PATCH', `/incidencias/${inc.id}/estado`, { estado: 'EN_REVISION' })
      await exigir(token, 'PATCH', `/incidencias/${inc.id}/estado`, { estado: 'EN_ATENCION' })
      await exigir(token, 'PATCH', `/incidencias/${inc.id}/estado`, { estado: 'RESUELTA', decisionOperativa: 'Reintentar entrega tras la espera de protocolo' })
      await exigir(token, 'PATCH', `/despachos/${despacho.id}/estado`, { estado: 'FINALIZADO' })
    })
    tiempos['MR-13'] = s
    const i = await prisma.incidencia.findUnique({ where: { id: inc.id } })
    const ped = await prisma.pedido.findUnique({ where: { id: D.id } })
    const desp = await prisma.despacho.findUnique({ where: { id: despacho.id } })
    const eventos = await tiposEvento(D.id)
    verificar('PF-13', 'La incidencia recorre su ciclo hasta RESUELTA con decisión y fecha', i.estado === 'RESUELTA' && !!i.decisionOperativa && !!i.fechaResolucion)
    verificar('PF-13', 'La entrega se completa (pedido ENTREGADO, despacho FINALIZADO)', ped.estado === 'ENTREGADO' && desp.estado === 'FINALIZADO', `${ped.estado} / ${desp.estado}`)
    verificar('PF-13', 'La trazabilidad registra incidencia, resolución y entrega', ['INCIDENCIA_REGISTRADA', 'INCIDENCIA_RESUELTA', 'ENTREGA_REGISTRADA'].every((t) => eventos.includes(t)))
  })

  // ---------------- PF-14 devolución completa
  await ejecutar('PF-14', async () => {
    const stock0 = await stockCava(producto.id)
    let E = null
    let despacho = null
    let repartidorId = null
    let dev = null
    let inc = null
    const { s } = await cronometrar(async () => {
      E = await exigir(token, 'POST', '/pedidos', nuevoPedido('E'))
      ;({ despacho, repartidorId } = await hastaEnRuta(E.id))
      inc = await exigir(token, 'POST', '/incidencias', { despachoPedidoId: despacho.pedidos[0].id, tipoIncidenciaId: cat.tipoIncidencia.id, descripcion: `Prueba ${etiqueta}: producto con quiebre de frío` })
      await exigir(token, 'PATCH', `/incidencias/${inc.id}/estado`, { estado: 'EN_REVISION' })
      dev = await devolverYCerrar(despacho, inc.id)
      await exigir(token, 'POST', `/devoluciones/${dev.id}/evaluacion`, { selloIntegro: true, condicionEmpaque: 'Íntegro' })
      const detalle = (await exigir(token, 'GET', `/devoluciones/${dev.id}`)).detalles[0]
      await exigir(token, 'POST', `/devoluciones/${dev.id}/evaluar-detalle`, { detalleDevolucionId: detalle.id, estadoProducto: 'APTO_PARA_VENTA', decision: 'REINGRESO', ubicacionId: cat.cava.id })
      await exigir(token, 'PATCH', `/incidencias/${inc.id}/estado`, { estado: 'EN_ATENCION' })
      await exigir(token, 'PATCH', `/incidencias/${inc.id}/estado`, { estado: 'RESUELTA', decisionOperativa: 'Retorno a planta y reingreso' })
    })
    tiempos['MR-14'] = s
    const d = await prisma.devolucion.findUnique({ where: { id: dev.id } })
    const ped = await prisma.pedido.findUnique({ where: { id: E.id } })
    const desp = await prisma.despacho.findUnique({ where: { id: despacho.id } })
    const rep = await prisma.repartidor.findUnique({ where: { id: repartidorId } })
    verificar('PF-14', 'La devolución termina CERRADA', d.estado === 'CERRADA', d.estado)
    verificar('PF-14', 'El pedido queda DEVUELTO y el despacho FINALIZADO', ped.estado === 'DEVUELTO' && desp.estado === 'FINALIZADO', `${ped.estado} / ${desp.estado}`)
    verificar('PF-14', 'El repartidor queda DISPONIBLE', rep.estado === 'DISPONIBLE', rep.estado)
    const stock1 = await stockCava(producto.id)
    verificar('PF-14', 'El inventario conserva el balance tras la devolución', stock1 === stock0, `${stock0} → ${stock1}`)
  })

  // Garantiza que ningún despacho de la ronda quede abierto (no interfiere con la siguiente)
  if (despachoA) {
    const d = await prisma.despacho.findUnique({ where: { id: despachoA.id } })
    if (!['FINALIZADO', 'CANCELADO'].includes(d.estado)) await llamar(token, 'PATCH', `/despachos/${despachoA.id}/estado`, { estado: 'FINALIZADO' })
  }

  return { resultados, tiempos }
}

// ------------------------------------------------------------------ Resultados

const veredictoRonda = (r) => (!r ? 'No cumple' : r.error && !r.verificaciones.some((v) => v.cumple) ? 'No cumple' : !r.error && r.verificaciones.every((v) => v.cumple) ? 'Cumple' : 'Parcial')
function combinar(veredictos) {
  if (veredictos.every((v) => v === 'Cumple')) return 'Cumple'
  if (veredictos.every((v) => v === 'No cumple')) return 'No cumple'
  return 'Parcial'
}
const media = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
const desviacion = (xs) => { const m = media(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1 || 1)) }
const percentil = (xs, p) => { const o = [...xs].sort((a, b) => a - b); return o[Math.min(o.length - 1, Math.ceil((p / 100) * o.length) - 1)] }
const seg = (x) => (x === undefined || x === null ? '—' : x.toFixed(3).replace('.', ','))

function consolidar(corridas) {
  const pf = Object.keys(CASOS).map((cod) => {
    const porParticipante = corridas.map((c) => combinar(c.rondas.map((r) => veredictoRonda(r.resultados[cod]))))
    const cumplen = porParticipante.filter((v) => v === 'Cumple').length
    const fallas = new Map()
    corridas.forEach((c) => c.rondas.forEach((r) => {
      const res = r.resultados[cod]
      if (res?.error) fallas.set(`Error: ${res.error}`, (fallas.get(`Error: ${res.error}`) || 0) + 1)
      res?.verificaciones.filter((v) => !v.cumple).forEach((v) => {
        const k = `${v.descripcion}${v.detalle ? ` (${v.detalle})` : ''}`.replace(/\d+(\.\d+)? → \d+(\.\d+)?|inicial \d+(\.\d+)?, final \d+(\.\d+)?/, 'valores variables')
        fallas.set(k, (fallas.get(k) || 0) + 1)
      })
    }))
    const criterios = corridas[0].rondas[0].resultados[cod]?.verificaciones.map((v) => v.descripcion) || []
    return { codigo: cod, prueba: CASOS[cod], resultado: combinar(porParticipante), cumplen, porParticipante, criterios, fallas: [...fallas].map(([d, n]) => ({ detalle: d, veces: n })) }
  })
  const mr = Object.keys(MEDICIONES).map((cod) => {
    const porRonda = Array.from({ length: RONDAS }, (_, k) => corridas.map((c) => c.rondas[k].tiempos[cod]).filter((x) => x !== undefined))
    const todos = porRonda.flat()
    return {
      codigo: cod,
      operacion: MEDICIONES[cod][0],
      condicion: MEDICIONES[cod][1],
      tiempos: porRonda.map((xs) => (xs.length ? media(xs) : null)),
      promedio: todos.length ? media(todos) : null,
      n: todos.length,
      min: todos.length ? Math.min(...todos) : null,
      max: todos.length ? Math.max(...todos) : null,
      desviacion: todos.length > 1 ? desviacion(todos) : null,
      p95: todos.length ? percentil(todos, 95) : null,
      bajoUmbral: todos.filter((x) => x < UMBRAL_S).length,
      porParticipante: corridas.map((c) => { const xs = c.rondas.map((r) => r.tiempos[cod]).filter((x) => x !== undefined); return xs.length ? media(xs) : null }),
    }
  })
  return { pf, mr }
}

async function entorno() {
  const [{ version }] = await prisma.$queryRawUnsafe('SELECT version()')
  return {
    fecha: new Date().toISOString(),
    sistemaOperativo: `${os.type()} ${os.release()} (${os.arch()})`,
    procesador: os.cpus()[0]?.model?.trim(),
    nucleos: os.cpus().length,
    memoriaGB: Math.round(os.totalmem() / 1024 ** 3),
    node: process.version,
    postgres: version.split(',')[0],
    base: 'logitrace_pruebas (aislada de la base de desarrollo)',
  }
}

function escribirResultados(datos) {
  fs.mkdirSync(SALIDA, { recursive: true })
  fs.writeFileSync(path.join(SALIDA, 'resultados.json'), JSON.stringify(datos, null, 2))
  const { pf, mr } = datos.consolidado
  const csv = (filas) => '﻿' + filas.map((f) => f.map((v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }).join(';')).join('\r\n')
  fs.writeFileSync(path.join(SALIDA, 'tabla-1-pruebas-funcionales.csv'), csv([
    ['Código', 'Prueba', 'Resultado', 'Participantes que cumplen', 'Observaciones'],
    ...pf.map((p) => [p.codigo, p.prueba, p.resultado, `${p.cumplen}/${PARTICIPANTES}`, p.fallas.map((f) => `${f.detalle} [${f.veces} de ${PARTICIPANTES * RONDAS} ejecuciones]`).join(' | ')]),
  ]))
  fs.writeFileSync(path.join(SALIDA, 'tabla-2-tiempos-respuesta.csv'), csv([
    ['Código', 'Operación evaluada', 'Condición / acción de prueba', 'Tiempo 1 (s)', 'Tiempo 2 (s)', 'Tiempo 3 (s)', 'Promedio (s)', 'Observaciones'],
    ...mr.map((m) => [m.codigo, m.operacion, m.condicion, ...m.tiempos.map(seg), seg(m.promedio), observacionMr(m)]),
  ]))
  fs.writeFileSync(path.join(SALIDA, 'anexo-pf-por-participante.csv'), csv([
    ['Código', ...datos.participantes.map((p) => p.nombre)],
    ...pf.map((p) => [p.codigo, ...p.porParticipante]),
  ]))
  fs.writeFileSync(path.join(SALIDA, 'anexo-mr-por-participante.csv'), csv([
    ['Código', ...datos.participantes.map((p) => `${p.nombre} (s)`)],
    ...mr.map((m) => [m.codigo, ...m.porParticipante.map(seg)]),
  ]))
  fs.writeFileSync(path.join(SALIDA, 'informe-pruebas.md'), informe(datos))
}

function observacionMr(m) {
  if (m.promedio === null) return 'Sin mediciones válidas'
  return `n=${m.n}; mín ${seg(m.min)} s; máx ${seg(m.max)} s; desv. est. ${seg(m.desviacion)} s; ${m.bajoUmbral}/${m.n} bajo ${UMBRAL_S} s`
}

function informe(datos) {
  const { pf, mr } = datos.consolidado
  const e = datos.entorno
  const l = []
  l.push(`# Resultados de pruebas — LogiTrace (${ETIQUETA})`, '')
  l.push(`Ejecución: ${new Date(e.fecha).toLocaleString('es-VE', { timeZone: 'America/Caracas' })} (hora de Venezuela) · duración ${datos.duracionMin} min`, '')
  l.push('## Metodología', '')
  l.push(`- **Participantes:** ${PARTICIPANTES} usuarios de prueba **simulados** mediante un script automatizado (\`BackEnd/scripts/pruebas/ejecutar-pruebas.js\`), cada uno con su propia cuenta (rol OPERADOR) y sesión independiente. No corresponden a personas reales.`)
  l.push(`- **Rondas:** cada participante ejecutó los 14 casos ${RONDAS} veces (Tiempo 1, 2 y 3). En la Tabla 2, cada "Tiempo k" es el promedio de los ${PARTICIPANTES} participantes en la ronda k; el promedio general y las observaciones usan las ${PARTICIPANTES * RONDAS} mediciones.`)
  l.push('- **Tiempo de respuesta:** medido en el cliente desde el envío de la solicitud HTTP hasta la recepción completa de la respuesta (incluye red local, API Node.js/Express y PostgreSQL). En los escenarios (MR-12 a MR-14) es el tiempo total de todas las operaciones del flujo.')
  l.push('- **Criterio de resultado:** un caso *Cumple* para un participante si todas sus verificaciones se cumplen en las 3 rondas; *No cumple* si la operación falla en todas; *Parcial* en cualquier otro caso. El resultado global es *Cumple* solo si los 12 participantes cumplen.')
  l.push('- **Verificación:** cada criterio se comprueba con la respuesta de la API y, de forma independiente, consultando directamente la base de datos.', '')
  l.push('## Entorno de prueba', '')
  l.push(`| Elemento | Valor |`, `|---|---|`)
  l.push(`| Sistema operativo | ${e.sistemaOperativo} |`, `| Procesador | ${e.procesador} (${e.nucleos} hilos) |`, `| Memoria | ${e.memoriaGB} GB |`, `| Node.js | ${e.node} |`, `| Base de datos | ${e.postgres} |`, `| Datos | ${e.base}; seed base + 60 días de operación demo |`, '')
  l.push('## Tabla 1. Pruebas funcionales PF-01 – PF-14', '')
  l.push('| Código | Prueba | Resultado | Participantes | Observaciones |', '|---|---|---|---|---|')
  pf.forEach((p) => l.push(`| ${p.codigo} | ${p.prueba} | **${p.resultado}** | ${p.cumplen}/${PARTICIPANTES} | ${p.fallas.length ? p.fallas.map((f) => `${f.detalle} (${f.veces}/${PARTICIPANTES * RONDAS})`).join('; ') : 'Todas las verificaciones se cumplieron'} |`))
  l.push('', '## Tabla 2. Medición de tiempos de respuesta MR-01 – MR-14', '')
  l.push('| Código | Operación evaluada | Condición / acción de prueba | Tiempo 1 (s) | Tiempo 2 (s) | Tiempo 3 (s) | Promedio (s) | Observaciones |', '|---|---|---|---|---|---|---|---|')
  mr.forEach((m) => l.push(`| ${m.codigo} | ${m.operacion} | ${m.condicion} | ${m.tiempos.map(seg).join(' | ')} | **${seg(m.promedio)}** | ${observacionMr(m)} |`))
  l.push('', '## Criterios de aceptación verificados por caso', '')
  pf.forEach((p) => { l.push(`**${p.codigo} ${p.prueba}**`, ''); p.criterios.forEach((c) => l.push(`- ${c}`)); l.push('') })
  l.push('## Anexo A. Resultado por participante', '')
  l.push(`| Código | ${datos.participantes.map((p) => p.codigo).join(' | ')} |`, `|---|${datos.participantes.map(() => '---').join('|')}|`)
  pf.forEach((p) => l.push(`| ${p.codigo} | ${p.porParticipante.map((v) => (v === 'Cumple' ? 'C' : v === 'Parcial' ? 'P' : 'NC')).join(' | ')} |`))
  l.push('', 'C = Cumple · P = Parcial · NC = No cumple', '')
  l.push('## Anexo B. Tiempo promedio por participante (s)', '')
  l.push(`| Código | ${datos.participantes.map((p) => p.codigo).join(' | ')} |`, `|---|${datos.participantes.map(() => '---').join('|')}|`)
  mr.forEach((m) => l.push(`| ${m.codigo} | ${m.porParticipante.map(seg).join(' | ')} |`))
  l.push('')
  return l.join('\n')
}

// ------------------------------------------------------------------ Principal

;(async () => {
  let backend = null
  try {
    if (argumento('preparar')) {
      preparar()
      return
    }
    const inicio = Date.now()
    const participantes = await asegurarParticipantes()
    backend = iniciarBackend()
    await esperarBackend()

    const cat = {
      producto: await prisma.producto.findFirst({ where: { codigo: 'TEQ-001' } }),
      clientes: await prisma.cliente.findMany({ where: { activo: true }, orderBy: { codigo: 'asc' } }),
      // Zona de despacho vigente de menor código (ZON-009 tras cargar-zonas-valera; ZON-001 si no se cargaron)
      zona: await prisma.zonaDespacho.findFirst({ where: { activo: true }, orderBy: { codigo: 'asc' } }),
      cava: await prisma.ubicacionAlmacen.findFirst({ where: { tipo: 'CAVA' }, orderBy: { codigo: 'asc' } }),
      tipoIncidencia: await prisma.tipoIncidencia.findFirst({ where: { codigo: 'INC-004' } }),
      tipoRetraso: await prisma.tipoIncidencia.findFirst({ where: { codigo: 'INC-001' } }),
      motivo: await prisma.motivoDevolucion.findFirst({ where: { codigo: 'DEV-003' } }),
    }
    for (const [k, v] of Object.entries(cat)) if (!v || (Array.isArray(v) && !v.length)) throw new Error(`Falta el dato base "${k}". Ejecute primero --preparar`)
    const limpieza = await liberarRepartidores()
    if (limpieza.cancelados || limpieza.liberados) console.log(`Entorno de prueba: ${limpieza.cancelados} despacho(s) abierto(s) cancelado(s), ${limpieza.liberados} repartidor(es) liberado(s)`)
    const repuesto = await asegurarStock(cat, participantes[0].id)
    if (repuesto) console.log(`Stock de prueba repuesto: +${repuesto} ${cat.producto.unidadBase} de ${cat.producto.codigo} en cava`)

    const corridas = []
    for (const p of participantes) {
      const login = await llamar(null, 'POST', '/auth/login', { email: p.email, password: CLAVE_PARTICIPANTE })
      if (!login.ok) throw new Error(`No se pudo iniciar sesión como ${p.nombre}: ${login.message}`)
      const rondas = []
      for (let k = 1; k <= RONDAS; k++) {
        rondas.push(await ronda(login.data.accessToken, p, k, cat))
        const fallos = Object.entries(rondas[k - 1].resultados).filter(([, r]) => veredictoRonda(r) !== 'Cumple').map(([c]) => c)
        console.log(`${p.nombre} · ronda ${k}: ${fallos.length ? `observaciones en ${fallos.join(', ')}` : '14/14 casos cumplen'}`)
      }
      corridas.push({ participante: p.codigo, rondas })
    }

    const datos = {
      etiqueta: ETIQUETA,
      entorno: await entorno(),
      duracionMin: Math.round((Date.now() - inicio) / 6000) / 10,
      participantes: participantes.map((p) => ({ codigo: p.codigo, nombre: p.nombre })),
      consolidado: consolidar(corridas),
      corridas,
    }
    escribirResultados(datos)
    console.log('\nTabla 1')
    datos.consolidado.pf.forEach((p) => console.log(`${p.codigo} ${p.prueba.padEnd(38)} ${p.resultado.padEnd(9)} ${p.cumplen}/${PARTICIPANTES}`))
    console.log('\nTabla 2 (segundos)')
    datos.consolidado.mr.forEach((m) => console.log(`${m.codigo} ${m.operacion.padEnd(38)} ${m.tiempos.map(seg).join('  ')}  prom ${seg(m.promedio)}`))
    console.log(`\nResultados en ${SALIDA}`)
  } catch (err) {
    console.error('ERROR:', err.message)
    process.exitCode = 1
  } finally {
    if (backend) backend.kill()
    await prisma.$disconnect()
  }
})()
