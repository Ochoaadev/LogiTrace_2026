// Datos de demostración para el módulo 09 (Reportes y Rendimiento): 60 días de operación histórica
// (pedidos, despachos, entregas, incidencias, devoluciones, temperaturas manuales y residuos) para que
// los indicadores y la comparación con el periodo anterior tengan volumen. Todo se identifica con el
// prefijo DMR- (o la marca [DMR] en observaciones) y no toca el stock del inventario.
//
//   node scripts/seed-demo-reportes.js           → crea (o recrea) los datos demo
//   node scripts/seed-demo-reportes.js --limpiar → elimina solo los datos demo
//
// Requiere el seed base (clientes, zonas, productos, lotes, repartidores, vehículos, catálogos).
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const PREFIJO = 'DMR-'
const MARCA = '[DMR]'
const DIAS = 60

// Generador pseudoaleatorio con semilla fija: los datos son iguales en cada ejecución
let semilla = 20260929
function azar() {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296
  return semilla / 4294967296
}
const entre = (min, max) => min + azar() * (max - min)
const entero = (min, max) => Math.floor(entre(min, max + 1))
const elegir = (lista) => lista[Math.floor(azar() * lista.length)]
function ponderado(opciones) {
  const total = opciones.reduce((s, [, peso]) => s + peso, 0)
  let r = azar() * total
  for (const [valor, peso] of opciones) {
    if ((r -= peso) < 0) return valor
  }
  return opciones[0][0]
}
const codigo = (tipo, n) => `${PREFIJO}${tipo}-${String(n).padStart(4, '0')}`

// Fecha en hora de Venezuela (UTC-4) de hace `dias` días a la hora indicada (minutos desde 00:00)
function fechaLocal(dias, minutos) {
  const base = new Date(Date.now() - dias * 24 * 3600 * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  const hh = String(Math.floor(minutos / 60)).padStart(2, '0')
  const mm = String(Math.floor(minutos % 60)).padStart(2, '0')
  return new Date(`${base}T${hh}:${mm}:00-04:00`)
}
const sumarMin = (fecha, min) => new Date(fecha.getTime() + min * 60000)

async function limpiar() {
  const ids = async (modelo) => (await prisma[modelo].findMany({ where: { codigo: { startsWith: PREFIJO } }, select: { id: true } })).map((x) => x.id)
  const [pedidoIds, despachoIds, incidenciaIds, devolucionIds, residuoIds] = await Promise.all([
    ids('pedido'), ids('despacho'), ids('incidencia'), ids('devolucion'), ids('residuo'),
  ])

  await prisma.$transaction(async (tx) => {
    await tx.eventoTrazabilidad.deleteMany({
      where: {
        OR: [
          { pedidoId: { in: pedidoIds } },
          { entidadTipo: 'Despacho', entidadId: { in: despachoIds } },
          { entidadTipo: 'Residuo', entidadId: { in: residuoIds } },
        ],
      },
    })
    await tx.registroTemperatura.deleteMany({
      where: { OR: [{ despachoId: { in: despachoIds } }, { devolucionId: { in: devolucionIds } }, { observaciones: { startsWith: MARCA } }] },
    })
    await tx.residuo.deleteMany({ where: { id: { in: residuoIds } } })
    await tx.detalleDevolucion.deleteMany({ where: { devolucionId: { in: devolucionIds } } })
    await tx.devolucion.deleteMany({ where: { id: { in: devolucionIds } } })
    await tx.incidencia.deleteMany({ where: { id: { in: incidenciaIds } } })
    await tx.despacho.deleteMany({ where: { id: { in: despachoIds } } }) // cascada: DespachoPedido, DetalleDespacho
    await tx.pedido.deleteMany({ where: { id: { in: pedidoIds } } }) // cascada: DetallePedido
  }, { timeout: 60000 })

  console.log(`Datos demo de reportes eliminados: ${pedidoIds.length} pedidos, ${despachoIds.length} despachos, `
    + `${incidenciaIds.length} incidencias, ${devolucionIds.length} devoluciones, ${residuoIds.length} residuos`)
}

async function requerido(modelo, where, descripcion) {
  const r = await prisma[modelo].findFirst({ where })
  if (!r) throw new Error(`Falta en el seed base: ${descripcion}. Ejecuta primero "npm run prisma:seed".`)
  return r
}

async function crear() {
  const clientes = await prisma.cliente.findMany({ where: { activo: true } })
  const zonas = Object.fromEntries((await prisma.zonaDespacho.findMany()).map((z) => [z.codigo, z]))
  const repartidores = await prisma.repartidor.findMany()
  const vehiculos = await prisma.vehiculo.findMany({ where: { activo: true } })
  const lotes = await prisma.lote.findMany({ where: { producto: { codigo: { startsWith: 'TEQ' } } }, include: { producto: true } })
  const tiposIncidencia = Object.fromEntries((await prisma.tipoIncidencia.findMany()).map((t) => [t.codigo, t]))
  const motivos = Object.fromEntries((await prisma.motivoDevolucion.findMany()).map((m) => [m.codigo, m]))
  const tiposResiduo = Object.fromEntries((await prisma.tipoResiduo.findMany()).map((t) => [t.codigo, t]))
  const gestores = Object.fromEntries((await prisma.gestorResiduo.findMany()).map((g) => [g.codigo, g]))
  const operador = await requerido('usuario', { rol: 'OPERADOR' }, 'un usuario OPERADOR')
  const supervisor = (await prisma.usuario.findFirst({ where: { rol: 'SUPERVISOR' } })) || operador
  const cava = await requerido('ubicacionAlmacen', { tipo: 'CAVA' }, 'una ubicación tipo CAVA')
  if (!clientes.length || !repartidores.length || !vehiculos.length || !lotes.length || !zonas['ZON-001']) {
    throw new Error('Faltan datos del seed base. Ejecuta primero "npm run prisma:seed".')
  }

  // Volumen por sector (eje Valera): el centro concentra la mayor parte
  // Zonas de despacho vigentes (scripts/cargar-zonas-valera.js); si no se han cargado, las del seed base
  const SECTORES = (zonas['ZON-009']
    ? [['ZON-009', 45], ['ZON-010', 45], ['ZON-011', 10]]
    : [['ZON-001', 40], ['ZON-002', 24], ['ZON-003', 18], ['ZON-006', 12], ['ZON-004', 6]]).filter(([z]) => zonas[z])
  const CAUSAS = [['INC-004', 40], ['INC-001', 25], ['INC-003', 15], ['INC-002', 10], ['INC-005', 10]].filter(([c]) => tiposIncidencia[c])
  const MOTIVOS = [['DEV-003', 35], ['DEV-005', 30], ['DEV-001', 25], ['DEV-002', 10]].filter(([m]) => motivos[m])

  const n = { pedido: 0, despacho: 0, incidencia: 0, devolucion: 0, residuo: 0 }
  const evento = (data) => prisma.eventoTrazabilidad.create({ data: { usuarioId: operador.id, ...data } })

  for (let dia = DIAS; dia >= 1; dia--) {
    // Control diario de la cava
    await prisma.registroTemperatura.create({
      data: { tipoRegistro: 'CAVA', ubicacionId: cava.id, temperaturaC: entre(-20, -18).toFixed(1), fechaHora: fechaLocal(dia, 7 * 60 + entero(0, 20)), usuarioId: operador.id, observaciones: `${MARCA} Control diario de cava` },
    })

    const despachosDia = entero(1, 2)
    for (let k = 0; k < despachosDia; k++) {
      const salida = fechaLocal(dia, (k === 0 ? 9 * 60 : 13 * 60) + entero(0, 25))
      const repartidor = repartidores[k % repartidores.length]
      const despacho = await prisma.despacho.create({
        data: {
          codigo: codigo('D', ++n.despacho),
          repartidorId: repartidor.id,
          vehiculoId: vehiculos[(dia + k) % vehiculos.length].id,
          estado: 'FINALIZADO',
          fechaHoraSalida: salida,
          medioConservacion: `Caja isotérmica #0${entero(1, 6)}`,
          precintoSeguridad: `${PREFIJO}PREC-${n.despacho}`,
        },
      })
      await prisma.registroTemperatura.create({
        data: { tipoRegistro: 'VEHICULO_SALIDA', despachoId: despacho.id, temperaturaC: entre(-19, -16.5).toFixed(1), fechaHora: salida, usuarioId: operador.id, observaciones: 'Salida de planta' },
      })

      let reloj = salida
      const paradas = entero(3, 5)
      for (let parada = 1; parada <= paradas; parada++) {
        const cliente = elegir(clientes)
        const lote = elegir(lotes)
        const cantidad = entero(10, 60)
        const zona = zonas[ponderado(SECTORES)]
        const registro = sumarMin(salida, -entero(90, 300))
        const pedido = await prisma.pedido.create({
          data: {
            codigo: codigo('P', ++n.pedido),
            clienteId: cliente.id,
            zonaId: zona.id,
            fechaHora: registro,
            estado: 'ENTREGADO',
            prioridad: ponderado([['NORMAL', 70], ['ALTA', 20], ['URGENTE', 10]]),
            direccionEntrega: `${zona.nombre}, Valera`,
            creadoPorId: operador.id,
            detalles: { create: [{ productoId: lote.productoId, cantidad, unidad: lote.producto.unidadBase }] },
          },
          include: { detalles: true },
        })
        await evento({ pedidoId: pedido.id, tipoEvento: 'PEDIDO_CREADO', entidadTipo: 'Pedido', entidadId: pedido.id, estadoNuevo: 'REGISTRADO', descripcion: 'Pedido registrado (demo reportes)', fechaHora: registro })

        reloj = sumarMin(reloj, entero(6, 16))
        const llegada = reloj
        const escenario = ponderado([['conforme', 94], ['incidencia', 3], ['devolucion', 3]])
        const dp = await prisma.despachoPedido.create({
          data: {
            despachoId: despacho.id,
            pedidoId: pedido.id,
            ordenParada: parada,
            estado: escenario === 'devolucion' ? 'DEVUELTO' : 'ENTREGADO',
            horaLlegada: llegada,
            horaEntrega: escenario === 'devolucion' ? null : sumarMin(llegada, escenario === 'incidencia' ? entero(15, 35) : entero(2, 8)),
            receptor: escenario === 'devolucion' ? null : 'Encargado de tienda',
            detalles: { create: [{ detallePedidoId: pedido.detalles[0].id, loteId: lote.id, cantidad, unidad: lote.producto.unidadBase }] },
          },
        })

        let incidencia = null
        if (escenario !== 'conforme') {
          const fechaInc = sumarMin(llegada, 3)
          incidencia = await prisma.incidencia.create({
            data: {
              codigo: codigo('INC', ++n.incidencia),
              despachoPedidoId: dp.id,
              tipoIncidenciaId: tiposIncidencia[ponderado(CAUSAS)].id,
              reportadoPorId: repartidor.usuarioId,
              fechaHora: fechaInc,
              descripcion: 'Novedad reportada por el repartidor durante la entrega (demo reportes).',
              decisionOperativa: escenario === 'devolucion' ? 'Retorno a planta para preservar la cadena de frío' : 'Esperar y reintentar la entrega',
              estado: 'CERRADA',
              resueltaPorId: supervisor.id,
              fechaResolucion: sumarMin(fechaInc, entero(15, 60)),
            },
          })
          await evento({ pedidoId: pedido.id, tipoEvento: 'INCIDENCIA_REGISTRADA', entidadTipo: 'Incidencia', entidadId: incidencia.id, estadoNuevo: 'REPORTADA', descripcion: 'Incidencia en ruta (demo reportes)', fechaHora: fechaInc })
        }

        if (escenario === 'devolucion') {
          const decision = ponderado([['REINGRESO', 55], ['CUARENTENA', 25], ['DESCARTE', 20]])
          const fechaDev = sumarMin(llegada, 20)
          const devolucion = await prisma.devolucion.create({
            data: {
              codigo: codigo('DEV', ++n.devolucion),
              despachoPedidoId: dp.id,
              incidenciaId: incidencia.id,
              motivoId: motivos[ponderado(MOTIVOS)].id,
              estado: 'CERRADA',
              fechaRegistro: fechaDev,
              fechaRecepcion: sumarMin(fechaDev, entero(20, 50)),
              recibidoPorId: supervisor.id,
              observaciones: `${MARCA} Retorno de mercancía`,
              detalles: {
                create: [{
                  detallePedidoId: pedido.detalles[0].id,
                  loteId: lote.id,
                  cantidad,
                  unidad: lote.producto.unidadBase,
                  estadoProducto: decision === 'REINGRESO' ? 'APTO_PARA_VENTA' : decision === 'CUARENTENA' ? 'DETERIORADO' : 'NO_APTO_PARA_VENTA',
                  decision,
                }],
              },
            },
          })
          await prisma.pedido.update({ where: { id: pedido.id }, data: { estado: 'DEVUELTO' } })
          await prisma.registroTemperatura.create({
            data: { tipoRegistro: 'RECEPCION_DEVOLUCION', devolucionId: devolucion.id, temperaturaC: (decision === 'DESCARTE' ? entre(-12, -8) : entre(-18, -16)).toFixed(1), fechaHora: sumarMin(fechaDev, 40), usuarioId: operador.id, observaciones: 'Recepción en planta' },
          })
          await evento({ pedidoId: pedido.id, tipoEvento: 'DEVOLUCION_REGISTRADA', entidadTipo: 'Devolucion', entidadId: devolucion.id, estadoNuevo: 'SOLICITADA', descripcion: 'Devolución registrada (demo reportes)', fechaHora: fechaDev })
          if (decision === 'DESCARTE' && tiposResiduo['RES-001']) {
            const residuo = await prisma.residuo.create({
              data: {
                codigo: codigo('RES', ++n.residuo),
                tipoResiduoId: tiposResiduo['RES-001'].id,
                devolucionId: devolucion.id,
                gestorId: gestores['GES-002']?.id,
                cantidad: (cantidad * 0.25).toFixed(1), // bandejas de ~250 g
                unidad: 'kg',
                origen: `Devolución ${devolucion.codigo}`,
                estado: dia > 7 ? 'DISPOSICION_FINAL' : 'EN_ALMACENAMIENTO',
                fechaGeneracion: sumarMin(fechaDev, 60),
                fechaRetiro: dia > 7 ? sumarMin(fechaDev, 3 * 24 * 60) : null,
                observaciones: 'Merma por quiebre térmico',
              },
            })
            await evento({ pedidoId: pedido.id, tipoEvento: 'RESIDUO_REGISTRADO', entidadTipo: 'Residuo', entidadId: residuo.id, estadoNuevo: 'REGISTRADO', descripcion: 'Descarte registrado como residuo (demo reportes)', fechaHora: residuo.fechaGeneracion })
          }
        } else {
          await evento({ pedidoId: pedido.id, tipoEvento: 'ENTREGA_REGISTRADA', entidadTipo: 'DespachoPedido', entidadId: dp.id, estadoNuevo: 'ENTREGADO', descripcion: 'Entrega registrada (demo reportes)', fechaHora: dp.horaEntrega })
        }
      }
      await prisma.despacho.update({ where: { id: despacho.id }, data: { fechaHoraCierre: sumarMin(reloj, entero(20, 40)) } })
    }

    // Residuos de planta: aceite y sólidos dos veces por semana, merma de producción a diario
    const residuosDia = [['RES-001', 'kg', 3, 7, 'Línea de laminado y corte', 'GES-002']]
    if (dia % 3 === 0) residuosDia.push(['RES-004', 'litros', 12, 22, 'Área de fritura', 'GES-001'], ['RES-002', 'kg', 15, 35, 'Almacén de materia prima', 'GES-001'])
    if (dia % 7 === 0) residuosDia.push(['RES-003', 'kg', 5, 12, 'Empaque y despacho', 'GES-001'])
    for (const [tipo, unidad, min, max, origen, gestor] of residuosDia) {
      if (!tiposResiduo[tipo]) continue
      const generado = fechaLocal(dia, 16 * 60 + entero(0, 90))
      const retirado = dia > 5
      const residuo = await prisma.residuo.create({
        data: {
          codigo: codigo('RES', ++n.residuo),
          tipoResiduoId: tiposResiduo[tipo].id,
          gestorId: gestores[gestor]?.id,
          cantidad: entre(min, max).toFixed(1),
          unidad,
          origen,
          estado: retirado ? (dia > 10 ? 'DISPOSICION_FINAL' : 'RETIRADO') : dia > 2 ? 'EN_ALMACENAMIENTO' : 'REGISTRADO',
          fechaGeneracion: generado,
          fechaRetiro: retirado ? sumarMin(generado, entero(2, 4) * 24 * 60) : null,
          observaciones: tipo === 'RES-004' ? `Tambor #0${entero(1, 6)}` : null,
        },
      })
      await evento({ tipoEvento: 'RESIDUO_REGISTRADO', entidadTipo: 'Residuo', entidadId: residuo.id, estadoNuevo: 'REGISTRADO', descripcion: 'Residuo registrado (demo reportes)', fechaHora: generado })
    }
  }

  console.log(`Datos demo de reportes creados (${DIAS} días): ${n.pedido} pedidos, ${n.despacho} despachos, `
    + `${n.incidencia} incidencias, ${n.devolucion} devoluciones, ${n.residuo} residuos`)
}

;(async () => {
  try {
    await limpiar()
    if (!process.argv.includes('--limpiar')) await crear()
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
})()
