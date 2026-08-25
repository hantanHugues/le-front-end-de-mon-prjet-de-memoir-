import { cn } from '../../lib/utils'

/**
 * État vide / dégradé, commun à toutes les listes.
 *
 * Il existait six variantes divergentes (trois hauteurs fixes, deux
 * interlettrages, plusieurs opacités), toutes en `opacity: 0.4` — soit un
 * contraste d'environ 2:1. C'est pourtant l'écran que le jury voit si le
 * backend est éteint : il doit être parfaitement lisible et dire quoi faire.
 *
 * `variant="error"` sert à distinguer « le serveur ne répond pas » de
 * « il n'y a simplement rien à afficher » — les deux étaient indiscernables.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}) {
  const accent = variant === 'error' ? 'var(--denied)' : 'var(--muted-foreground)'
  const tint =
    variant === 'error' ? 'rgba(242,63,67,.10)' : 'rgba(255,255,255,.04)'
  const ring =
    variant === 'error' ? 'rgba(242,63,67,.22)' : 'var(--border-hi)'

  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center', className)}
      style={{ gap: 14, padding: '48px 32px', minHeight: 200 }}
    >
      {Icon && (
        <div
          style={{
            width: 48, height: 48, borderRadius: 12,
            background: tint, border: `1px solid ${ring}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon size={20} style={{ color: accent }} />
        </div>
      )}
      <div style={{ maxWidth: 380 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: 13, color: 'var(--muted-foreground)',
              marginTop: 6, lineHeight: 1.55,
            }}
          >
            {description}
          </div>
        )}
      </div>
      {action}
    </div>
  )
}
