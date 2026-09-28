import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-success-light text-success',
        warning: 'bg-warning-light text-warning',
        danger: 'bg-danger-light text-danger',
        info: 'bg-info-light text-info',
        outline: 'border border-gray-300 bg-transparent text-gray-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export const Badge = React.forwardRef(({ className, variant, size, children, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(badgeVariants({ variant, size, className }))}
    {...props}
  >
    {children}
  </span>
))
Badge.displayName = 'Badge'

export { badgeVariants }