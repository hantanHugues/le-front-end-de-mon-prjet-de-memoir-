import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Table = forwardRef(function Table({ className, ...props }, ref) {
  return (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn('w-full caption-bottom border-collapse', className)} {...props} />
    </div>
  )
})

const TableHeader = forwardRef(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
})

const TableBody = forwardRef(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
})

// Pas de `cursor-pointer` par défaut : une ligne n'est cliquable que si la page
// lui donne un handler. L'ajouter systématiquement promettait une interaction
// qui n'existe pas.
const TableRow = forwardRef(function TableRow({ className, ...props }, ref) {
  return (
    <tr
      ref={ref}
      className={cn('border-b border-border transition-colors hover:bg-white/[0.03]', className)}
      {...props}
    />
  )
})

// Tailles en pixels : `html` étant à 13px, les échelles rem de Tailwind
// rendaient les en-têtes à 10px — sous le plancher de lisibilité.
const TableHead = forwardRef(function TableHead({ className, ...props }, ref) {
  return (
    <th
      ref={ref}
      className={cn(
        'h-[38px] px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background whitespace-nowrap',
        className
      )}
      {...props}
    />
  )
})

const TableCell = forwardRef(function TableCell({ className, ...props }, ref) {
  return (
    <td
      ref={ref}
      className={cn('px-4 py-2.5 align-middle text-[13px]', className)}
      {...props}
    />
  )
})

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
