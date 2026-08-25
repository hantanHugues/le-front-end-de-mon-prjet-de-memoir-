import { cn } from '../../lib/utils'

/**
 * Barre de titre commune à toutes les pages.
 *
 * Ce bloc était recopié à l'identique dans les six pages : même hauteur, même
 * gouttière, même typographie, mais six sources indépendantes. La moindre
 * retouche devait donc être répétée six fois — et les hauteurs de boutons
 * finissaient par diverger d'une page à l'autre.
 *
 *   <PageHeader title="Journal d'accès" subtitle="64 événements">
 *     <Button>…</Button>
 *   </PageHeader>
 */
export function PageHeader({ title, subtitle, children, className }) {
  return (
    <header
      className={cn('flex items-center justify-between gap-4 shrink-0', className)}
      style={{
        height: 56,
        padding: '0 24px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
    </header>
  )
}
