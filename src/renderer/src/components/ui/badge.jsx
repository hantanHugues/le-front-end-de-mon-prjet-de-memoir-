import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-mono text-[10px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded before:content-[""] before:w-[5px] before:h-[5px] before:rounded-full before:bg-current before:shrink-0',
  {
    variants: {
      variant: {
        default:   'text-primary',
        granted:   'text-granted',
        denied:    'text-denied',
        pending:   'text-pending',
        intruder:  'text-intruder',
        analyzing: 'text-analyzing',
        outline:   'text-muted-foreground border border-border-hi before:hidden',
        ghost:     'text-muted-foreground before:hidden',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
