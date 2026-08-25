import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input({ className, type, ...props }, ref) {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-8 w-full rounded-md border border-border-hi bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-40 disabled:cursor-default',
        className
      )}
      {...props}
    />
  )
})

export { Input }
