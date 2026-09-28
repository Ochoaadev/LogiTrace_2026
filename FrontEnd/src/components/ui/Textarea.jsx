import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef(
  ({ className, error, disabled, 'aria-describedby': ariaDescribedby, ...props }, ref) => {
    const errorId = error ? `${props.id}-error` : undefined
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-y',
            'transition-colors duration-200',
            'hover:border-gray-400',
            'focus:border-primary focus:ring-2 focus:ring-primary-light focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100',
            error && 'border-danger focus:border-danger focus:ring-danger-light',
            className
          )}
          ref={ref}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId || ariaDescribedby}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'