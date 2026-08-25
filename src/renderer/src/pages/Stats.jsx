import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, XCircle, ShieldAlert, Target } from 'lucide-react'
import { getLogs } from '../api/client'
import { EVENT_TYPES } from '../constants/events'
import { Skeleton } from '../components/ui/skeleton'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'

/* ── Canvas bar chart ──────────────────────────────────────────────── */
function BarChart({ data }) {
  const canvasRef = useRef()
  const wrapRef   = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap || !data.length) return
    const W = wrap.clientWidth
    const H = wrap.clientHeight
    if (W <= 0 || H <= 0) return
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    const maxV = Math.max(...data.map(d => d.ok + d.ko), 1)
    const pL = 36, pR = 16, pT = 28, pB = 32
    const cW = W - pL - pR
    const cH = H - pT - pB
    const bw = cW / data.length

    ctx.clearRect(0, 0, W, H)

    // grid lines
    for (let i = 0; i <= 4; i++) {
      const gy = pT + (cH / 4) * i
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pL, gy); ctx.lineTo(W - pR, gy); ctx.stroke()
      const label = Math.round(maxV * (1 - i / 4))
      ctx.fillStyle = 'rgba(148,155,164,0.6)'
      ctx.font = '9px Cascadia Code, Consolas, monospace'; ctx.textAlign = 'right'
      ctx.fillText(label, pL - 6, gy + 3.5)
    }

    // bars
    data.forEach((d, i) => {
      const x  = pL + bw * i + bw * 0.15
      const bW = bw * 0.70
      const okH = (d.ok / maxV) * cH
      const koH = (d.ko / maxV) * cH
      const base = pT + cH

      // ok bar (granted, bottom segment)
      if (okH > 0) {
        // fill
        const gOk = ctx.createLinearGradient(0, base - okH, 0, base)
        gOk.addColorStop(0, 'rgba(35,165,90,0.40)')
        gOk.addColorStop(1, 'rgba(35,165,90,0.12)')
        ctx.fillStyle = gOk
        ctx.fillRect(x, base - okH, bW, okH)
        // top line
        ctx.fillStyle = '#23A55A'
        ctx.fillRect(x, base - okH, bW, 2)
      }

      // ko bar (denied, stacked on top)
      if (koH > 0) {
        const top = base - okH - koH - (okH > 0 ? 2 : 0)
        const gKo = ctx.createLinearGradient(0, top, 0, top + koH)
        gKo.addColorStop(0, 'rgba(242,63,67,0.60)')
        gKo.addColorStop(1, 'rgba(242,63,67,0.20)')
        ctx.fillStyle = gKo
        ctx.fillRect(x, top, bW, koH)
        ctx.fillStyle = '#F23F43'
        ctx.fillRect(x, top, bW, 2)
      }

      // value label
      const totalH = okH + koH
      if (d.ok + d.ko > 0) {
        ctx.fillStyle = d.ok > 0 ? '#23A55A' : 'rgba(242,63,67,0.75)'
        ctx.font = '600 9.5px Cascadia Code, Consolas, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(d.ok + d.ko, x + bW / 2, pT + cH - totalH - 6)
      }

      // day label
      ctx.fillStyle = 'rgba(148,155,164,0.65)'
      ctx.font = '9px ui-sans-serif, system-ui, sans-serif'
      ctx.fillText(d.label, x + bW / 2, pT + cH + 18)
    })

    // legend
    ctx.font = '9px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#23A55A'; ctx.fillText('● Accordés', W - pR - 130, 14)
    ctx.fillStyle = '#F23F43'; ctx.fillText('● Refusés',  W - pR - 66,  14)
  }, [data])

  return (
    // Hauteur plafonnée : sans `maxHeight`, le canvas prenait toute la hauteur
    // disponible et sept barres devenaient des blocs de 750 px de haut.
    <div ref={wrapRef} style={{ flex: 1, minHeight: 240, maxHeight: 420 }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}

function buildChartData(logs, days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
    const key = d.toISOString().slice(0, 10)
    const day = logs.filter(l => (l.timestamp || '').startsWith(key))
    return {
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      ok: day.filter(l => l.event_type === EVENT_TYPES.VIP_ENTRY).length,
      ko: day.filter(l => [EVENT_TYPES.ACCESS_DENIED, EVENT_TYPES.INTRUDER_CONFIRMED].includes(l.event_type)).length,
    }
  })
}

/* ── Metric tile ──────────────────────────────────────────────────── */
function Tile({ icon: Icon, label, value, sub, color, last }) {
  return (
    <div style={{
      padding: '20px 28px',
      borderRight: last ? 'none' : '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'var(--muted-foreground)',
        }}>{label}</div>
        <Icon size={13} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
      </div>
      <div style={{
        fontFamily: 'var(--fm)', fontSize: 34, fontWeight: 700, lineHeight: 1,
        color: color || 'var(--foreground)', marginTop: 12,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 8 }}>
        {sub}
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function Stats() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [days,    setDays]    = useState('7')

  useEffect(() => {
    setLoading(true)
    getLogs({ days })
      .then(r => setLogs(r.data.logs || r.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [days])

  const granted   = logs.filter(l => l.event_type === EVENT_TYPES.VIP_ENTRY).length
  const denied    = logs.filter(l => l.event_type === EVENT_TYPES.ACCESS_DENIED).length
  const intruders = logs.filter(l => l.event_type === EVENT_TYPES.INTRUDER_CONFIRMED).length
  const scores    = logs.filter(l => l.confidence > 0).map(l => l.confidence)
  const avgScore  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  const chartData = buildChartData(logs, +days)

  const vipCounts = {}
  logs.filter(l => l.name).forEach(l => { vipCounts[l.name] = (vipCounts[l.name] || 0) + 1 })
  const topVips   = Object.entries(vipCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxCount  = topVips[0]?.[1] || 1

  const dLabel = days === '1' ? "Aujourd'hui" : `${days} derniers jours`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 52, flexShrink: 0,
        borderBottom: '1px solid var(--border)', background: 'var(--card)',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Statistiques</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>{dLabel}</div>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger style={{ width: 168 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Aujourd'hui</SelectItem>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)' }}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 96 }} />)}
          </div>
          <Skeleton style={{ flex: 1, height: 240 }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Metric strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            <Tile icon={CheckCircle2} label="Accès accordés" value={granted}
              sub={dLabel} color="var(--granted)" />
            <Tile icon={XCircle} label="Accès refusés" value={denied}
              sub="échecs MFA inclus" color="var(--denied)" />
            <Tile icon={ShieldAlert} label="Intrus confirmés" value={intruders}
              sub="alertes envoyées" color="var(--pending)" />
            <Tile icon={Target} label="Score moyen" value={avgScore ? `${avgScore}%` : '—'}
              sub="FaceNet512" last />
          </div>

          {/* Chart + VIPs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 228px', flex: 1, overflow: 'hidden', background: 'var(--border)', gap: 1 }}>

            {/* Chart */}
            <div style={{ background: 'var(--background)', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'var(--muted-foreground)',
                marginBottom: 16,
              }}>
                Accès par jour
              </div>
              {chartData.every(d => d.ok + d.ko === 0) ? (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--fm)', fontSize: 12, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--muted-foreground)',
                }}>
                  Aucune donnée
                </div>
              ) : (
                <BarChart data={chartData} />
              )}
            </div>

            {/* Top VIPs */}
            <div style={{ background: 'var(--card)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '18px 16px 10px',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'var(--muted-foreground)',
                flexShrink: 0,
              }}>
                VIPs les plus actifs
              </div>
              {topVips.length === 0 ? (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--fm)', fontSize: 12, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--muted-foreground)',
                }}>—</div>
              ) : topVips.map(([name, count], i) => (
                <div key={name} style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{name}</span>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--muted-foreground)' }}>
                      {count}×
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'var(--accent)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${(count / maxCount) * 100}%`,
                      background: `linear-gradient(90deg, rgba(88,101,242,0.85), rgba(88,101,242,0.45))`,
                      transition: 'width 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
