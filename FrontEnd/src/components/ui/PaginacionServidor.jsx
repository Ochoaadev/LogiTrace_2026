import { cn } from '@/lib/utils'

/**
 * Paginación de listas paginadas en el backend (respuesta con { total, page, limit, totalPages }).
 * Diseño del Figma: "Mostrando X de Y …" a la izquierda y Anterior · 1 2 3 · Siguiente a la derecha.
 */
export function PaginacionServidor({ pagination, onPageChange, etiqueta = 'registros', className }) {
  if (!pagination) return null
  const { page, limit, total, totalPages } = pagination
  const desde = total === 0 ? 0 : (page - 1) * limit + 1
  const hasta = Math.min(page * limit, total)

  // Máximo 5 números alrededor de la página actual
  const inicio = Math.max(1, Math.min(page - 2, totalPages - 4))
  const paginas = Array.from({ length: Math.min(5, totalPages) }, (_, i) => inicio + i).filter((p) => p >= 1 && p <= totalPages)

  const boton = 'h-9 min-w-9 px-3 text-sm bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-gray-50'

  return (
    <nav className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white', className)} aria-label="Paginación">
      <p className="text-sm text-gray-700">
        Mostrando {desde}–{hasta} de {total} {etiqueta}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className={boton} onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Anterior</button>
          {/* En celular no caben los números: se muestra la página actual */}
          <span className="sm:hidden px-2 font-mono text-sm text-gray-700" aria-live="polite">{page} / {totalPages}</span>
          {paginas.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(boton, 'hidden sm:inline-block font-mono', p === page && 'bg-primary text-white hover:bg-primary')}
            >
              {p}
            </button>
          ))}
          <button type="button" className={boton} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Siguiente</button>
        </div>
      )}
    </nav>
  )
}
