import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/50 animar-overlay', className)}
    {...props}
  />
))
AlertDialogOverlay.displayName = 'AlertDialogOverlay'

const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'animar-dialogo fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-gray-200 bg-white p-6 shadow-level2 max-h-[90vh] overflow-y-auto',
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = 'AlertDialogContent'

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold text-gray-900', className)} {...props} />
))
AlertDialogTitle.displayName = 'AlertDialogTitle'

const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn('text-sm text-gray-600', className)} {...props} />
))
AlertDialogDescription.displayName = 'AlertDialogDescription'

const AlertDialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)
AlertDialogHeader.displayName = 'AlertDialogHeader'

const AlertDialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
)
AlertDialogFooter.displayName = 'AlertDialogFooter'

// Botón normal (no Radix Action): las páginas ejecutan una mutación async y cierran el
// diálogo ellas mismas al terminar con éxito; Radix Action lo cerraría antes de saber el resultado.
const AlertDialogAction = React.forwardRef(({ variant = 'primary', ...props }, ref) => (
  <Button ref={ref} variant={variant} {...props} />
))
AlertDialogAction.displayName = 'AlertDialogAction'

// asChild evita anidar <button> dentro de <button>
const AlertDialogCancel = React.forwardRef(({ variant = 'secondary', ...props }, ref) => (
  <AlertDialogPrimitive.Cancel asChild>
    <Button ref={ref} variant={variant} {...props} />
  </AlertDialogPrimitive.Cancel>
))
AlertDialogCancel.displayName = 'AlertDialogCancel'

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
