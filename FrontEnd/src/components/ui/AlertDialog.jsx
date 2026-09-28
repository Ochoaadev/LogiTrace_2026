import * as React from 'react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@radix-ui/react-alert-dialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const AlertDialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)
AlertDialogHeader.displayName = 'AlertDialogHeader'

const AlertDialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
AlertDialogFooter.displayName = 'AlertDialogFooter'

const CustomAlertDialogAction = React.forwardRef(({ variant = 'primary', ...props }, ref) => (
  <AlertDialogAction ref={ref} {...props}>
    <Button variant={variant} {...props} />
  </AlertDialogAction>
))
CustomAlertDialogAction.displayName = 'AlertDialogAction'

const CustomAlertDialogCancel = React.forwardRef(({ variant = 'secondary', ...props }, ref) => (
  <AlertDialogCancel ref={ref} {...props}>
    <Button variant={variant} {...props} />
  </AlertDialogCancel>
))
CustomAlertDialogCancel.displayName = 'AlertDialogCancel'

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
  CustomAlertDialogAction as AlertDialogAction,
  CustomAlertDialogCancel as AlertDialogCancel,
}