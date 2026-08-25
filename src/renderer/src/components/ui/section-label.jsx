import { cn } from '../../lib/utils'

/**
 * Intitulé de section en petites capitales.
 *
 * Le motif existait en huit copies réparties dans les pages, avec trois
 * opacités différentes (0.5 / 0.55 / 0.65) et une taille de 9.5 px — sous le
 * seuil de lisibilité, et à un contraste d'environ 2,5:1.
 */
export function SectionLabel({ icon: Icon, children, className, style }) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      style={{ padding: '24px 24px 8px', ...style }}
    >
      {Icon && <Icon size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
      <span
        style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--foreground)',
        }}
      >
        {children}
      </span>
    </div>
  )
}
