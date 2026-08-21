import { useState, useEffect, useCallback } from 'react'

let _dispatch = null
export function toast(msg, type = 'info', duration = 4000) {
  _dispatch?.({ msg, type, duration, id: Date.now() + Math.random() })
}
toast.success = (msg, d) => toast(msg, 'success', d)
toast.error   = (msg, d) => toast(msg, 'error', d)
toast.warn    = (msg, d) => toast(msg, 'warn', d)

export default function ToastContainer() {
  const [items, setItems] = useState([])

  _dispatch = useCallback((item) => {
    setItems(prev => [...prev.slice(-4), item])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== item.id)), item.duration)
  }, [])

  if (items.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none',
    }}>
      {items.map(t => (
        <div key={t.id} style={{
          fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '.06em',
          padding: '8px 14px', maxWidth: 360,
          border: `1px solid ${BORDER[t.type]}`,
          background: BG[t.type],
          color: COLOR[t.type],
          boxShadow: `0 0 12px ${GLOW[t.type]}`,
          animation: 'toast-in .15s ease',
        }}>
          <span style={{ marginRight: 8, opacity: .7 }}>{PREFIX[t.type]}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

const PREFIX = { success: '[OK]', error: '[ERR]', warn: '[WARN]', info: '[INFO]' }
const COLOR  = { success: 'var(--granted)', error: 'var(--denied)', warn: 'var(--pending)', info: 'var(--accent)' }
const BORDER = { success: 'rgba(34,197,94,.35)', error: 'rgba(239,68,68,.35)', warn: 'rgba(245,166,35,.35)', info: 'rgba(0,200,150,.35)' }
const BG     = { success: 'rgba(34,197,94,.07)', error: 'rgba(239,68,68,.07)', warn: 'rgba(245,166,35,.07)', info: 'rgba(0,200,150,.07)' }
const GLOW   = { success: 'rgba(34,197,94,.15)', error: 'rgba(239,68,68,.15)', warn: 'rgba(245,166,35,.15)', info: 'rgba(0,200,150,.15)' }
