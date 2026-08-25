import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { RefreshCw, TriangleAlert, Bell, Eye } from 'lucide-react'
import { getLogs } from '../api/client'
import { bridge } from '../api/bridge'
import { EVENT_TYPES } from '../constants/events'
import { Switch } from '../components/ui/switch'
import { Skeleton } from '../components/ui/skeleton'
import { Button } from '../components/ui/button'

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

/* ── Sub-components ─────────────────────────────────────────────── */

// Temps relatif : sur une liste où chaque ligne porte le même intitulé, c'est
// l'ancienneté qui permet de se repérer d'un coup d'œil.
function relTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (!isFinite(diff)) return ''
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return `il y a ${Math.floor(diff / 86400)} j`
}

function AlertItem({ log }) {
  const filename = log.snapshot_path ? log.snapshot_path.split('/').pop() : null
  return (
    // Pas de `cursor: pointer` ici : aucun endpoint d'affichage de snapshot
    // n'existe côté API, la ligne n'est donc pas cliquable. Mieux vaut ne rien
    // promettre que d'offrir un clic sans effet pendant une démo.
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 24px', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 34, height: 34,
        background: 'rgba(242,63,67,.10)',
        border: '1px solid rgba(242,63,67,.22)',
        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <TriangleAlert size={16} style={{ color: 'var(--denied)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
            Intrus confirmé
          </span>
          <span style={{
            padding: '2px 7px',
            background: 'rgba(242,63,67,.12)',
            border: '1px solid rgba(242,63,67,.22)',
            borderRadius: 4, fontSize: 11, fontWeight: 600,
            color: 'var(--denied)', letterSpacing: '.05em', textTransform: 'uppercase',
          }}>
            Alerte
          </span>
        </div>
        {filename && (
          <div style={{
            fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--muted-foreground)',
            marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {filename}
          </div>
        )}
      </div>

      {/* Horodatage à droite : occupe la largeur au lieu de la laisser vide */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--foreground)' }}>
          {fmtDate(log.timestamp)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 3 }}>
          {relTime(log.timestamp)}
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onChange }) {
  return (
    <Switch checked={on} onCheckedChange={onChange} />
  )
}

function NotifRow({ name, eventKey, checked, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 2 }}>
          {name}
        </div>
        <div style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--t3)' }}>
          {eventKey}
        </div>
      </div>
      <Toggle on={checked} onChange={onChange} />
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function Alertes() {
  const [intruders, setIntruders] = useState([])
  const [loading,    setLoading]  = useState(true)
  const [waEnabled,  setWaEnabled] = useState(() => ls(KEY_WA_ENABLED, false))
  const [waNumber,   setWaNumber]  = useState(() => ls(KEY_WA_NUMBER, ''))
  const [waKey,      setWaKey]     = useState(() => ls(KEY_WA_APIKEY, ''))
  const [nIntruder,  setNIntruder] = useState(() => ls(KEY_N_INTRUDER, true))
  const [nDenied,    setNDenied]   = useState(() => ls(KEY_N_DENIED, false))
  const [nTimeout,   setNTimeout]  = useState(() => ls(KEY_N_TIMEOUT, true))

  function fetchIntruders() {
    setLoading(true)
    return getLogs({ event_type: EVENT_TYPES.INTRUDER_CONFIRMED, days: 30 })
      .then(r => setIntruders(r.data.logs || r.data || []))
      .catch(() => setIntruders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchIntruders() }, [])

  function toggle(setter, key) {
    return val => { setter(val); lsSet(key, val) }
  }

  function handleTestSend() {
    bridge.notify('BioGate — Test', 'Notification desktop fonctionnelle ✓')
    toast.success('Notification desktop envoyée')
  }

  /* ── Shared style primitives ── */
  const sectionHeader = { padding: '18px 18px 14px' }
  const sectionTitle  = { fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }
  const fieldLabel    = {
    display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '.07em',
    textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 5,
  }
  const fieldInput = {
    width: '100%', background: 'var(--secondary)',
    border: '1px solid var(--border-hi)',
    color: 'var(--foreground)', fontSize: 13,
    fontFamily: 'var(--fu)', padding: '7px 10px',
    borderRadius: 6, outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 52, flexShrink: 0,
        borderBottom: '1px solid var(--border)', background: 'var(--card)',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Alertes</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>
            Intrusions — 30 derniers jours
          </div>
        </div>
        <Button onClick={fetchIntruders} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </Button>
      </div>

      {/* 2-col layout */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 288px',
        gap: 1, background: 'var(--border)', overflow: 'hidden',
      }}>

        {/* Alert list */}
        <div style={{ background: 'var(--background)', overflowY: 'auto' }}>
          <div style={{
            padding: '16px 20px 12px',
            fontSize: 11, fontWeight: 700, letterSpacing: '.09em',
            textTransform: 'uppercase', color: 'var(--muted-foreground)',
            borderBottom: '1px solid var(--border)',
          }}>
            Intrusions confirmées
          </div>

          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <Skeleton style={{ height: 34, borderRadius: 4 }} />
            </div>
          ))}

          {!loading && intruders.length === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 180, fontFamily: 'var(--fm)', fontSize: 12,
              letterSpacing: '.07em', textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
            }}>
              Aucune intrusion détectée
            </div>
          )}

          {!loading && intruders.map((log, i) => (
            <AlertItem key={log.id ?? i} log={log} i={i} />
          ))}
        </div>

        {/* Right config */}
        <div style={{ background: 'var(--card)', overflowY: 'auto' }}>

          {/* WhatsApp section */}
          <div style={{ ...sectionHeader, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={sectionTitle}>WhatsApp</span>
              <Switch
                checked={waEnabled}
                onCheckedChange={toggle(setWaEnabled, KEY_WA_ENABLED)}
              />
            </div>

            {/* Warning banner */}
            <div style={{
              background: 'rgba(240,177,50,.08)',
              border: '1px solid rgba(240,177,50,.20)',
              borderRadius: 6, padding: '8px 10px', marginBottom: 12,
              fontFamily: 'var(--fm)', fontSize: 12, lineHeight: 1.5,
              color: 'var(--pending)',
            }}>
              Backend non connecté — sauvegarde locale uniquement, aucun message WhatsApp envoyé.
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={fieldLabel}>Numéro destinataire</label>
              <input
                style={fieldInput}
                type="tel"
                value={waNumber}
                placeholder="+22997000000"
                onChange={e => { setWaNumber(e.target.value); lsSet(KEY_WA_NUMBER, e.target.value) }}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={fieldLabel}>API Key (Twilio / GreenAPI)</label>
              <input
                style={{ ...fieldInput, fontFamily: 'var(--fm)', fontSize: 13 }}
                type="password"
                value={waKey}
                placeholder="sk-live-••••••••"
                onChange={e => { setWaKey(e.target.value); lsSet(KEY_WA_APIKEY, e.target.value) }}
              />
            </div>

            <Button variant="accent" className="w-full mt-3.5" onClick={handleTestSend}>
              <Bell size={14} />
              Test notification desktop
            </Button>
          </div>

          {/* Notifications desktop */}
          <div style={{ padding: '18px 18px 14px' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '.09em',
              textTransform: 'uppercase', color: 'var(--muted-foreground)',
              marginBottom: 12,
            }}>
              Notifications desktop
            </div>
            <NotifRow
              name="Intrus confirmé" eventKey="INTRUDER_CONFIRMED"
              checked={nIntruder} onChange={toggle(setNIntruder, KEY_N_INTRUDER)}
            />
            <NotifRow
              name="Accès refusé" eventKey="DENIED"
              checked={nDenied} onChange={toggle(setNDenied, KEY_N_DENIED)}
            />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 2 }}>
                  Timeout MFA
                </div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--t3)' }}>
                  MFA_TIMEOUT
                </div>
              </div>
              <Switch checked={nTimeout} onCheckedChange={toggle(setNTimeout, KEY_N_TIMEOUT)} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
