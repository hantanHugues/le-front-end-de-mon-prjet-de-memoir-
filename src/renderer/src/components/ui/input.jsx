import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input({ className, type, ...props }, ref) {
  return (
    <input
      type={type}
      ref={ref}
      // Tailles en pixels : la racine est à 13px, donc `h-8`/`text-sm`
      // rendaient un champ de 26px avec du texte à 11px.
      className={cn(
        'flex h-[34px] w-full rounded-md border border-border-hi bg-secondary px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-40 disabled:cursor-default',
        className
      )}
      {...props}
    />
  )
})

export { Input }
