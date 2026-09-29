import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const Label = React.forwardRef(
  ({ className, required, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-xs font-medium tracking-[0.04em] leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
    </LabelPrimitive.Root>
  )
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }