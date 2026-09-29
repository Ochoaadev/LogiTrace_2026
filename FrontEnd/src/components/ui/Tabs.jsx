import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(
  ({ className, variant = 'line', ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        // En pantallas angostas la barra se desplaza en horizontal en lugar de ensanchar la página
        'flex max-w-full h-12 items-end justify-start overflow-x-auto overflow-y-hidden border-b border-gray-100 text-gray-600',
        variant === 'boxed' && 'bg-transparent p-0',
        className
      )}
      {...props}
    />
  )
)
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(
  ({ className, variant = 'line', ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap px-4 text-sm border-b-2 border-transparent -mb-px transition-colors hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium',
        variant === 'boxed' && 'border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white',
        className
      )}
      {...props}
    />
  )
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      className={cn('mt-4 focus-visible:outline-none', className)}
      {...props}
    />
  )
)
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }