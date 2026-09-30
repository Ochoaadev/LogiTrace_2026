import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { createTableColumns } from '@/components/ui/tablaColumnas'
import { getEstadoResiduo } from '@/schemas/residuoSchema'
import { cn } from '@/lib/utils'
import { cantidad, fecha, fechaHora } from './formato'

// Punto de color por tipo de residuo (como en la bitácora del Figma)
const COLOR_TIPO = {
  'RES-001': 'bg-[#8a3800]',
  'RES-002': 'bg-gray-500',
  'RES-003': 'bg-[#6929c4]',
  'RES-004': 'bg-primary',
  'RES-005': 'bg-danger',
}

const esHoy = (d) => new Date(d).toDateString() === new Date().toDateString()

/** Columnas de la bitácora: N° de registro, tipo, cantidad, origen, estado y destino. */
export function columnasResiduos() {
  return createTableColumns([
    {
      accessorKey: 'codigo',
      header: 'N° reg. / fecha',
      cell: (v, row) => {
        const r = row.original
        const descarte = !!r.devolucionId
        return (
          <div>
            <span className={cn('block font-mono text-sm font-semibold whitespace-nowrap', descarte ? 'text-danger' : 'text-primary')}>#{v}</span>
            <span className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {esHoy(r.fechaGeneracion) ? `Hoy, ${new Date(r.fechaGeneracion).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}` : fecha(r.fechaGeneracion)}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'tipoResiduo',
      header: 'Tipo de residuo',
      cell: (t, row) => (
        <div className="min-w-[9rem] max-w-[13rem]">
          <p className={cn('flex items-center gap-1.5 font-semibold', row.original.devolucionId ? 'text-danger' : 'text-gray-900')}>
            <span className={cn('h-2 w-2 rounded-full flex-shrink-0', COLOR_TIPO[t?.codigo] || 'bg-gray-400')} aria-hidden="true" />
            {t?.nombre}
          </p>
          {row.original.observaciones && <p className="font-mono text-xs text-gray-600 truncate" title={row.original.observaciones}>{row.original.observaciones}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'cantidad',
      header: 'Cantidad',
      cell: (v, row) => (
        <span className={cn('font-mono text-sm font-semibold whitespace-nowrap', row.original.devolucionId ? 'text-danger' : 'text-gray-900')}>
          {cantidad(v)} {row.original.unidad}
        </span>
      ),
    },
    {
      accessorKey: 'origen',
      header: 'Origen en planta',
      cell: (v, row) => {
        const d = row.original.devolucion
        return (
          <div className="min-w-[8rem]">
            <p className="text-sm text-gray-900">{d ? `Devolución ${d.codigo}` : v || '—'}</p>
            {d?.despachoPedido?.pedido && <p className="text-xs text-danger">Pedido {d.despachoPedido.pedido.codigo} (Módulo 05)</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado / ubicación',
      cell: (v, row) => {
        const e = getEstadoResiduo(v)
        return (
          <div>
            <Badge variant={e.color}>{e.label}</Badge>
            {row.original.fechaRetiro && <p className="text-xs text-gray-600 mt-1 whitespace-nowrap">Retiro: {fechaHora(row.original.fechaRetiro)}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'gestor',
      header: 'Destino / gestor',
      cell: (g) => (
        g ? (
          <div className="min-w-[8rem]">
            <p className="text-sm text-gray-900">{g.nombre}</p>
            <p className={cn('text-xs', g.tipo === 'EXTERNO' ? 'text-success' : 'text-gray-600')}>{g.tipo === 'EXTERNO' ? 'Gestor externo autorizado' : 'Proceso interno'}</p>
          </div>
        ) : <span className="text-xs text-danger">Sin gestor asignado</span>
      ),
    },
  ])
}
