import { cn } from '@/lib/utils'

// Piezas comunes de las pantallas de módulo del Figma.

/** Pestaña de vista dentro de la cabecera de módulo (línea azul inferior cuando está activa). */
export function Pestana({ activa, onClick, icon: Icon, contador, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        'inline-flex items-center gap-2 h-12 px-4 text-sm border-b-2 -mb-px transition-colors',
        activa ? 'border-primary text-primary font-medium' : 'border-transparent text-gray-700 hover:text-gray-900'
      )}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
      {contador !== undefined && (
        <span className={cn('font-mono text-xs px-1.5', activa ? 'bg-primary-light text-[#002d9c]' : 'bg-gray-100 text-gray-700')}>{contador}</span>
      )}
    </button>
  )
}

/** Fila de pestañas pegada al borde inferior de la cabecera de módulo. */
export function Pestanas({ children, etiqueta }) {
  return (
    <div className="mt-6 -mb-6 flex flex-wrap border-b border-gray-100" role="group" aria-label={etiqueta}>
      {children}
    </div>
  )
}

/** Panel blanco con título en mayúsculas y un elemento opcional a la derecha. */
export function Panel({ titulo, extra, icon: Icon, children, className }) {
  return (
    <section className={cn('bg-white p-6', className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2 label-caps text-gray-900">
          {Icon && <Icon className="h-5 w-5 text-primary" aria-hidden="true" />}
          {titulo}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  )
}
