import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef(
  ({ className, type, error, disabled, 'aria-describedby': ariaDescribedby, ...props }, ref) => {
    const errorId = error ? `${props.id}-error` : undefined
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            // Carbon: campo gris con solo borde inferior
            'flex h-10 w-full border-0 border-b border-gray-400 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
            'transition-colors duration-150',
            'focus:outline-2 focus:outline-offset-[-2px] focus:outline-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-danger outline-2 outline-offset-[-2px] outline-danger',
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
Input.displayName = 'Input'