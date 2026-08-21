import { useState, useEffect, useCallback } from 'react'
import { getLogs, deleteLog, purgeLogs } from '../api/client'
import { eventMeta, EVENT_FILTER_OPTIONS } from '../constants/events'

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour12: false })
}

export default function Journal() {
  const [logs,     setLogs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState({ days: '7', event_type: '', vip_name: '' })
  const [purging,  setPurging]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.days)       params.days       = filter.days
      if (filter.event_type) params.event_type = filter.event_type
      if (filter.vip_name)   params.vip_name   = filter.vip_name
      const res = await getLogs(params)
      setLogs(res.data.logs || res.data || [])
    } catch { setLogs([]) }
    finally  { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    if (!confirm('Supprimer ce log ?')) return
    await deleteLog(id).catch(() => {})
    load()
  }

  async function handlePurge() {
    if (!confirm('Purger tous les logs anciens selon la rétention RGPD configurée ?')) return
    setPurging(true)
    try { await purgeLogs() } catch { /* ok */ }
    setPurging(false)
    load()
  }

  function exportCsv() {
    const head = 'Date,Événement,VIP,Score\n'
    const rows = logs.map(l =>
      `"${fmtDate(l.timestamp)}","${l.event_type}","${l.name || ''}","${l.confidence || ''}"`
    ).join('\n')
    const blob = new Blob([head + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'biogate_logs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const ev = eventMeta

  return (
    <>
      <div className="topbar">
        <span className="page-title">Journal d'accès</span>
        <div className="topbar-right">
          <button className="btn" onClick={exportCsv}>↓ CSV</button>
          <button className="btn btn-danger" onClick={handlePurge} disabled={purging}>
            {purging ? <span className="spinner" /> : 'Purge RGPD'}
          </button>
        </div>
      </div>

      <div className="jfilters">
        <select className="fsel" value={filter.days} onChange={e => setFilter(f => ({...f, days: e.target.value}))}>
          <option value="1">Aujourd'hui</option>
          <option value="7">7 derniers jours</option>
          <option value="30">Ce mois</option>
          <option value="">Tout</option>
        </select>
        <select className="fsel" value={filter.event_type} onChange={e => setFilter(f => ({...f, event_type: e.target.value}))}>
          <option value="">Tous les événements</option>
          {EVENT_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="fcount">{loading ? '…' : `${logs.length} événement${logs.length !== 1 ? 's' : ''}`}</span>
      </div>

      <div className="jtable-wrap">
        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">AUCUN ÉVÉNEMENT</div>
        ) : (
          <table className="jtable">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Événement</th>
                <th>VIP</th>
                <th style={{ textAlign:'right' }}>Score</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const { cls, label } = ev(log.event_type)
                return (
                  <tr key={log.id}>
                    <td className="td-time">{fmtDate(log.timestamp)}</td>
                    <td><span className={`state ${cls}`}>{label}</span></td>
                    <td className="td-name">{log.name || '—'}</td>
                    <td className="td-score">{log.confidence ? `${log.confidence.toFixed(1)}%` : '—'}</td>
                    <td>
                      {log.snapshot_path && (
                        <div className="snap-box" title="Voir snapshot">⊡</div>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize:10, padding:'3px 8px' }}
                        onClick={() => handleDelete(log.id)}
                      >✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
