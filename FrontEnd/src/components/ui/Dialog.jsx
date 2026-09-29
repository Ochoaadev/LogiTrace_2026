import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/50 animar-overlay', className)}
    {...props}
  />
))
DialogOverlay.displayName = 'DialogOverlay'

// Content siempre va dentro de Portal + Overlay; antes se exportaba el primitivo de Radix
// sin estilos, y los diálogos se renderizaban en línea dentro de la página.
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'animar-dialogo fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-gray-200 bg-white p-6 shadow-level2 max-h-[90vh] overflow-y-auto',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = 'DialogContent'

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold text-gray-900', className)} {...props} />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-gray-600', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

// Simple action/cancel buttons using Button directly
const DialogAction = ({ variant = 'primary', children, ...props }) => (
  <Button variant={variant} {...props}>{children}</Button>
)
DialogAction.displayName = 'DialogAction'

const DialogCancel = ({ variant = 'secondary', children, ...props }) => (
  <DialogPrimitive.Close asChild>
    <Button variant={variant} {...props}>{children}</Button>
  </DialogPrimitive.Close>
)
DialogCancel.displayName = 'DialogCancel'

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogAction,
  DialogCancel,
}
