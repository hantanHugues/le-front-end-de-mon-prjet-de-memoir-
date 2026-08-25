import { forwardRef } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '../../lib/utils'

const Label = forwardRef(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      // 11px et non `text-[10px]` : plancher de lisibilité du projet.
      // `block` + marge pour que le libellé se pose au-dessus de son champ.
      className={cn(
        'block mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none',
        className
      )}
      {...props}
    />
  )
})

export { Label }
