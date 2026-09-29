import { cn } from '@/lib/utils'

const TONO_ICONO = {
  default: 'bg-gray-50 text-gray-700',
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-light text-[#044317]',
  danger: 'bg-danger-light text-danger',
  warning: 'bg-warning-light text-[#684e00]',
}

const TONO_VALOR = {
  default: 'text-gray-900',
  primary: 'text-primary',
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-gray-900',
}

/**
 * Tarjeta de indicador del Figma: rótulo en mayúsculas, valor grande en mono, detalle y
 * un ícono en recuadro de color. `loading` muestra un marcador mientras llegan los datos.
 */
export function KpiCard({ label, value, detail, icon: Icon, tone = 'default', loading = false, className }) {
  return (
    <section className={cn('bg-white p-5 flex flex-col gap-3', className)} aria-label={label}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="label-caps leading-snug">{label}</h2>
        {Icon && (
          <span className={cn('h-10 w-10 flex items-center justify-center flex-shrink-0', TONO_ICONO[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-9 w-20 bg-gray-100 animate-pulse" />
      ) : (
        <p className={cn('font-mono text-[2rem] leading-none font-semibold', TONO_VALOR[tone])}>{value}</p>
      )}
      {detail && <div className="text-xs text-gray-600">{detail}</div>}
    </section>
  )
}
