import { useState, useEffect, useRef, useCallback } from 'react'
import { getLogs } from '../api/client'
import { EVENT_TYPES } from '../constants/events'

function BarChart({ data }) {
  const canvasRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const ctx  = canvas.getContext('2d')
    const W    = canvas.parentElement.clientWidth
    const H    = canvas.parentElement.clientHeight - 30
    if (W <= 0 || H <= 0) return
    canvas.width = W; canvas.height = H

    const maxV = Math.max(...data.map(d => d.ok + d.ko), 1)
    const pL = 44, pR = 16, pT = 20, pB = 36
    const cW = W - pL - pR, cH = H - pT - pB
    const bw = cW / data.length

    ctx.clearRect(0, 0, W, H)

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const gy = pT + (cH / 4) * i
      ctx.strokeStyle = '#1B2130'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(pL, gy); ctx.lineTo(W - pR, gy); ctx.stroke()
      ctx.fillStyle = '#343E50'
      ctx.font = '9px Consolas,monospace'; ctx.textAlign = 'right'
      ctx.fillText(Math.round(maxV * (1 - i / 4)), pL - 5, gy + 3)
    }

    data.forEach((d, i) => {
      const x  = pL + bw * i + 8
      const w  = bw - 16
      const gh = (d.ok / maxV) * cH
      const gy = pT + cH - gh
      const nh = (d.ko / maxV) * cH

      ctx.fillStyle = 'rgba(34,197,94,.18)'
      ctx.fillRect(x, gy, w, gh)
      ctx.fillStyle = '#22C55E'
      ctx.fillRect(x, gy, w, 2)

      if (nh > 0) {
        ctx.fillStyle = 'rgba(239,68,68,.45)'
        ctx.fillRect(x, gy - nh - 2, w, Math.max(nh, 2))
      }

      ctx.fillStyle = '#22C55E'
      ctx.font = '500 10px Consolas,monospace'; ctx.textAlign = 'center'
      ctx.fillText(d.ok, x + w / 2, gy - nh - 8)

      ctx.fillStyle = '#343E50'
      ctx.font = '9px Consolas,monospace'
      ctx.fillText(d.label, x + w / 2, pT + cH + 14)
    })

    // Legend
    ctx.font = '9px Consolas,monospace'; ctx.textAlign = 'left'
    ctx.fillStyle = '#22C55E'; ctx.fillText('● Accordés', W - pR - 130, 12)
    ctx.fillStyle = '#EF4444'; ctx.fillText('● Refusés', W - pR - 70, 12)
  }, [data])

  return <canvas ref={canvasRef} style={{ display:'block', flex:1, width:'100%' }} />
}

function buildChartData(logs, days) {
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayLogs = logs.filter(l => (l.timestamp || '').startsWith(key))
    result.push({
      label: d.toLocaleDateString('fr-FR', { weekday:'short' }),
      ok:    dayLogs.filter(l => l.event_type === EVENT_TYPES.VIP_ENTRY).length,
      ko:    dayLogs.filter(l => [EVENT_TYPES.ACCESS_DENIED, EVENT_TYPES.INTRUDER_CONFIRMED].includes(l.event_type)).length,
    })
  }
  return result
}

export default function Stats() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [days,    setDays]    = useState(7)

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
  const avgScore  = scores.length ? Math.round(scores.reduce((a,b) => a+b,0) / scores.length) : 0

  const chartData = buildChartData(logs, days)

  // Top VIPs
  const vipCounts = {}
  logs.filter(l => l.name).forEach(l => { vipCounts[l.name] = (vipCounts[l.name] || 0) + 1 })
  const topVips = Object.entries(vipCounts).sort((a,b) => b[1]-a[1]).slice(0, 5)
  const maxCount = topVips[0]?.[1] || 1

  return (
    <>
      <div className="topbar">
        <span className="page-title">Statistiques</span>
        <div className="topbar-right">
          <select className="fsel" value={days} onChange={e => setDays(+e.target.value)}>
            <option value={1}>Aujourd'hui</option>
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 jours</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : (
        <div className="stats-grid">
          <div className="metric" style={{ gridColumn:'span 3' }}>
            <span className="m-label">Accès accordés</span>
            <span className="m-val green">{granted}</span>
            <span className="m-sub">sur {days} jour{days > 1 ? 's' : ''}</span>
          </div>
          <div className="metric" style={{ gridColumn:'span 3' }}>
            <span className="m-label">Accès refusés</span>
            <span className="m-val red">{denied}</span>
            <span className="m-sub">échecs MFA inclus</span>
          </div>
          <div className="metric" style={{ gridColumn:'span 3' }}>
            <span className="m-label">Intrus confirmés</span>
            <span className="m-val amber">{intruders}</span>
            <span className="m-sub">alertes envoyées</span>
          </div>
          <div className="metric" style={{ gridColumn:'span 3' }}>
            <span className="m-label">Score moyen</span>
            <span className="m-val">{avgScore ? `${avgScore}%` : '—'}</span>
            <span className="m-sub">FaceNet512</span>
          </div>

          <div className="chart-panel">
            <div className="chart-title">Accès par jour</div>
            <BarChart data={chartData} />
          </div>

          <div className="top-vips">
            <div className="slabel">VIPs les plus actifs</div>
            {topVips.length === 0 && <div className="empty-state" style={{ padding:20 }}>—</div>}
            {topVips.map(([name, count]) => (
              <div className="vip-row" key={name}>
                <div>
                  <div className="vip-row-name">{name}</div>
                  <div className="vip-row-count">{count} accès</div>
                </div>
                <div className="sbar" style={{ width:80 }}>
                  <div className="sbar-fill" style={{ width:`${(count/maxCount)*100}%`, background:'var(--accent)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
