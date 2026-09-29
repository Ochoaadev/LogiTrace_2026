const prisma = require("../../config/database");
const { mapearEvento } = require("../trazabilidad/expediente.service");

async function getReportePedidos(query) {
  const { fechaDesde, fechaHasta, estado, clienteId, zonaId, prioridad } =
    query;

  const where = {};
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {};
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde);
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta);
  }
  if (estado) where.estado = estado;
  if (clienteId) where.clienteId = clienteId;
  if (zonaId) where.zonaId = zonaId;
  if (prioridad) where.prioridad = prioridad;

  const [
    totalPedidos,
    porEstado,
    porPrioridad,
    porZona,
    porCliente,
    tiempoPromedioPreparacion,
    tiempoPromedioEntrega,
  ] = await Promise.all([
    prisma.pedido.count({ where }),
    prisma.pedido.groupBy({ by: ["estado"], where, _count: { _all: true } }),
    prisma.pedido.groupBy({ by: ["prioridad"], where, _count: { _all: true } }),
    prisma.pedido.groupBy({
      by: ["zonaId"],
      where: { ...where, zonaId: { not: null } },
      _count: { _all: true },
    }),
    prisma.pedido.groupBy({
      by: ["clienteId"],
      where,
      _count: { _all: true },
      orderBy: { _count: { _all: "desc" } },
      take: 10,
    }),
    prisma.pedido.aggregate({
      where: {
        ...where,
        estado: { in: ["ENTREGADO", "CERRADO"] },
        fechaEntrega: { not: null },
      },
      _avg: { fechaEntrega: true },
    }),
    prisma.pedido.aggregate({
      where: {
        ...where,
        estado: { in: ["ENTREGADO", "CERRADO"] },
        fechaEntrega: { not: null },
      },
      _avg: { fechaHora: true },
    }),
  ]);

  const estadoLabels = {
    REGISTRADO: "Registrado",
    EN_PREPARACION: "En Preparación",
    LISTO_PARA_DESPACHO: "Listo para Despacho",
    EN_RUTA: "En Ruta",
    ENTREGADO: "Entregado",
    CON_INCIDENCIA: "Con Incidencia",
    DEVUELTO: "Devuelto",
    CERRADO: "Cerrado",
    CANCELADO: "Cancelado",
  };

  const prioridadLabels = {
    BAJA: "Baja",
    NORMAL: "Normal",
    ALTA: "Alta",
    URGENTE: "Urgente",
  };

  const zonas = await prisma.zonaDespacho.findMany({
    where: { id: { in: porZona.map((z) => z.zonaId) } },
    select: { id: true, codigo: true, nombre: true },
  });

  const clientes = await prisma.cliente.findMany({
    where: { id: { in: porCliente.map((c) => c.clienteId) } },
    select: { id: true, codigo: true, razonSocial: true },
  });

  return {
    totalPedidos,
    porEstado: porEstado.map((e) => ({
      estado: e.estado,
      label: estadoLabels[e.estado] || e.estado,
      count: e._count._all,
    })),
    porPrioridad: porPrioridad.map((p) => ({
      prioridad: p.prioridad,
      label: prioridadLabels[p.prioridad] || p.prioridad,
      count: p._count._all,
    })),
    porZona: porZona.map((z) => {
      const zona = zonas.find((zo) => zo.id === z.zonaId);
      return {
        zonaId: z.zonaId,
        zonaNombre: zona?.nombre || z.zonaId,
        count: z._count._all,
      };
    }),
    topClientes: porCliente.map((c) => {
      const cliente = clientes.find((cl) => cl.id === c.clienteId);
      return {
        clienteId: c.clienteId,
        clienteNombre: cliente?.razonSocial || c.clienteId,
        count: c._count._all,
      };
    }),
    tiempoPromedioPreparacion: tiempoPromedioPreparacion._avg.fechaEntrega
      ? "Calculado"
      : "N/A",
    tiempoPromedioEntrega: tiempoPromedioEntrega._avg.fechaHora
      ? "Calculado"
      : "N/A",
  };
}

async function getReporteDespachos(query) {
  const { fechaDesde, fechaHasta, estado, repartidorId, vehiculoId, rutaId } =
    query;

  const where = {};
  if (fechaDesde || fechaHasta) {
    where.fechaHoraSalida = {};
    if (fechaDesde) where.fechaHoraSalida.gte = new Date(fechaDesde);
    if (fechaHasta) where.fechaHoraSalida.lte = new Date(fechaHasta);
  }
  if (estado) where.estado = estado;
  if (repartidorId) where.repartidorId = repartidorId;
  if (vehiculoId) where.vehiculoId = vehiculoId;
  if (rutaId) where.rutaId = rutaId;

  const [
    totalDespachos,
    porEstado,
    porRepartidor,
    porVehiculo,
    porRuta,
    distanciaTotal,
    tiempoPromedioRuta,
  ] = await Promise.all([
    prisma.despacho.count({ where }),
    prisma.despacho.groupBy({ by: ["estado"], where, _count: { _all: true } }),
    prisma.despacho.groupBy({
      by: ["repartidorId"],
      where: { ...where, repartidorId: { not: null } },
      _count: { _all: true },
    }),
    prisma.despacho.groupBy({
      by: ["vehiculoId"],
      where: { ...where, vehiculoId: { not: null } },
      _count: { _all: true },
    }),
    prisma.despacho.groupBy({
      by: ["rutaId"],
      where: { ...where, rutaId: { not: null } },
      _count: { _all: true },
    }),
    prisma.despacho.aggregate({
      where: { ...where, estado: "FINALIZADO" },
      _sum: {},
    }),
    prisma.despacho.aggregate({
      where: {
        ...where,
        estado: "FINALIZADO",
        fechaHoraSalida: { not: null },
        fechaHoraCierre: { not: null },
      },
      _avg: { fechaHoraCierre: true },
    }),
  ]);

  const estadoLabels = {
    PROGRAMADO: "Programado",
    PREPARANDO: "Preparando",
    EN_RUTA: "En Ruta",
    CON_INCIDENCIA: "Con Incidencia",
    FINALIZADO: "Finalizado",
    CANCELADO: "Cancelado",
  };

  const repartidores = await prisma.repartidor.findMany({
    where: {
      id: { in: porRepartidor.map((r) => r.repartidorId).filter(Boolean) },
    },
    include: { usuario: { select: { id: true, nombre: true, codigo: true } } },
  });

  const vehiculos = await prisma.vehiculo.findMany({
    where: { id: { in: porVehiculo.map((v) => v.vehiculoId).filter(Boolean) } },
    select: { id: true, codigo: true, placa: true, tipo: true },
  });

  const rutas = await prisma.ruta.findMany({
    where: { id: { in: porRuta.map((r) => r.rutaId).filter(Boolean) } },
    select: { id: true, codigo: true, nombre: true },
  });

  return {
    totalDespachos,
    porEstado: porEstado.map((e) => ({
      estado: e.estado,
      label: estadoLabels[e.estado] || e.estado,
      count: e._count._all,
    })),
    porRepartidor: porRepartidor.map((r) => ({
      repartidorId: r.repartidorId,
      repartidorNombre:
        repartidores.find((rp) => rp.id === r.repartidorId)?.usuario?.nombre ||
        r.repartidorId,
      count: r._count._all,
    })),
    porVehiculo: porVehiculo.map((v) => ({
      vehiculoId: v.vehiculoId,
      vehiculoNombre:
        vehiculos.find((vh) => vh.id === v.vehiculoId)?.placa || v.vehiculoId,
      count: v._count._all,
    })),
    porRuta: porRuta.map((r) => ({
      rutaId: r.rutaId,
      rutaNombre: rutas.find((rt) => rt.id === r.rutaId)?.nombre || r.rutaId,
      count: r._count._all,
    })),
  };
}

async function getReporteIncidencias(query) {
  const { fechaDesde, fechaHasta, estado, tipoIncidenciaId, despachoPedidoId } =
    query;

  const where = {};
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {};
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde);
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta);
  }
  if (estado) where.estado = estado;
  if (tipoIncidenciaId) where.tipoIncidenciaId = tipoIncidenciaId;
  if (despachoPedidoId) where.despachoPedidoId = despachoPedidoId;

  const [
    totalIncidencias,
    porEstado,
    porTipo,
    tiempoPromedioResolucion,
    incidenciasAbiertas,
  ] = await Promise.all([
    prisma.incidencia.count({ where }),
    prisma.incidencia.groupBy({
      by: ["estado"],
      where,
      _count: { _all: true },
    }),
    prisma.incidencia.groupBy({
      by: ["tipoIncidenciaId"],
      where,
      _count: { _all: true },
    }),
    prisma.incidencia.aggregate({
      where: {
        ...where,
        estado: { in: ["RESUELTA", "CERRADA"] },
        fechaResolucion: { not: null },
      },
      _avg: { fechaResolucion: true },
    }),
    prisma.incidencia.count({
      where: { ...where, estado: { in: ["REPORTADA", "EN_REVISION", "EN_ATENCION"] } },
    }),
  ]);

  const estadoLabels = {
    REPORTADA: "Reportada",
    EN_REVISION: "En Revisión",
    EN_ATENCION: "En Atención",
    RESUELTA: "Resuelta",
    CERRADA: "Cerrada",
    CANCELADA: "Cancelada",
  };

  const tipos = await prisma.tipoIncidencia.findMany({
    where: { id: { in: porTipo.map((t) => t.tipoIncidenciaId) } },
    select: { id: true, codigo: true, nombre: true },
  });

  return {
    totalIncidencias,
    incidenciasAbiertas,
    porEstado: porEstado.map((e) => ({
      estado: e.estado,
      label: estadoLabels[e.estado] || e.estado,
      count: e._count._all,
    })),
    porTipo: porTipo.map((t) => {
      const tipo = tipos.find((tp) => tp.id === t.tipoIncidenciaId);
      return {
        tipoId: t.tipoIncidenciaId,
        tipoNombre: tipo?.nombre || t.tipoIncidenciaId,
        count: t._count._all,
      };
    }),
    tiempoPromedioResolucion: "Calculado en horas",
  };
}

async function getReporteDevoluciones(query) {
  const { fechaDesde, fechaHasta, estado, motivoId, despachoPedidoId } = query;

  const where = {};
  if (fechaDesde || fechaHasta) {
    where.fechaRegistro = {};
    if (fechaDesde) where.fechaRegistro.gte = new Date(fechaDesde);
    if (fechaHasta) where.fechaRegistro.lte = new Date(fechaHasta);
  }
  if (estado) where.estado = estado;
  if (motivoId) where.motivoId = motivoId;
  if (despachoPedidoId) where.despachoPedidoId = despachoPedidoId;

  const [
    totalDevoluciones,
    porEstado,
    porMotivo,
    porDecision,
    valorTotalPerdido,
  ] = await Promise.all([
    prisma.devolucion.count({ where }),
    prisma.devolucion.groupBy({
      by: ["estado"],
      where,
      _count: { _all: true },
    }),
    prisma.devolucion.groupBy({
      by: ["motivoId"],
      where,
      _count: { _all: true },
    }),
    prisma.detalleDevolucion.groupBy({
      by: ["decision"],
      where: { decision: { not: null } },
      _count: { _all: true },
    }),
    prisma.devolucion.aggregate({ where, _sum: {} }),
  ]);

  const estadoLabels = {
    SOLICITADA: "Solicitada",
    EN_TRASLADO: "En Traslado",
    RECIBIDA: "Recibida",
    EVALUADA: "Evaluada",
    CERRADA: "Cerrada",
    CANCELADA: "Cancelada",
  };

  const motivos = await prisma.motivoDevolucion.findMany({
    where: { id: { in: porMotivo.map((m) => m.motivoId) } },
    select: { id: true, codigo: true, nombre: true },
  });

  const decisionLabels = {
    REINGRESO: "Reingreso a Inventario",
    CUARENTENA: "Cuarentena",
    DESCARTE: "Descarte",
  };

  return {
    totalDevoluciones,
    porEstado: porEstado.map((e) => ({
      estado: e.estado,
      label: estadoLabels[e.estado] || e.estado,
      count: e._count._all,
    })),
    porMotivo: porMotivo.map((m) => {
      const motivo = motivos.find((mo) => mo.id === m.motivoId);
      return {
        motivoId: m.motivoId,
        motivoNombre: motivo?.nombre || m.motivoId,
        count: m._count._all,
      };
    }),
    porDecision: porDecision.map((d) => ({
      decision: d.decision,
      label: decisionLabels[d.decision] || d.decision,
      count: d._count._all,
    })),
    valorTotalPerdido: 0,
  };
}

async function getReporteInventario(query) {
  const { fechaDesde, fechaHasta, ubicacionId, stockBajoQuery } = query;

  const where = {};
  if (fechaDesde || fechaHasta) {
    where.updatedAt = {};
    if (fechaDesde) where.updatedAt.gte = new Date(fechaDesde);
    if (fechaHasta) where.updatedAt.lte = new Date(fechaHasta);
  }
  if (ubicacionId) where.ubicacionId = ubicacionId;
  if (stockBajoQuery === "true")
    where.stockActual = { lte: prisma.inventario.fields.stockMinimo };

  const [
    totalItems,
    totalStock,
    stockBajoCount,
    porUbicacion,
    porProducto,
    movimientosPeriodo,
  ] = await Promise.all([
    prisma.inventario.count({ where }),
    prisma.inventario.aggregate({ where, _sum: { stockActual: true } }),
    prisma.inventario.count({
      where: {
        ...where,
        stockActual: { lte: prisma.inventario.fields.stockMinimo },
      },
    }),
    prisma.inventario.groupBy({
      by: ["ubicacionId"],
      where,
      _sum: { stockActual: true },
      _count: { _all: true },
    }),
    prisma.inventario.groupBy({
      by: ["loteId"],
      where,
      _sum: { stockActual: true },
      _count: { _all: true },
    }),
    prisma.movimientoInventario.count({
      where: {
        fechaHora: {
          gte: fechaDesde
            ? new Date(fechaDesde)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: fechaHasta ? new Date(fechaHasta) : new Date(),
        },
      },
    }),
  ]);

  const ubicaciones = await prisma.ubicacionAlmacen.findMany({
    where: { id: { in: porUbicacion.map((u) => u.ubicacionId) } },
    select: { id: true, codigo: true, nombre: true, tipo: true },
    ç,
  });

  return {
    totalItems,
    totalStock: totalStock._sum.stockActual || 0,
    stockBajo: stockBajoCount,
    movimientosPeriodo,
    porUbicacion: porUbicacion.map((u) => {
      const ubicacion = ubicaciones.find((ub) => ub.id === u.ubicacionId);
      return {
        ubicacionId: u.ubicacionId,
        ubicacionNombre: ubicacion?.nombre || u.ubicacionId,
        totalStock: u._sum.stockActual || 0,
        totalItems: u._count._all,
      };
    }),
  };
}

async function getReporteRendimiento(query) {
  const { fechaDesde, fechaHasta, repartidorId, vehiculoId } = query;

  const where = {};
  if (fechaDesde || fechaHasta) {
    where.fechaHoraSalida = {};
    if (fechaDesde) where.fechaHoraSalida.gte = new Date(fechaDesde);
    if (fechaHasta) where.fechaHoraSalida.lte = new Date(fechaHasta);
  }
  if (repartidorId) where.repartidorId = repartidorId;
  if (vehiculoId) where.vehiculoId = vehiculoId;

  const [
    totalDespachos,
    despachosFinalizados,
    despachosConIncidencias,
    tiempoPromedioEntrega,
    pedidosPorRepartidor,
    eficienciaEntrega,
  ] = await Promise.all([
    prisma.despacho.count({ where }),
    prisma.despacho.count({ where: { ...where, estado: "FINALIZADO" } }),
    prisma.despacho.count({ where: { ...where, estado: "CON_INCIDENCIA" } }),
    prisma.despacho.aggregate({
      where: {
        ...where,
        estado: "FINALIZADO",
        fechaHoraSalida: { not: null },
        fechaHoraCierre: { not: null },
      },
      _avg: { fechaHoraCierre: true },
    }),
    prisma.despacho.groupBy({
      by: ["repartidorId"],
      where: { ...where, repartidorId: { not: null }, estado: "FINALIZADO" },
      _count: { _all: true },
    }),
    prisma.despacho.count({ where: { ...where, estado: "FINALIZADO" } }),
  ]);

  const repartidores = await prisma.repartidor.findMany({
    where: {
      id: {
        in: pedidosPorRepartidor.map((p) => p.repartidorId).filter(Boolean),
      },
    },
    include: { usuario: { select: { id: true, nombre: true, codigo: true } } },
  });

  const tasaExito =
    totalDespachos > 0
      ? ((despachosFinalizados / totalDespachos) * 100).toFixed(2)
      : 0;
  const tasaIncidencias =
    totalDespachos > 0
      ? ((despachosConIncidencias / totalDespachos) * 100).toFixed(2)
      : 0;

  return {
    totalDespachos,
    despachosFinalizados,
    despachosConIncidencias,
    tasaExito: `${tasaExito}%`,
    tasaIncidencias: `${tasaIncidencias}%`,
    tiempoPromedioEntrega: "Calculado",
    porRepartidor: pedidosPorRepartidor.map((p) => ({
      repartidorId: p.repartidorId,
      repartidorNombre:
        repartidores.find((r) => r.id === p.repartidorId)?.usuario?.nombre ||
        p.repartidorId,
      totalEntregas: p._count._all,
    })),
  };
}

async function getDashboardKPIs(query) {
  const { fechaDesde, fechaHasta } = query;

  const where = {};
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {};
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde);
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta);
  }

  const [
    pedidosActivos,
    pedidosHoy,
    despachosEnRuta,
    incidenciasAbiertas,
    devolucionesPendientes,
    stockBajo,
    repartidoresDisponibles,
    vehiculosDisponibles,
    ultimosPedidos,
    ultimosDespachos,
  ] = await Promise.all([
    prisma.pedido.count({
      where: {
        ...where,
        estado: {
          in: [
            "REGISTRADO",
            "EN_PREPARACION",
            "LISTO_PARA_DESPACHO",
            "EN_RUTA",
          ],
        },
      },
    }),
    prisma.pedido.count({
      where: {
        ...where,
        fechaHora: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    // El filtro de fechas (where.fechaHora) solo aplica a pedidos: Despacho y Devolucion
    // no tienen campo fechaHora y Prisma rechazaría la consulta.
    prisma.despacho.count({ where: { estado: "EN_RUTA" } }),
    prisma.incidencia.count({
      where: { estado: { in: ["REPORTADA", "EN_REVISION", "EN_ATENCION"] } },
    }),
    prisma.devolucion.count({
      where: {
        estado: { in: ["SOLICITADA", "EN_TRASLADO", "RECIBIDA", "EVALUADA"] },
      },
    }),
    prisma.inventario.count({
      where: { stockActual: { lte: prisma.inventario.fields.stockMinimo } },
    }),
    prisma.repartidor.count({ where: { estado: "DISPONIBLE" } }),
    prisma.vehiculo.count({ where: { activo: true } }),
    prisma.pedido.findMany({
      where,
      take: 5,
      orderBy: { fechaHora: "desc" },
      include: { cliente: { select: { razonSocial: true } } },
    }),
    prisma.despacho.findMany({
      take: 5,
      orderBy: { fechaHoraSalida: "desc" },
      include: {
        repartidor: { include: { usuario: { select: { nombre: true } } } },
      },
    }),
  ]);

  return {
    pedidosActivos,
    pedidosHoy,
    despachosEnRuta,
    incidenciasAbiertas,
    devolucionesPendientes,
    stockBajo,
    repartidoresDisponibles,
    vehiculosDisponibles,
    ultimosPedidos: ultimosPedidos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      cliente: p.cliente?.razonSocial,
      estado: p.estado,
      fechaHora: p.fechaHora,
    })),
    ultimosDespachos: ultimosDespachos.map((d) => ({
      id: d.id,
      codigo: d.codigo,
      repartidor: d.repartidor?.usuario?.nombre,
      estado: d.estado,
      fechaHoraSalida: d.fechaHoraSalida,
    })),
  };
}

// ============================================================
// Dashboard: series y listas para los paneles del inicio
// ============================================================

async function getPedidosPorEstado() {
  const grupos = await prisma.pedido.groupBy({
    by: ["estado"],
    _count: { _all: true },
  });
  return grupos.map((g) => ({ estado: g.estado, count: g._count._all }));
}

// Devuelve un punto por día (incluidos los días sin pedidos) para que la gráfica no tenga huecos.
async function getTimelinePedidos({ dias = 30 } = {}) {
  const numDias = Math.min(Math.max(parseInt(dias, 10) || 30, 1), 365);
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - (numDias - 1));

  const pedidos = await prisma.pedido.findMany({
    where: { fechaHora: { gte: desde } },
    select: { fechaHora: true },
  });

  const toKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const conteo = new Map();
  for (let i = 0; i < numDias; i++) {
    const d = new Date(desde);
    d.setDate(desde.getDate() + i);
    conteo.set(toKey(d), 0);
  }
  for (const p of pedidos) {
    const key = toKey(p.fechaHora);
    if (conteo.has(key)) conteo.set(key, conteo.get(key) + 1);
  }

  return [...conteo].map(([fecha, count]) => ({ fecha, count }));
}

async function getTopClientes({ limit = 5 } = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 50);
  const grupos = await prisma.pedido.groupBy({
    by: ["clienteId"],
    where: { estado: { not: "CANCELADO" } },
    _count: { _all: true },
    orderBy: { _count: { clienteId: "desc" } },
    take,
  });

  const clientes = await prisma.cliente.findMany({
    where: { id: { in: grupos.map((g) => g.clienteId) } },
    select: { id: true, razonSocial: true },
  });
  const nombres = new Map(clientes.map((c) => [c.id, c.razonSocial]));

  return grupos.map((g) => ({
    clienteId: g.clienteId,
    clienteNombre: nombres.get(g.clienteId) || "—",
    count: g._count._all,
  }));
}

async function getActividadReciente({ limit = 10 } = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const eventos = await prisma.eventoTrazabilidad.findMany({
    take,
    orderBy: { fechaHora: "desc" },
    include: {
      usuario: { select: { nombre: true, rol: true } },
      pedido: { select: { codigo: true } },
    },
  });

  // Mismo formato que la línea temporal de trazabilidad (título, módulo, categoría) + campos previos
  return eventos.map((e) => ({
    ...mapearEvento(e),
    tipo: e.entidadTipo.toUpperCase(),
    descripcion:
      e.descripcion ||
      `${e.entidadTipo}: ${e.estadoAnterior || "—"} → ${e.estadoNuevo || "—"}`,
    fecha: e.fechaHora,
    pedido: e.pedido?.codigo || null,
  }));
}

const DIAS_ALERTA_VENCIMIENTO = 7;

async function getAlertas() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limiteVencimiento = new Date(hoy);
  limiteVencimiento.setDate(hoy.getDate() + DIAS_ALERTA_VENCIMIENTO);

  const [stockBajo, lotesPorVencer, incidenciasReportadas] = await Promise.all([
    prisma.inventario.findMany({
      where: { stockActual: { lte: prisma.inventario.fields.stockMinimo } },
      take: 10,
      include: {
        lote: { include: { producto: { select: { nombre: true, unidadBase: true } } } },
        ubicacion: { select: { nombre: true } },
      },
    }),
    prisma.lote.findMany({
      where: {
        fechaVencimiento: { lte: limiteVencimiento },
        estadoCalidad: "DISPONIBLE",
        inventarios: { some: { stockActual: { gt: 0 } } },
      },
      take: 10,
      orderBy: { fechaVencimiento: "asc" },
      include: { producto: { select: { nombre: true } } },
    }),
    prisma.incidencia.count({ where: { estado: "REPORTADA" } }),
  ]);

  const alertas = [];

  for (const lote of lotesPorVencer) {
    const vencido = lote.fechaVencimiento < hoy;
    alertas.push({
      id: `vencimiento-${lote.id}`,
      tipo: "VENCIMIENTO",
      severity: vencido ? "critical" : "warning",
      title: vencido ? `Lote vencido: ${lote.codigo}` : `Lote por vencer: ${lote.codigo}`,
      message: `${lote.producto?.nombre || "Producto"} · vence ${lote.fechaVencimiento.toISOString().slice(0, 10)}`,
    });
  }

  for (const inv of stockBajo) {
    alertas.push({
      id: `stock-${inv.id}`,
      tipo: "STOCK_BAJO",
      severity: Number(inv.stockActual) <= 0 ? "critical" : "warning",
      title: `Stock bajo: ${inv.lote?.producto?.nombre || "Producto"}`,
      message: `${inv.stockActual} ${inv.lote?.producto?.unidadBase || ""} en ${inv.ubicacion?.nombre || "ubicación"} (mínimo ${inv.stockMinimo})`,
    });
  }

  if (incidenciasReportadas > 0) {
    alertas.push({
      id: "incidencias-reportadas",
      tipo: "INCIDENCIAS",
      severity: "info",
      title: `${incidenciasReportadas} incidencia(s) sin revisar`,
      message: "Reportadas y pendientes de pasar a revisión",
    });
  }

  const orden = { critical: 0, warning: 1, info: 2 };
  return alertas.sort((a, b) => orden[a.severity] - orden[b.severity]);
}

module.exports = {
  getReportePedidos,
  getReporteDespachos,
  getReporteIncidencias,
  getReporteDevoluciones,
  getReporteInventario,
  getReporteRendimiento,
  getDashboardKPIs,
  getPedidosPorEstado,
  getTimelinePedidos,
  getTopClientes,
  getActividadReciente,
  getAlertas,
};
