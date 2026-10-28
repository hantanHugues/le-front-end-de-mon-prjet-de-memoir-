import { useState, useEffect, useRef } from 'react'
import { getStreamUrl, getCameraStreamUrl, getAccessStatus, openDoor, lockDoor, getCameras, fingerprintResult } from '../api/client'
import StateChip from '../components/StateChip'
import ScoreBar  from '../components/ScoreBar'
import { safeAction } from '../utils/safeAction'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { VideoOff, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { PageHeader } from '../components/ui/page-header'
import { EmptyState } from '../components/ui/empty-state'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '../components/ui/alert-dialog'

function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
      {time}
    </span>
  )
}

// Barre valeur/seuil — équivalent dashboard du panneau debug blendshapes
// (touche T) de client_camera.py : la valeur brute MediaPipe (0→1) contre le
// seuil qui déclenche la détection, pour voir EXACTEMENT où on en est plutôt
// que deviner si le geste est "assez" marqué.
function ThresholdBar({ label, value, threshold }) {
  if (value == null || threshold == null) return null
  const pct       = Math.min(100, Math.max(0, value * 100))
  const thPct     = Math.min(100, Math.max(0, threshold * 100))
  const isOver    = value > threshold
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--muted-foreground)', marginBottom: 3,
      }}>
        <span>{label}</span>
        <span style={{ color: isOver ? 'var(--granted)' : 'var(--muted-foreground)' }}>
          {value.toFixed(3)} / {threshold.toFixed(2)}
        </span>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'var(--secondary)', borderRadius: 3, overflow: 'visible' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 3,
          width: `${pct}%`,
          background: isOver ? 'var(--granted)' : 'var(--primary)',
          transition: 'width 80ms linear',
        }} />
        {/* Marqueur du seuil */}
        <div style={{
          position: 'absolute', top: -2, left: `${thPct}%`,
          width: 2, height: 10, background: 'var(--pending)',
        }} />
      </div>
    </div>
  )
}

const stateColor = {
  GRANTED:             'var(--granted)',
  DENIED:              'var(--denied)',
  FINGERPRINT_PENDING: 'var(--pending)',
  LIVENESS_PENDING:    'var(--pending)',
  INTRUDER_CONFIRMED:  'var(--intruder)',
  ANALYZING:           'var(--analyzing)',
}

export default function Surveillance() {
  const [sessions,    setSessions]    = useState([])
  const [iot,         setIot]         = useState({})
  const [streamOk,    setStreamOk]    = useState(true)
  const [cameras,     setCameras]     = useState([])
  const [activeCam,   setActiveCam]   = useState(null)
  const [doorLoading, setDoorLoading] = useState(false)
  const [lockOpen,    setLockOpen]    = useState(false)
  const [countdown,   setCountdown]   = useState(null)
  const imgRef   = useRef(null)
  const countRef = useRef(null)

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

  // Pas de capteur d'empreinte ESP32 branché pour l'instant — ce bouton
  // simule son résultat pour pouvoir tester la voie "empreinte" du MFA
  // parallèle (empreinte OU sourire/clignement, le premier qui réussit).
  async function handleFingerprint(sessionId, success) {
    await safeAction(
      () => fingerprintResult(sessionId, success),
      success ? 'Empreinte simulée : validée' : 'Empreinte simulée : refusée',
      "Impossible d'envoyer le résultat d'empreinte",
    )
  }

  async function executeDoorOpen() {
    setDoorLoading(true)
    await safeAction(openDoor, 'Porte déverrouillée', "Impossible d'ouvrir la porte")
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

  // Le verrouillage agit sur une gâche physique : verrouiller pendant que
  // quelqu'un franchit la porte est le scénario risqué. L'ouverture avait déjà
  // un compte à rebours annulable ; le verrouillage partait sans rien demander.
  async function confirmLockDoor() {
    setLockOpen(false)
    setDoorLoading(true)
    await safeAction(lockDoor, 'Porte verrouillée', 'Impossible de verrouiller la porte')
    setDoorLoading(false)
  }

  const streamUrl = activeCam ? getCameraStreamUrl(activeCam) : getStreamUrl()
  const activeCamInfo = cameras.find(c => c.cam_id === activeCam)


  const doorOpen = iot.door === 'open'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Topbar */}
      <PageHeader
        title="Surveillance"
        subtitle={activeCamInfo ? `${activeCamInfo.name} · ${activeCamInfo.fps} fps` : 'Flux principal'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {cameras.length > 0 && (
            /* `Select` Radix et non `<select>` natif : le menu natif est rendu
               par Windows (fond blanc, police système) et rompait le thème. */
            <Select
              value={activeCam || 'default'}
              onValueChange={v => { setActiveCam(v === 'default' ? null : v); setStreamOk(true) }}
            >
              <SelectTrigger style={{ minWidth: 200, height: 32 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Flux par défaut</SelectItem>
                {cameras.map(c => (
                  <SelectItem key={c.cam_id} value={c.cam_id}>
                    {c.name}{c.zone ? ` · ${c.zone}` : ''}{c.connected ? '' : ' (hors ligne)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Clock />
        </div>
      </PageHeader>

      {/* Main grid */}
      <div className="surv">

        {/* Video feed */}
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
            // État hors-ligne : c'est ce que le jury voit si la caméra ne répond
            // pas. Il doit expliquer la situation, pas afficher deux mots perdus
            // au milieu d'un rectangle noir.
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 14, textAlign: 'center', padding: 32, maxWidth: 420,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'rgba(255,255,255,.04)',
                border: '1px solid var(--border-hi)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <VideoOff size={24} style={{ color: 'var(--muted-foreground)' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>
                  Flux vidéo indisponible
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 6, lineHeight: 1.5 }}>
                  {activeCamInfo
                    ? `« ${activeCamInfo.name} » ne renvoie pas d'image. Vérifiez que la caméra est branchée et que le service est démarré.`
                    : "Aucune image reçue du serveur. Vérifiez que le service de capture est démarré."}
                </div>
              </div>
              <Button variant="accent" onClick={() => setStreamOk(true)}>
                <RefreshCw size={14} />
                Réessayer
              </Button>
            </div>
          )}

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="door-confirm">
              <div className="door-confirm-box">
                <div className="door-confirm-label">Ouverture porte — confirmer</div>
                <div className="door-confirm-count">{countdown}</div>
                <Button variant="destructive" onClick={cancelCountdown}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* HUD */}
          <div className="feed-hud">
            <div className="corner c-tl" /><div className="corner c-tr" />
            <div className="corner c-bl" /><div className="corner c-br" />
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

        {/* Sessions panel */}
        <div className="sessions">
          <div style={{
            padding: '12px 14px 8px',
            fontSize: 11, fontWeight: 700, letterSpacing: '.09em',
            textTransform: 'uppercase', color: 'var(--muted-foreground)',
            borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            Détections actives
          </div>

          {sessions.length === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: 1, fontFamily: 'var(--fm)', fontSize: 12,
              letterSpacing: '.07em', textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
            }}>
              Aucune détection
            </div>
          )}

          {sessions.map(s => (
            <div key={s.id} className="sess-card">
              <div className="sess-hdr">
                <span className="sess-id">ID#{s.id}</span>
                <StateChip state={s.state} />
              </div>
              <div className="sess-name">{s.vip_name || 'Inconnu'}</div>
              <div className="sess-score">
                <span className="score-num">{s.score ? `${s.score}%` : '—'}</span>
                {s.score > 0 && <ScoreBar score={s.score} color={stateColor[s.state]} />}
              </div>
              {(s.state === 'FINGERPRINT_PENDING' || s.state === 'LIVENESS_PENDING') && (
                <>
                  {/* Le geste attendu est tiré au sort une seule fois par session
                      (voir LivenessDetector) — un seul des deux compte ici, pas
                      la peine d'afficher l'autre. */}
                  <div style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--pending)', marginTop: 6, fontWeight: 700 }}>
                    Doigt&nbsp;OU&nbsp;{s.liveness_progress?.challenge_label || '…'}
                  </div>

                  {s.liveness_progress?.challenge === 'blink' && (
                    <>
                      <div style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                        Clignements : {s.liveness_progress.blinks}/{s.liveness_progress.blinks_required}
                        &nbsp;·&nbsp;{s.liveness_progress.remaining}s restantes
                      </div>
                      <ThresholdBar label="BLINK" value={s.liveness_progress.blink_score} threshold={s.liveness_progress.blink_threshold} />
                    </>
                  )}
                  {s.liveness_progress?.challenge === 'smile' && (
                    <>
                      <div style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                        {s.liveness_progress.smiling ? 'Sourire détecté, maintenez…' : 'En attente du sourire…'}
                        &nbsp;·&nbsp;{s.liveness_progress.remaining}s restantes
                      </div>
                      <ThresholdBar label="SMILE" value={s.liveness_progress.smile_score} threshold={s.liveness_progress.smile_threshold} />
                    </>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <Button variant="accent" size="sm" onClick={() => handleFingerprint(s.id, true)}>
                      Empreinte OK
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleFingerprint(s.id, false)}>
                      Empreinte ✗
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* IoT bar */}
        <div className="iot-bar">
          <div className="iot-item">
            <span className="iot-label">Porte</span>
            <span className="iot-val" style={{ color: doorOpen ? 'var(--granted)' : 'var(--t2)' }}>
              {doorOpen ? '● Ouverte' : '● Fermée'}
            </span>
          </div>
          <div className="iot-sep" />
          <div className="iot-item">
            <span className="iot-label">Lumière</span>
            <span className="iot-val">{iot.light || '—'}</span>
          </div>
          <div className="iot-sep" />
          <div className="iot-item">
            <span className="iot-label">Empreinte</span>
            <span className="iot-val" style={{ color: iot.fingerprint ? 'var(--pending)' : 'var(--t3)' }}>
              {iot.fingerprint ? '● Actif' : '—'}
            </span>
          </div>
          <div className="iot-sep" />
          <div className="iot-item">
            {iot.iot_enabled
              ? <span style={{ fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '.10em', color: 'var(--granted)' }}>● RÉEL</span>
              : <span style={{ fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '.10em', color: 'var(--t4)' }}>○ MOCK</span>}
          </div>
          <div className="iot-acts">
            <Button
              variant="accent"
              onClick={handleOpenDoor}
              disabled={doorLoading || countdown !== null}
            >
              {doorLoading && <Loader2 size={13} className="animate-spin" />}
              Ouvrir porte
            </Button>
            <Button
              variant="destructive"
              onClick={() => setLockOpen(true)}
              disabled={doorLoading || countdown !== null}
            >
              Verrouiller
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={lockOpen} onOpenChange={setLockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verrouiller la porte ?</AlertDialogTitle>
            <AlertDialogDescription>
              La gâche va être verrouillée immédiatement. Assurez-vous que personne
              n'est en train de franchir le passage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLockDoor}>Verrouiller</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
