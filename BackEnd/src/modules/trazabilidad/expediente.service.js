// Expediente de trazabilidad de un pedido (Fase 7): reúne en una sola respuesta todo lo que
// ocurrió con el pedido en los distintos módulos (pedido → despacho → GPS → incidencias →
// devoluciones → inventario), más la cadena de frío registrada manualmente.
const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { PARAMETROS } = require('../../config/parametros')

// Temperatura máxima admisible para producto congelado. Registros por encima rompen la cadena de frío.
const LIMITE_CRITICO_C = PARAMETROS.limiteCriticoC

// Módulo del Figma al que pertenece cada tipo de evento (etiqueta "MÓDULO 0X" de la línea temporal)
const MODULO_POR_EVENTO = {
  PEDIDO_CREADO: ['02', 'Pedidos'],
  PEDIDO_ACTUALIZADO: ['02', 'Pedidos'],
  ESTADO_PEDIDO_CAMBIADO: ['02', 'Pedidos'],
  PEDIDO_PREPARADO: ['02', 'Pedidos'],
  DESPACHO_CREADO: ['03', 'Despachos'],
  DESPACHO_ASIGNADO: ['03', 'Despachos'],
  SALIDA_DESPACHO: ['03', 'Despachos'],
  UBICACION_ACTUALIZADA: ['03', 'Despachos'],
  ENTREGA_REGISTRADA: ['03', 'Despachos'],
  INCIDENCIA_REGISTRADA: ['04', 'Incidencias'],
  INCIDENCIA_RESUELTA: ['04', 'Incidencias'],
  DEVOLUCION_REGISTRADA: ['05', 'Logística inversa'],
  DEVOLUCION_RECIBIDA: ['05', 'Logística inversa'],
  PRODUCTO_EVALUADO: ['05', 'Logística inversa'],
  DEVOLUCION_CERRADA: ['05', 'Logística inversa'],
  INVENTARIO_ACTUALIZADO: ['06', 'Inventario'],
  RESIDUO_REGISTRADO: ['08', 'Residuos'],
  TRAZABILIDAD_CERRADA: ['07', 'Trazabilidad'],
}

const TITULO_POR_EVENTO = {
  PEDIDO_CREADO: 'Registro del pedido',
  PEDIDO_ACTUALIZADO: 'Pedido actualizado',
  ESTADO_PEDIDO_CAMBIADO: 'Cambio de estado del pedido',
  PEDIDO_PREPARADO: 'Preparación en cava',
  DESPACHO_CREADO: 'Despacho creado',
  DESPACHO_ASIGNADO: 'Asignación a despacho',
  SALIDA_DESPACHO: 'Salida a ruta',
  UBICACION_ACTUALIZADA: 'Posición GPS registrada',
  ENTREGA_REGISTRADA: 'Entrega registrada',
  INCIDENCIA_REGISTRADA: 'Incidencia reportada en ruta',
  INCIDENCIA_RESUELTA: 'Incidencia resuelta',
  DEVOLUCION_REGISTRADA: 'Activación de logística inversa',
  DEVOLUCION_RECIBIDA: 'Devolución recibida en planta',
  PRODUCTO_EVALUADO: 'Evaluación de calidad',
  DEVOLUCION_CERRADA: 'Devolución cerrada',
  INVENTARIO_ACTUALIZADO: 'Actualización de inventario',
  RESIDUO_REGISTRADO: 'Residuo registrado',
  TRAZABILIDAD_CERRADA: 'Trazabilidad cerrada',
}

// Categoría visual del evento (color en la línea temporal)
function categoriaEvento(tipo) {
  if (tipo.startsWith('INCIDENCIA')) return 'incidencia'
  if (tipo.startsWith('DEVOLUCION') || tipo === 'PRODUCTO_EVALUADO') return 'inversa'
  if (tipo === 'INVENTARIO_ACTUALIZADO') return 'inventario'
  if (tipo === 'ENTREGA_REGISTRADA' || tipo === 'TRAZABILIDAD_CERRADA') return 'cierre'
  if (tipo === 'RESIDUO_REGISTRADO') return 'residuo'
  return 'operacion'
}

const num = (d) => (d === null || d === undefined ? null : Number(d))

// Algunos módulos registran varios cambios de estado con el mismo tipo de evento (p. ej. toda
// transición de devolución usa DEVOLUCION_CERRADA); el título se precisa con el estado destino.
const TITULO_POR_EVENTO_Y_ESTADO = {
  'DEVOLUCION_CERRADA:EN_TRASLADO': 'Traslado a planta',
  'DEVOLUCION_CERRADA:CANCELADA': 'Devolución cancelada',
  'DESPACHO_ASIGNADO:PREPARANDO': 'Preparación de carga',
  'DESPACHO_ASIGNADO:CANCELADO': 'Despacho cancelado',
  'INCIDENCIA_REGISTRADA:EN_REVISION': 'Incidencia en revisión',
  'INCIDENCIA_REGISTRADA:EN_ATENCION': 'Incidencia en atención',
  'INCIDENCIA_REGISTRADA:CERRADA': 'Incidencia cerrada',
  'INCIDENCIA_REGISTRADA:CANCELADA': 'Incidencia anulada',
  'INCIDENCIA_REGISTRADA:FINALIZADO': 'Despacho finalizado',
  'RESIDUO_REGISTRADO:EN_ALMACENAMIENTO': 'Residuo en almacenamiento temporal',
  'RESIDUO_REGISTRADO:RETIRADO': 'Residuo retirado por gestor',
  'RESIDUO_REGISTRADO:DISPOSICION_FINAL': 'Disposición final del residuo',
  'RESIDUO_REGISTRADO:ANULADO': 'Registro de residuo anulado',
}

// Evento de trazabilidad en el formato de la línea temporal (título, módulo, categoría visual)
function mapearEvento(e) {
  const [numero, modulo] = MODULO_POR_EVENTO[e.tipoEvento] || ['07', 'Trazabilidad']
  return {
    id: e.id,
    fechaHora: e.fechaHora,
    tipoEvento: e.tipoEvento,
    titulo: TITULO_POR_EVENTO_Y_ESTADO[`${e.tipoEvento}:${e.estadoNuevo}`] || TITULO_POR_EVENTO[e.tipoEvento] || e.tipoEvento,
    categoria: categoriaEvento(e.tipoEvento),
    modulo: { numero, nombre: modulo },
    descripcion: e.descripcion,
    estadoAnterior: e.estadoAnterior,
    estadoNuevo: e.estadoNuevo,
    entidadTipo: e.entidadTipo,
    entidadId: e.entidadId,
    pedidoId: e.pedidoId,
    usuario: e.usuario?.nombre,
    rol: e.usuario?.rol,
    ubicacion: e.ubicacionGPS
      ? { lat: num(e.ubicacionGPS.latitud), lng: num(e.ubicacionGPS.longitud) }
      : null,
  }
}

const ESTADOS_EN_CURSO = ['REGISTRADO', 'EN_PREPARACION', 'LISTO_PARA_DESPACHO', 'EN_RUTA']

// Despacho vigente de un pedido: el último que no fue reprogramado (un pedido reprogramado
// conserva su DespachoPedido anterior en estado REPROGRAMADO).
function despachoVigente(despachoPedidos) {
  const vigentes = despachoPedidos.filter((dp) => dp.estado !== 'REPROGRAMADO')
  return (vigentes.length ? vigentes : despachoPedidos).at(-1)
}

// Rango [00:00, 24:00) de un día en hora de Venezuela (UTC-4, sin horario de verano)
function rangoDia(fecha) {
  const desde = new Date(`${fecha}T00:00:00-04:00`)
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000)
  return { gte: desde, lt: hasta }
}

function filtroResultado(resultado) {
  switch (resultado) {
    case 'EN_CURSO':
      return { estado: { in: ESTADOS_EN_CURSO } }
    case 'ENTREGADO':
      return { estado: { in: ['ENTREGADO', 'CERRADO'] } }
    case 'CON_INCIDENCIA':
      return {
        OR: [
          { estado: 'CON_INCIDENCIA' },
          { despachos: { some: { incidencias: { some: {} } } } },
        ],
      }
    case 'DEVOLUCION':
      return {
        OR: [
          { estado: 'DEVUELTO' },
          { despachos: { some: { devoluciones: { some: {} } } } },
        ],
      }
    case 'CANCELADO':
      return { estado: 'CANCELADO' }
    default:
      return {}
  }
}

/**
 * Busca expedientes (pedidos) por un término libre: código de pedido, cliente, código de
 * despacho, precinto, lote, incidencia o devolución. Es lo que se escribe o escanea en la
 * barra de búsqueda y en "Consultar por código / precinto".
 */
async function buscarExpedientes(query) {
  const { page, limit, skip } = getPagination(query)
  const { q, fecha, resultado } = query
  const term = q?.trim()

  const and = []
  if (term) {
    const contains = { contains: term, mode: 'insensitive' }
    and.push({
      OR: [
        { codigo: contains },
        { cliente: { razonSocial: contains } },
        { despachos: { some: { despacho: { codigo: contains } } } },
        { despachos: { some: { despacho: { precintoSeguridad: contains } } } },
        { despachos: { some: { detalles: { some: { lote: { codigo: contains } } } } } },
        { despachos: { some: { incidencias: { some: { codigo: contains } } } } },
        { despachos: { some: { devoluciones: { some: { codigo: contains } } } } },
      ],
    })
  }
  if (fecha) and.push({ fechaHora: rangoDia(fecha) })
  if (resultado) and.push(filtroResultado(resultado))
  const where = and.length ? { AND: and } : {}

  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaHora: 'desc' },
      include: {
        cliente: { select: { razonSocial: true } },
        zona: { select: { nombre: true } },
        despachos: {
          include: {
            despacho: {
              select: {
                codigo: true,
                estado: true,
                precintoSeguridad: true,
                repartidor: { select: { usuario: { select: { nombre: true } } } },
              },
            },
            _count: { select: { incidencias: true, devoluciones: true } },
          },
        },
        _count: { select: { eventos: true } },
      },
    }),
    prisma.pedido.count({ where }),
  ])

  const data = pedidos.map((p) => {
    const actual = despachoVigente(p.despachos)
    return {
      id: p.id,
      codigo: p.codigo,
      fechaHora: p.fechaHora,
      estado: p.estado,
      cliente: p.cliente?.razonSocial,
      zona: p.zona?.nombre,
      despacho: actual?.despacho?.codigo || null,
      precinto: actual?.despacho?.precintoSeguridad || null,
      repartidor: actual?.despacho?.repartidor?.usuario?.nombre || null,
      incidencias: p.despachos.reduce((n, dp) => n + dp._count.incidencias, 0),
      devoluciones: p.despachos.reduce((n, dp) => n + dp._count.devoluciones, 0),
      eventos: p._count.eventos,
    }
  })

  return { data, total, page, limit }
}

async function getExpediente(pedidoId) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      cliente: true,
      zona: { select: { id: true, nombre: true, municipio: true } },
      creadoPor: { select: { nombre: true, rol: true } },
      detalles: { include: { producto: { select: { id: true, codigo: true, nombre: true, unidadBase: true } } } },
      despachos: {
        orderBy: { despacho: { codigo: 'asc' } },
        include: {
          detalles: { include: { lote: { select: { id: true, codigo: true, fechaVencimiento: true } } } },
          despacho: {
            include: {
              ruta: { select: { codigo: true, nombre: true } },
              repartidor: { include: { usuario: { select: { nombre: true } } } },
              vehiculo: true,
              ubicacionesGPS: { orderBy: { fechaHora: 'asc' } },
              registrosTemperatura: {
                orderBy: { fechaHora: 'asc' },
                include: { usuario: { select: { nombre: true } }, ubicacion: { select: { nombre: true } } },
              },
            },
          },
          incidencias: {
            orderBy: { fechaHora: 'asc' },
            include: {
              tipo: { select: { nombre: true } },
              reportadoPor: { select: { nombre: true } },
              resueltaPor: { select: { nombre: true } },
            },
          },
          devoluciones: {
            orderBy: { fechaRegistro: 'asc' },
            include: {
              motivo: { select: { nombre: true } },
              recibidoPor: { select: { nombre: true } },
              evaluacion: { include: { evaluadoPor: { select: { nombre: true } } } },
              detalles: { include: { lote: { select: { codigo: true } } } },
              registrosTemp: {
                orderBy: { fechaHora: 'asc' },
                include: { usuario: { select: { nombre: true } } },
              },
            },
          },
        },
      },
    },
  })
  if (!pedido) throw new AppError('Pedido no encontrado', 404)

  const despachoPedidos = pedido.despachos
  const despachos = despachoPedidos.map((dp) => dp.despacho)
  const incidencias = despachoPedidos.flatMap((dp) => dp.incidencias)
  const devoluciones = despachoPedidos.flatMap((dp) => dp.devoluciones)

  // Los eventos de despacho/incidencia/devolución no siempre llevan pedidoId; se reúnen por entidad.
  const entidades = [
    { entidadTipo: 'Despacho', ids: despachos.map((d) => d.id) },
    { entidadTipo: 'Incidencia', ids: incidencias.map((i) => i.id) },
    { entidadTipo: 'Devolucion', ids: devoluciones.map((d) => d.id) },
  ].filter((e) => e.ids.length)

  const [eventos, movimientos] = await Promise.all([
    prisma.eventoTrazabilidad.findMany({
      where: {
        OR: [
          { pedidoId },
          ...entidades.map((e) => ({ entidadTipo: e.entidadTipo, entidadId: { in: e.ids } })),
        ],
      },
      orderBy: { fechaHora: 'asc' },
      include: {
        usuario: { select: { nombre: true, rol: true } },
        ubicacionGPS: { select: { latitud: true, longitud: true } },
      },
    }),
    prisma.movimientoInventario.findMany({
      where: {
        OR: [
          { referenciaTipo: 'Pedido', referenciaId: pedidoId },
          ...(devoluciones.length
            ? [{ referenciaTipo: 'Devolucion', referenciaId: { in: devoluciones.map((d) => d.id) } }]
            : []),
        ],
      },
      orderBy: { fechaHora: 'asc' },
      include: {
        lote: { select: { codigo: true } },
        ubicacionOrigen: { select: { nombre: true } },
        ubicacionDestino: { select: { nombre: true } },
      },
    }),
  ])

  // ---- Carga: productos del pedido con los lotes efectivamente despachados
  const lotesPorDetalle = new Map()
  for (const dp of despachoPedidos) {
    for (const dd of dp.detalles) {
      const lista = lotesPorDetalle.get(dd.detallePedidoId) || []
      if (!lista.includes(dd.lote.codigo)) lista.push(dd.lote.codigo)
      lotesPorDetalle.set(dd.detallePedidoId, lista)
    }
  }
  const carga = pedido.detalles.map((d) => ({
    producto: d.producto.nombre,
    codigo: d.producto.codigo,
    cantidad: num(d.cantidad),
    unidad: d.unidad,
    lotes: lotesPorDetalle.get(d.id) || [],
  }))

  // ---- Logística: despacho vigente
  const dpActual = despachoVigente(despachoPedidos)
  const dActual = dpActual?.despacho
  const logistica = dActual
    ? {
        despachoId: dActual.id,
        codigo: dActual.codigo,
        estado: dActual.estado,
        ruta: dActual.ruta?.nombre || null,
        repartidor: dActual.repartidor?.usuario?.nombre || null,
        vehiculo: dActual.vehiculo
          ? {
              codigo: dActual.vehiculo.codigo,
              tipo: dActual.vehiculo.tipo,
              placa: dActual.vehiculo.placa,
              esTermico: dActual.vehiculo.esTermico,
              capacidadCarga: num(dActual.vehiculo.capacidadCarga),
              unidadCapacidad: dActual.vehiculo.unidadCapacidad,
            }
          : null,
        precinto: dActual.precintoSeguridad,
        medioConservacion: dActual.medioConservacion,
        salida: dActual.fechaHoraSalida,
        cierre: dActual.fechaHoraCierre,
        ordenParada: dpActual.ordenParada,
        estadoEntrega: dpActual.estado,
        horaEntrega: dpActual.horaEntrega,
        receptor: dpActual.receptor,
      }
    : null

  // ---- Cadena de frío: registros manuales del despacho y de las devoluciones
  const registros = [
    ...despachos.flatMap((d) =>
      d.registrosTemperatura.map((r) => ({ ...r, origen: `Despacho ${d.codigo}` }))
    ),
    ...devoluciones.flatMap((dv) =>
      dv.registrosTemp.map((r) => ({ ...r, origen: `Devolución ${dv.codigo}` }))
    ),
  ]
    .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
    .sort((a, b) => a.fechaHora - b.fechaHora)
    .map((r) => ({
      id: r.id,
      fechaHora: r.fechaHora,
      temperaturaC: num(r.temperaturaC),
      tipoRegistro: r.tipoRegistro,
      origen: r.ubicacion?.nombre || r.origen,
      metodo: r.metodo,
      usuario: r.usuario?.nombre,
      observaciones: r.observaciones,
      fueraDeRango: num(r.temperaturaC) > LIMITE_CRITICO_C,
    }))

  const cadenaFrio = {
    limiteCriticoC: LIMITE_CRITICO_C,
    registros,
    ultima: registros[registros.length - 1] || null,
    // Sin registros no se puede afirmar nada: null = "sin datos", no "conforme"
    conforme: registros.length ? registros.every((r) => !r.fueraDeRango) : null,
  }

  // ---- Línea temporal
  // createDespacho registra "DESPACHO_CREADO" dos veces (general y por pedido): en el expediente
  // del pedido basta el suyo.
  const timeline = eventos
    .filter((e) => !(e.tipoEvento === 'DESPACHO_CREADO' && !e.pedidoId &&
      eventos.some((o) => o.tipoEvento === 'DESPACHO_CREADO' && o.pedidoId === pedidoId && o.entidadId === e.entidadId)))
    .map(mapearEvento)

  // ---- Recorrido GPS
  const gps = {
    puntos: despachos.flatMap((d) =>
      d.ubicacionesGPS.map((u) => ({
        lat: num(u.latitud),
        lng: num(u.longitud),
        fechaHora: u.fechaHora,
        velocidadKmh: num(u.velocidadKmh),
        despacho: d.codigo,
      }))
    ),
    destino:
      pedido.latitudEntrega && pedido.longitudEntrega
        ? { lat: num(pedido.latitudEntrega), lng: num(pedido.longitudEntrega), direccion: pedido.direccionEntrega }
        : null,
  }

  // ---- Responsables: personas que intervinieron, con su función en el expediente
  const responsables = []
  const agregar = (nombre, funcion) => {
    if (nombre && !responsables.some((r) => r.nombre === nombre && r.funcion === funcion)) {
      responsables.push({ nombre, funcion })
    }
  }
  agregar(pedido.creadoPor?.nombre, 'Registro del pedido')
  despachos.forEach((d) => agregar(d.repartidor?.usuario?.nombre, 'Repartidor'))
  incidencias.forEach((i) => {
    agregar(i.reportadoPor?.nombre, 'Reportó incidencia')
    agregar(i.resueltaPor?.nombre, 'Resolvió incidencia')
  })
  devoluciones.forEach((dv) => {
    agregar(dv.recibidoPor?.nombre, 'Recepción de devolución')
    agregar(dv.evaluacion?.evaluadoPor?.nombre, 'Evaluación de calidad')
  })

  // ---- Evidencias registradas
  const evaluaciones = devoluciones.map((dv) => dv.evaluacion).filter(Boolean)
  const evidencias = {
    guiaDespacho: dActual ? { codigo: dActual.codigo, despachoId: dActual.id } : null,
    precinto: dActual?.precintoSeguridad
      ? {
          codigo: dActual.precintoSeguridad,
          // Íntegro salvo que alguna evaluación de devolución haya reportado el sello roto
          integro: evaluaciones.every((ev) => ev.selloIntegro !== false),
        }
      : null,
    registrosTemperatura: registros.length,
    entrega: dpActual?.horaEntrega ? { receptor: dpActual.receptor, fechaHora: dpActual.horaEntrega } : null,
  }

  return {
    pedido: {
      id: pedido.id,
      codigo: pedido.codigo,
      estado: pedido.estado,
      prioridad: pedido.prioridad,
      fechaHora: pedido.fechaHora,
      metodoEntrega: pedido.metodoEntrega,
      direccionEntrega: pedido.direccionEntrega,
      referenciaEntrega: pedido.referenciaEntrega,
      zona: pedido.zona?.nombre || null,
      municipio: pedido.zona?.municipio || null,
      observaciones: pedido.observaciones,
    },
    cliente: {
      id: pedido.cliente.id,
      razonSocial: pedido.cliente.razonSocial,
      contacto: pedido.cliente.nombreContacto,
      telefono: pedido.telefonoContacto || pedido.cliente.telefono,
    },
    carga,
    logistica,
    cadenaFrio,
    timeline,
    gps,
    incidencias: incidencias.map((i) => ({
      id: i.id,
      codigo: i.codigo,
      tipo: i.tipo?.nombre,
      estado: i.estado,
      fechaHora: i.fechaHora,
      descripcion: i.descripcion,
      decisionOperativa: i.decisionOperativa,
    })),
    devoluciones: devoluciones.map((dv) => ({
      id: dv.id,
      codigo: dv.codigo,
      estado: dv.estado,
      motivo: dv.motivo?.nombre,
      fechaRegistro: dv.fechaRegistro,
      fechaRecepcion: dv.fechaRecepcion,
      selloIntegro: dv.evaluacion?.selloIntegro ?? null,
      lotes: [...new Set(dv.detalles.map((d) => d.lote.codigo))],
    })),
    movimientos: movimientos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      cantidad: num(m.cantidad),
      unidad: m.unidad,
      loteId: m.loteId,
      lote: m.lote?.codigo,
      origen: m.ubicacionOrigen?.nombre || null,
      destino: m.ubicacionDestino?.nombre || null,
      fechaHora: m.fechaHora,
    })),
    responsables,
    evidencias,
  }
}

/**
 * Registro manual de temperatura (no hay sensores IoT): se asocia a una cava (ubicación),
 * a un despacho o a una devolución.
 */
async function registrarTemperatura(data, usuarioId) {
  const { tipoRegistro, ubicacionId, despachoId, devolucionId, temperaturaC, observaciones } = data

  if (!ubicacionId && !despachoId && !devolucionId) {
    throw new AppError('El registro debe asociarse a una cava, un despacho o una devolución', 400)
  }
  if (ubicacionId && !(await prisma.ubicacionAlmacen.findUnique({ where: { id: ubicacionId } }))) {
    throw new AppError('Ubicación no encontrada', 404)
  }
  if (despachoId && !(await prisma.despacho.findUnique({ where: { id: despachoId } }))) {
    throw new AppError('Despacho no encontrado', 404)
  }
  if (devolucionId && !(await prisma.devolucion.findUnique({ where: { id: devolucionId } }))) {
    throw new AppError('Devolución no encontrada', 404)
  }

  return prisma.registroTemperatura.create({
    data: {
      tipoRegistro,
      ubicacionId: ubicacionId || null,
      despachoId: despachoId || null,
      devolucionId: devolucionId || null,
      temperaturaC: Number(temperaturaC),
      metodo: 'MANUAL',
      usuarioId,
      observaciones: observaciones || null,
    },
  })
}

module.exports = {
  LIMITE_CRITICO_C,
  mapearEvento,
  buscarExpedientes,
  getExpediente,
  registrarTemperatura,
}
