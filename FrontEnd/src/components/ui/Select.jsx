import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(
  ({ className, children, disabled, error, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex h-10 w-full items-center justify-between border-0 border-b border-gray-400 bg-gray-50 px-3 py-2 text-sm text-gray-900',
        'transition-colors duration-150',
        'focus:outline-2 focus:outline-offset-[-2px] focus:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-danger outline-2 outline-offset-[-2px] outline-danger',
        // min-w-0 + truncate: un texto largo se recorta con "…" en lugar de ensanchar el formulario
        'min-w-0 [&>span]:min-w-0 [&>span]:truncate [&>span]:text-left',
        className
      )}
      disabled={disabled}
      aria-invalid={error ? 'true' : 'false'}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="ml-2 h-4 w-4 text-gray-400 shrink-0">
        <ChevronDown />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
)
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollUpButton
      ref={ref}
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  )
)
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  )
)
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(
  ({ className, children, position = 'popper', sideOffset = 4, ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-level2',
          position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=left]:translate-x-1 data-[side=right]:-translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
)
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Label
      ref={ref}
      className={cn('py-1.5 pl-3 text-sm font-medium text-gray-500', className)}
      {...props}
    />
  )
)
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(
  ({ className, children, disabled, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-3 pr-8 text-sm outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'data-[highlighted]:bg-primary data-[highlighted]:text-white',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      disabled={disabled}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-current" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
)
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-gray-100', className)}
      {...props}
    />
  )
)
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}