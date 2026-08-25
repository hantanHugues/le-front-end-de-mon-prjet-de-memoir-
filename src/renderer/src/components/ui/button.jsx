import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// Tailles en pixels explicites, pas en rem : `html` est à `font-size: 13px`,
// donc 1rem vaut 13px ici et les échelles Tailwind par défaut (`text-sm`, `h-8`)
// donnaient 11px / 26px — nettement plus petit que les boutons écrits en ligne
// dans les pages, d'où des hauteurs qui ne s'alignaient pas d'une page à l'autre.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 font-medium rounded-md border transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:opacity-35 disabled:cursor-default active:scale-[0.98] whitespace-nowrap',
  {
    variants: {
      variant: {
        default:
          'bg-accent border-border-hi text-foreground hover:bg-[#404249] hover:-translate-y-px',
        primary:
          'bg-primary border-primary text-primary-foreground hover:bg-[#4752C4] hover:-translate-y-px',
        destructive:
          'bg-[rgba(242,63,67,0.10)] border-[rgba(242,63,67,0.25)] text-denied hover:bg-[rgba(242,63,67,0.18)] hover:border-[rgba(242,63,67,0.45)]',
        outline:
          'bg-transparent border-border-hi text-muted-foreground hover:bg-accent hover:text-foreground',
        ghost:
          'bg-transparent border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
        accent:
          'bg-[rgba(88,101,242,0.12)] border-[rgba(88,101,242,0.30)] text-primary hover:bg-[rgba(88,101,242,0.20)] hover:border-[rgba(88,101,242,0.50)] hover:-translate-y-px',
        link:
          'bg-transparent border-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[32px] px-[14px] text-[13px]',
        sm:      'h-[28px] px-[10px] text-[12px]',
        lg:      'h-[38px] px-[18px] text-[14px]',
        icon:    'h-[28px] w-[28px] p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

const Button = forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
})

export { Button, buttonVariants }
