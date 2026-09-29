import { Moon, Sun } from 'lucide-react'
import { useTema } from '@/lib/tema'
import { cn } from '@/lib/utils'

/** Botón de modo claro / oscuro (el ícono gira al cambiar). */
export function TemaToggle({ className }) {
  const { oscuro, alternar } = useTema()
  const Icono = oscuro ? Sun : Moon
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={oscuro}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
      className={cn('h-10 w-10 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors', className)}
    >
      <Icono key={oscuro ? 'sol' : 'luna'} className="h-5 w-5 animar-icono" aria-hidden="true" />
    </button>
  )
}
