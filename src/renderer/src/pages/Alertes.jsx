import { useState, useEffect } from 'react'
import { getLogs } from '../api/client'
import Toggle from '../components/Toggle'
import { EVENT_TYPES } from '../constants/events'

const KEY_WA_ENABLED = 'biogate_wa_enabled'
const KEY_WA_NUMBER  = 'biogate_wa_number'
const KEY_WA_APIKEY  = 'biogate_wa_apikey'
const KEY_N_INTRUDER = 'biogate_notif_intruder'
const KEY_N_DENIED   = 'biogate_notif_denied'
const KEY_N_TIMEOUT  = 'biogate_notif_timeout'

function ls(key, def) {
  try { const v = localStorage.getItem(key); return v === null ? def : JSON.parse(v) } catch { return def }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR') + ' · ' + d.toLocaleTimeString('fr-FR', { hour12: false })
}

export default function Alertes() {
  const [intruders,  setIntruders]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [waEnabled,  setWaEnabled]  = useState(() => ls(KEY_WA_ENABLED, false))
  const [waNumber,   setWaNumber]   = useState(() => ls(KEY_WA_NUMBER, ''))
  const [waKey,      setWaKey]      = useState(() => ls(KEY_WA_APIKEY, ''))
  const [nIntruder,  setNIntruder]  = useState(() => ls(KEY_N_INTRUDER, true))
  const [nDenied,    setNDenied]    = useState(() => ls(KEY_N_DENIED, false))
  const [nTimeout,   setNTimeout]   = useState(() => ls(KEY_N_TIMEOUT, true))
  const [testSent,   setTestSent]   = useState(false)

  useEffect(() => {
    getLogs({ event_type: EVENT_TYPES.INTRUDER_CONFIRMED, days: 30 })
      .then(r => setIntruders(r.data.logs || r.data || []))
      .catch(() => setIntruders([]))
      .finally(() => setLoading(false))
  }, [])

  function toggle(setter, key) {
    return val => { setter(val); lsSet(key, val) }
  }

  function handleTestSend() {
    window.electronAPI.notify('BioGate — Test', 'Notification desktop fonctionnelle ✓')
    setTestSent(true)
    setTimeout(() => setTestSent(false), 2500)
  }

  return (
    <>
      <div className="topbar">
        <span className="page-title">Alertes</span>
        <div className="topbar-right">
          <button className="btn" onClick={() => { setLoading(true); getLogs({ event_type: EVENT_TYPES.INTRUDER_CONFIRMED, days:30 }).then(r => setIntruders(r.data.logs || r.data || [])).catch(()=>{}).finally(()=>setLoading(false)) }}>
            ↻ Actualiser
          </button>
        </div>
      </div>

      <div className="alertes-layout">
        {/* Liste des intrus */}
        <div className="alert-list">
          <div className="slabel">Intrusions confirmées — 30 derniers jours</div>
          {loading && <div className="empty-state"><span className="spinner" /></div>}
          {!loading && intruders.length === 0 && (
            <div className="empty-state">AUCUNE INTRUSION DÉTECTÉE</div>
          )}
          {intruders.map((log, i) => (
            <div className="alert-item" key={log.id ?? i}>
              <div className="alert-thumb">⚠</div>
              <div className="alert-body">
                <div className="alert-title">INTRUS CONFIRMÉ</div>
                <div className="alert-time">{fmtDate(log.timestamp)}</div>
                {log.snapshot_path && (
                  <div className="alert-desc">{log.snapshot_path.split('/').pop()}</div>
                )}
              </div>
              {log.snapshot_path && (
                <button className="btn" style={{ fontSize:10 }}>Voir</button>
              )}
            </div>
          ))}
        </div>

        {/* Config alertes */}
        <div className="alert-cfg">
          {/* WhatsApp */}
          <div className="wp-panel">
            <div className="wp-hdr">
              <div className="wp-title">WhatsApp</div>
              <Toggle value={waEnabled} onChange={toggle(setWaEnabled, KEY_WA_ENABLED)} />
            </div>
            <div style={{
              fontFamily: 'var(--fm)', fontSize: 10, lineHeight: 1.5,
              color: 'var(--pending, #d9a441)', background: 'rgba(217,164,65,.08)',
              border: '1px solid rgba(217,164,65,.35)', borderRadius: 4,
              padding: '8px 10px', margin: '10px 0',
            }}>
              ⚠ Backend non connecté — ces champs sont sauvegardés localement mais
              aucun message WhatsApp n'est envoyé pour l'instant (pas d'intégration
              Twilio/GreenAPI côté serveur).
            </div>
            <div className="wp-field">
              <div className="wp-label">Numéro destinataire</div>
              <input className="wp-input" type="tel" value={waNumber}
                placeholder="+22997000000"
                onChange={e => { setWaNumber(e.target.value); lsSet(KEY_WA_NUMBER, e.target.value) }} />
            </div>
            <div className="wp-field">
              <div className="wp-label">API Key (Twilio / GreenAPI)</div>
              <input className="wp-input" type="password" value={waKey}
                placeholder="sk-live-••••••••"
                onChange={e => { setWaKey(e.target.value); lsSet(KEY_WA_APIKEY, e.target.value) }} />
            </div>
            <button
              className="btn btn-accent"
              style={{ marginTop:12, width:'100%', justifyContent:'center' }}
              onClick={handleTestSend}
              title="Envoie une notification desktop locale — ne teste pas l'envoi WhatsApp"
            >
              {testSent ? '✓ Notification envoyée' : 'Test notification desktop'}
            </button>
          </div>

          {/* Notifications desktop */}
          <div className="notif-section">
            <div className="wp-title" style={{ marginBottom:12 }}>Notifications desktop</div>
            <div className="notif-row">
              <div>
                <div className="notif-name">Intrus confirmé</div>
                <div className="notif-key">INTRUDER_CONFIRMED</div>
              </div>
              <Toggle value={nIntruder} onChange={toggle(setNIntruder, KEY_N_INTRUDER)} />
            </div>
            <div className="notif-row">
              <div>
                <div className="notif-name">Accès refusé</div>
                <div className="notif-key">DENIED</div>
              </div>
              <Toggle value={nDenied} onChange={toggle(setNDenied, KEY_N_DENIED)} />
            </div>
            <div className="notif-row">
              <div>
                <div className="notif-name">Timeout MFA</div>
                <div className="notif-key">MFA_TIMEOUT</div>
              </div>
              <Toggle value={nTimeout} onChange={toggle(setNTimeout, KEY_N_TIMEOUT)} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
