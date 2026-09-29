import { cn } from '@/lib/utils'

/**
 * Cabecera de módulo del Figma: etiqueta "MÓDULO 0X", sección, título, descripción y acciones.
 *
 * @param {string} modulo       número de módulo ("07")
 * @param {string} seccion      texto junto a la etiqueta ("Auditoría operativa y seguimiento histórico")
 * @param {React.ReactNode} tags etiquetas extra (p. ej. "Modo demostración")
 * @param {React.ReactNode} actions botones/indicadores a la derecha
 */
export function PageHeader({ modulo, seccion, title, description, tags, actions, children, className }) {
  return (
    <section className={cn('bg-white p-6 mb-6', className)}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="min-w-0 flex-1">
          {(modulo || seccion || tags) && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {modulo && (
                <span className="font-mono text-xs font-semibold tracking-wider bg-primary text-white px-2 py-1">
                  MÓDULO {modulo}
                </span>
              )}
              {seccion && (
                <span className="text-xs font-medium tracking-[0.08em] uppercase text-gray-600">{seccion}</span>
              )}
              {tags}
            </div>
          )}
          <h1 className="text-[1.75rem] leading-tight font-semibold text-gray-900">{title}</h1>
          {description && <p className="mt-2 text-sm text-gray-600 max-w-3xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3 lg:justify-end">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

// Etiqueta secundaria de la cabecera (fondo gris, verde "demo", etc.)
export function PageTag({ variant = 'default', children }) {
  return (
    <span
      className={cn(
        'text-xs px-2 py-1',
        variant === 'default' && 'bg-gray-100 text-gray-700',
        variant === 'success' && 'bg-success-light text-[#044317]',
        variant === 'info' && 'bg-primary-light text-[#002d9c]'
      )}
    >
      {children}
    </span>
  )
}
