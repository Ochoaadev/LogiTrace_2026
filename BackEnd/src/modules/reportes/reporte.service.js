const prisma = require("../../config/database");
const { mapearEvento } = require("../trazabilidad/expediente.service");

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
  getDashboardKPIs,
  getPedidosPorEstado,
  getTimelinePedidos,
  getTopClientes,
  getActividadReciente,
  getAlertas,
};
