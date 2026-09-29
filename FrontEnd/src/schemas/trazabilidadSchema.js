import { z } from "zod";

export const trazabilidadSearchSchema = z.object({
  tipo: z
    .enum(["LOTE", "PEDIDO", "DESPACHO", "DEVOLUCION", "INCIDENCIA"])
    .optional(),
  valor: z.string().min(1),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

export const TIPO_EVENTO_LABELS = {
  PEDIDO_CREADO: "Pedido Creado",
  PEDIDO_ACTUALIZADO: "Pedido Actualizado",
  ESTADO_PEDIDO_CAMBIADO: "Estado Pedido Cambiado",
  PEDIDO_PREPARADO: "Pedido Preparado",
  DESPACHO_CREADO: "Despacho Creado",
  DESPACHO_ASIGNADO: "Despacho Asignado",
  SALIDA_DESPACHO: "Salida Despacho",
  UBICACION_ACTUALIZADA: "Ubicación Actualizada",
  ENTREGA_REGISTRADA: "Entrega Registrada",
  INCIDENCIA_REGISTRADA: "Incidencia Registrada",
  INCIDENCIA_RESUELTA: "Incidencia Resuelta",
  DEVOLUCION_REGISTRADA: "Devolución Registrada",
  DEVOLUCION_RECIBIDA: "Devolución Recibida",
  PRODUCTO_EVALUADO: "Producto Evaluado",
  INVENTARIO_ACTUALIZADO: "Inventario Actualizado",
  RESIDUO_REGISTRADO: "Residuo Registrado",
  DEVOLUCION_CERRADA: "Devolución Cerrada",
  TRAZABILIDAD_CERRADA: "Trazabilidad Cerrada",
};

export const ENTIDAD_ICONS = {
  Pedido: "Package",
  Despacho: "Truck",
  Incidencia: "AlertTriangle",
  Devolucion: "RotateCcw",
  Inventario: "PackageCheck",
  Residuo: "Trash2",
  Lote: "Circle",
  Usuario: "User",
};

export function getTipoEventoLabel(tipo) {
  return TIPO_EVENTO_LABELS[tipo] || tipo;
}

export function getEntidadIcon(entidad) {
  return ENTIDAD_ICONS[entidad] || "HelpCircle";
}
