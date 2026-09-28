import * as React from 'react'
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
}

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

// Simple action/cancel buttons using Button directly
const DialogAction = ({ variant = 'primary', children, ...props }) => (
  <Button variant={variant} {...props}>{children}</Button>
)
DialogAction.displayName = 'DialogAction'

const DialogCancel = ({ variant = 'secondary', children, ...props }) => (
  <Button variant={variant} {...props}>{children}</Button>
)
DialogCancel.displayName = 'DialogCancel'

export { DialogHeader, DialogFooter, DialogAction, DialogCancel }