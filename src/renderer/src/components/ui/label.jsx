import { forwardRef } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '../../lib/utils'

const Label = forwardRef(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none',
        className
      )}
      {...props}
    />
  )
})

export { Label }
