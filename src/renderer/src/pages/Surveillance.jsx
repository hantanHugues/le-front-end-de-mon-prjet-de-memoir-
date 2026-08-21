import { useState, useEffect, useRef } from 'react'
import { getStreamUrl, getCameraStreamUrl, getAccessStatus, openDoor, lockDoor, getCameras } from '../api/client'
import StateChip from '../components/StateChip'
import ScoreBar  from '../components/ScoreBar'
import { safeAction } from '../utils/safeAction'

function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span style={{ fontFamily:'var(--fm)', fontSize:11, color:'var(--t3)', fontVariantNumeric:'tabular-nums' }}>{time}</span>
}

export default function Surveillance() {
  const [sessions,    setSessions]    = useState([])
  const [iot,         setIot]         = useState({})
  const [streamOk,    setStreamOk]    = useState(true)
  const [cameras,     setCameras]     = useState([])
  const [activeCam,   setActiveCam]   = useState(null)
  const [doorLoading, setDoorLoading] = useState(false)
  const [countdown,   setCountdown]   = useState(null) // null | 3 | 2 | 1
  const imgRef      = useRef(null)
  const countRef    = useRef(null)

  useEffect(() => {
    getCameras()
      .then(r => {
        const list = r.data?.cameras || []
        setCameras(list)
        const first = list.find(c => c.running)
        if (first) setActiveCam(first.cam_id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const res  = await getAccessStatus()
        if (!alive) return
        const data = res.data
        const list = Object.entries(data.trust_scores || {}).map(([id, s]) => ({ id, ...s }))
        setSessions(list)
        if (data.iot) setIot(data.iot)
      } catch { /* flux indisponible */ }
    }
    poll()
    const id = setInterval(poll, 1500)
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Countdown for door-open confirmation
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      clearInterval(countRef.current)
      setCountdown(null)
      executeDoorOpen()
      return
    }
    countRef.current = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000)
    return () => clearTimeout(countRef.current)
  }, [countdown])

  async function executeDoorOpen() {
    setDoorLoading(true)
    await safeAction(openDoor, 'Porte déverrouillée', 'Impossible d\'ouvrir la porte')
    setDoorLoading(false)
  }

  function handleOpenDoor() {
    if (countdown !== null || doorLoading) return
    setCountdown(3)
  }

  function cancelCountdown() {
    clearTimeout(countRef.current)
    setCountdown(null)
  }

  async function handleLockDoor() {
    setDoorLoading(true)
    await safeAction(lockDoor, 'Porte verrouillée', 'Impossible de verrouiller la porte')
    setDoorLoading(false)
  }

  const streamUrl = activeCam ? getCameraStreamUrl(activeCam) : getStreamUrl()

  const stateColor = {
    GRANTED:             'var(--granted)',
    DENIED:              'var(--denied)',
    FINGERPRINT_PENDING: 'var(--pending)',
    LIVENESS_PENDING:    'var(--pending)',
    INTRUDER_CONFIRMED:  'var(--intruder)',
    ANALYZING:           'var(--analyzing)',
  }

  function handleCamChange(e) {
    setActiveCam(e.target.value || null)
    setStreamOk(true)
  }

  const activeCamInfo = cameras.find(c => c.cam_id === activeCam)

  return (
    <>
      <div className="topbar">
        <span className="page-title">Surveillance</span>
        <div className="topbar-right">
          {cameras.length > 0 && (
            <select className="cam-select" value={activeCam || ''} onChange={handleCamChange}>
              <option value="">— flux par défaut —</option>
              {cameras.map(c => (
                <option key={c.cam_id} value={c.cam_id}>
                  {c.name}{c.connected ? ' ●' : ' ○'}{c.zone ? ` [${c.zone}]` : ''}
                </option>
              ))}
            </select>
          )}
          <Clock />
        </div>
      </div>

      <div className="surv">
        {/* ── Flux vidéo ── */}
        <div className="live-feed">
          {streamOk ? (
            <img
              ref={imgRef}
              key={streamUrl}
              className="live-img"
              src={streamUrl}
              alt="flux live"
              onError={() => setStreamOk(false)}
            />
          ) : (
            <div className="live-offline">
              <span className="live-offline-icon">◻</span>
              <span>FLUX INDISPONIBLE</span>
              <button className="btn" onClick={() => setStreamOk(true)}>Réessayer</button>
            </div>
          )}

          {/* Countdown confirmation overlay */}
          {countdown !== null && (
            <div className="door-confirm">
              <div className="door-confirm-box">
                <div className="door-confirm-label">[!] OUVERTURE PORTE — CONFIRMER</div>
                <div className="door-confirm-count">{countdown}</div>
                <div className="door-confirm-actions">
                  <button className="btn btn-danger" onClick={cancelCountdown}>Annuler</button>
                </div>
              </div>
            </div>
          )}

          <div className="feed-hud">
            <div className="corner c-tl" />
            <div className="corner c-tr" />
            <div className="corner c-bl" />
            <div className="corner c-br" />
            <div className="hud-meta">
              <span className="hud-chip">LIVE</span>
              {activeCamInfo && (
                <span className="hud-chip" style={{ color: activeCamInfo.connected ? 'var(--granted)' : 'var(--denied)' }}>
                  {activeCamInfo.name}&nbsp;·&nbsp;{activeCamInfo.fps} fps
                </span>
              )}
              <span className="hud-chip">{sessions.length} détection{sessions.length !== 1 ? 's' : ''}</span>
            </div>
            {streamOk && <div className="hud-rec">REC</div>}
          </div>
        </div>

        {/* ── Sessions ── */}
        <div className="sessions">
          <div className="slabel">Détections actives</div>
          {sessions.length === 0 && (
            <div className="empty-state">AUCUNE DÉTECTION</div>
          )}
          {sessions.map(s => (
            <div className="sess-card" key={s.id}>
              <div className="sess-hdr">
                <span className="sess-id">ID#{s.id}</span>
                <StateChip state={s.state} />
              </div>
              <div className="sess-name">{s.vip_name || 'Inconnu'}</div>
              <div className="sess-score">
                <span className="score-num">{s.score ? `${s.score}%` : '—'}</span>
                {s.score > 0 && <ScoreBar score={s.score} color={stateColor[s.state]} />}
              </div>
              {s.state === 'LIVENESS_PENDING' && s.liveness_progress && (
                <div style={{ fontFamily:'var(--fm)', fontSize:10, color:'var(--pending)', marginTop:6 }}>
                  Clignements : {s.liveness_progress.blinks}/{s.liveness_progress.blinks_required}
                  &nbsp;·&nbsp;{s.liveness_progress.remaining}s restantes
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Barre IoT ── */}
        <div className="iot-bar">
          <div className="iot-item">
            PORTE&nbsp;
            <span className="iot-val" style={{ color: iot.door === 'open' ? 'var(--granted)' : 'var(--t2)', textShadow: iot.door === 'open' ? '0 0 8px var(--glow-ok)' : 'none' }}>
              {iot.door === 'open' ? '● OUVERTE' : '● FERMÉE'}
            </span>
          </div>
          <div className="iot-sep" />
          <div className="iot-item">
            LUMIÈRE&nbsp;<span className="iot-val">{iot.light || '—'}</span>
          </div>
          <div className="iot-sep" />
          <div className="iot-item">
            EMPREINTE&nbsp;
            <span className="iot-val" style={{ color: iot.fingerprint ? 'var(--pending)' : 'var(--t3)', textShadow: iot.fingerprint ? '0 0 6px var(--glow-am)' : 'none' }}>
              {iot.fingerprint ? '● ACTIF' : '—'}
            </span>
          </div>
          <div className="iot-sep" />
          <div className="iot-item" style={{ fontSize: 9, letterSpacing: '.14em' }}>
            {iot.iot_enabled
              ? <span style={{ color: 'var(--granted)', textShadow: '0 0 6px var(--glow-ok)' }}>● RÉEL</span>
              : <span style={{ color: 'var(--t3)' }}>○ MOCK</span>}
          </div>
          <div className="iot-acts">
            <button
              className="btn btn-accent"
              onClick={handleOpenDoor}
              disabled={doorLoading || countdown !== null}
            >
              {doorLoading ? <span className="spinner" style={{ width:11, height:11 }} /> : null}
              Ouvrir porte
            </button>
            <button
              className="btn btn-danger"
              onClick={handleLockDoor}
              disabled={doorLoading || countdown !== null}
            >
              Verrouiller
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
