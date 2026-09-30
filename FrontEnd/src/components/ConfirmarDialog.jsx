import { useState } from 'react'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/AlertDialog'

const mensaje = (err) => err?.errors?.map((e) => e.mensaje).join(' · ') || err?.message || 'No se pudo completar la acción'

/**
 * Confirmación de una acción difícil de deshacer. `onConfirmar` puede ser async: el diálogo muestra
 * la espera, se cierra solo si termina bien y, si falla, deja el error a la vista para reintentar.
 * `children` añade el detalle de lo que va a pasar (p. ej. los lotes que salen del inventario).
 */
export function ConfirmarDialog({ titulo, descripcion, children, textoConfirmar = 'Confirmar', peligro = false, deshabilitado = false, onConfirmar, onClose }) {
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState(null)

  const confirmar = async () => {
    setError(null)
    setPendiente(true)
    try {
      await onConfirmar()
      onClose()
    } catch (err) {
      setError(mensaje(err))
    } finally {
      setPendiente(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && !pendiente && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descripcion && <AlertDialogDescription>{descripcion}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        {error && <p role="alert" className="bg-danger-light px-3 py-2 text-sm text-[#a2191f]">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Volver</AlertDialogCancel>
          <AlertDialogAction variant={peligro ? 'danger' : 'primary'} onClick={confirmar} loading={pendiente} disabled={pendiente || deshabilitado}>
            {textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
