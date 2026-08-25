import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Save, Loader2, Search, Plus, X, Check, TriangleAlert,
  ScanFace, ShieldCheck, Bell, Wifi, Video, ChevronRight,
} from 'lucide-react'
import {
  getConfig, putConfig, applyTemplate,
  getCameras, addCamera, deleteCamera, scanUsbCameras,
} from '../api/client'
import { Button } from '../components/ui/button'
import { PageHeader } from '../components/ui/page-header'
import { EmptyState } from '../components/ui/empty-state'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '../components/ui/alert-dialog'

const TEMPLATES = [
  { name: 'portail',        label: 'Portail',        desc: 'MFA off · Seuil souple 0.35',   color: 'var(--granted)' },
  { name: 'domicile',       label: 'Domicile',       desc: 'MFA optionnel · Liveness on',   color: 'var(--primary)' },
  { name: 'bureau',         label: 'Bureau',         desc: 'MFA obligatoire · Fingerprint', color: 'var(--pending)' },
  { name: 'haute_securite', label: 'Haute Sécurité', desc: 'MFA + fingerprint + liveness',  color: 'var(--denied)' },
]

const CAM_TYPES = [
  { value: 'usb',   label: 'USB / Webcam' },
  { value: 'mjpeg', label: 'MJPEG HTTP (ex: BW21-CBV)' },
  { value: 'rtsp',  label: 'RTSP (caméra IP)' },
  { value: 'file',  label: 'Fichier vidéo (test)' },
]

/* ── Primitives ──────────────────────────────────────────────────── */

// Largeur de lecture commune à toute la colonne de réglages. Sans elle, le
// libellé restait collé à gauche et le contrôle à l'extrême droite : sur un
// écran large, près de 700 px de vide séparaient les deux et on ne savait plus
// quel curseur appartenait à quel paramètre.
const SETTINGS_MAX_W = 860

function SectionLabel({ icon: Icon, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      maxWidth: SETTINGS_MAX_W, padding: '26px 24px 8px',
    }}>
      {Icon && <Icon size={13} style={{ color: 'var(--primary)' }} />}
      <span style={{
        fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--foreground)',
      }}>
        {children}
      </span>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '0 24px' }} />
}

function Row({ label, cfgKey, children, note }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 32, padding: '12px 24px', minHeight: 56,
      maxWidth: SETTINGS_MAX_W,
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', lineHeight: 1.3 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--muted-foreground)', marginTop: 3, letterSpacing: '0.02em' }}>
          {cfgKey}
        </div>
        {note && (
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 5, lineHeight: 1.45 }}>{note}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Slider({ label, cfgKey, min, max, step = 1, unit = '', value, onChange }) {
  const v = value ?? min
  const pct = Math.round(((v - min) / (max - min)) * 100)
  return (
    <Row label={label} cfgKey={cfgKey}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="range" min={min} max={max} step={step}
          value={v}
          style={{ '--fill': `${pct}%`, width: 160 }}
          onChange={e => onChange(cfgKey, step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 24, minWidth: 56, padding: '0 8px',
          background: 'rgba(88,101,242,0.10)',
          border: '1px solid rgba(88,101,242,0.22)',
          borderRadius: 6,
          fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--primary)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {v}{unit}
        </div>
      </div>
    </Row>
  )
}

function ParamToggle({ label, cfgKey, value, onChange, note }) {
  return (
    <Row label={label} cfgKey={cfgKey} note={note}>
      {/* Le libellé est un élément frère, jamais associé au contrôle : sans
          `aria-label`, un lecteur d'écran annonce « interrupteur » sans dire lequel. */}
      <Switch aria-label={label} checked={!!value} onCheckedChange={v => onChange(cfgKey, v)} />
    </Row>
  )
}

function ParamText({ label, cfgKey, placeholder, value, onChange, disabled }) {
  return (
    <Row label={label} cfgKey={cfgKey}>
      <Input
        type="text"
        style={{ height: 32, width: 168, fontSize: 13, fontFamily: 'var(--fm)' }}
        placeholder={placeholder}
        value={value ?? ''}
        disabled={disabled}
        onChange={e => onChange(cfgKey, e.target.value)}
      />
    </Row>
  )
}

/* ── Camera section ──────────────────────────────────────────────── */

const EMPTY_CAM = { name: '', type: 'usb', url: '', usb_index: 0, zone: '' }

function CameraSection() {
  const [cameras,    setCameras]    = useState([])
  const [scanning,   setScanning]   = useState(false)
  const [usbDevices, setUsbDevices] = useState([])
  const [form,       setForm]       = useState(EMPTY_CAM)
  const [adding,     setAdding]     = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [err,        setErr]        = useState('')
  const [pendingDel, setPendingDel] = useState(null)

  const loadCameras = useCallback(() => {
    getCameras().then(r => setCameras(r.data?.cameras || [])).catch(() => {})
  }, [])

  useEffect(() => { loadCameras() }, [loadCameras])

  async function handleScan() {
    setScanning(true); setErr('')
    try {
      const res = await scanUsbCameras()
      setUsbDevices(res.data?.devices || [])
      if (!(res.data?.devices || []).length) setErr('Aucune webcam USB détectée.')
    } catch (ex) {
      setErr(`[HTTP ${ex.response?.status ?? 'réseau'}] ${ex.response?.data?.detail || ex.message || 'inconnue'}`)
    } finally { setScanning(false) }
  }

  function prefillUsb(dev) {
    setForm({ name: dev.label, type: 'usb', url: '', usb_index: dev.usb_index, zone: '' })
    setShowForm(true); setUsbDevices([])
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Nom requis.'); return }
    setAdding(true); setErr('')
    try {
      await addCamera(form)
      setForm(EMPTY_CAM); setShowForm(false); loadCameras()
      toast.success('Source vidéo ajoutée')
    } catch (ex) {
      setErr(ex.response?.data?.detail || "Erreur lors de l'ajout.")
    } finally { setAdding(false) }
  }

  async function confirmDelete() {
    const cam = pendingDel; setPendingDel(null)
    try { await deleteCamera(cam.cam_id); loadCameras(); toast.success('Source supprimée') }
    catch { toast.error('Erreur lors de la suppression') }
  }

  const needsUrl = ['mjpeg', 'rtsp', 'file'].includes(form.type)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 0 0' }}>
        <SectionLabel icon={Video}>Sources vidéo</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={handleScan} disabled={scanning}>
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Détecter USB
          </Button>
          <Button variant="accent" size="sm" onClick={() => { setShowForm(v => !v); setErr('') }}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? 'Annuler' : 'Ajouter'}
          </Button>
        </div>
      </div>

      <div style={{ margin: '0 24px', borderTop: '1px solid var(--border)' }}>
        {err && (
          <div style={{
            margin: '12px 0', padding: '8px 12px', borderRadius: 6, fontSize: 13,
            background: 'rgba(242,63,67,0.08)', border: '1px solid rgba(242,63,67,0.22)',
            color: 'var(--denied)',
          }}>{err}</div>
        )}

        {usbDevices.length > 0 && (
          <div style={{
            margin: '12px 0', padding: 12, borderRadius: 8,
            background: 'var(--secondary)', border: '1px solid var(--border-hi)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8, fontFamily: 'var(--fm)', letterSpacing: '0.03em' }}>
              Webcams détectées — cliquer pour pré-remplir :
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {usbDevices.map(d => (
                <Button key={d.usb_index} variant="outline" size="sm" onClick={() => prefillUsb(d)}>
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleAdd}
            style={{
              margin: '12px 0', padding: 16, borderRadius: 8,
              background: 'var(--secondary)', border: '1px solid var(--border-hi)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label style={{ marginBottom: 6, display: 'block' }}>Nom</Label>
                <Input placeholder="ex: Portail avant" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label style={{ marginBottom: 6, display: 'block' }}>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {needsUrl && (
              <div>
                <Label style={{ marginBottom: 6, display: 'block' }}>URL</Label>
                <Input
                  placeholder={form.type === 'mjpeg' ? 'http://192.168.1.X/stream' : form.type === 'rtsp' ? 'rtsp://user:pass@192.168.1.X/stream' : '/chemin/video.mp4'}
                  value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  style={{ fontFamily: 'var(--fm)', fontSize: 13 }}
                />
              </div>
            )}
            {form.type === 'usb' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <Label style={{ marginBottom: 6, display: 'block' }}>Index USB</Label>
                  <Input type="number" min={0} max={7} style={{ width: 80 }}
                    value={form.usb_index}
                    onChange={e => setForm(f => ({ ...f, usb_index: parseInt(e.target.value) || 0 }))} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 20 }}>0 = webcam principale</div>
              </div>
            )}
            <div>
              <Label style={{ marginBottom: 6, display: 'block' }}>Zone</Label>
              <Input placeholder="ex: Entrée, Couloir, Bureau…" value={form.zone}
                onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} />
            </div>
            <Button type="submit" variant="accent" disabled={adding} style={{ alignSelf: 'flex-start' }}>
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Enregistrer
            </Button>
          </form>
        )}

        {cameras.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 56, fontFamily: 'var(--fm)', fontSize: 12, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--muted-foreground)',
          }}>
            Aucune source vidéo configurée
          </div>
        ) : cameras.map(c => (
          <div key={c.cam_id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: c.connected ? 'var(--granted)' : c.running ? 'var(--pending)' : 'var(--muted-foreground)',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{c.name}</div>
              <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <Badge variant="outline">{c.type.toUpperCase()}</Badge>
                {c.zone && <Badge variant="outline">{c.zone}</Badge>}
                {c.type === 'usb' && <Badge variant="outline">USB #{c.usb_index}</Badge>}
                {c.url && (
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {c.url}
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--fm)', fontSize: 12, color: c.running ? (c.connected ? 'var(--granted)' : 'var(--pending)') : 'var(--muted-foreground)' }}>
              {c.running ? (c.connected ? `${c.fps} fps` : 'Connexion…') : 'hors ligne'}
            </div>
            <Button variant="ghost" size="icon" style={{ height: 28, width: 28 }}
              title="Supprimer" onClick={() => setPendingDel(c)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog open={!!pendingDel} onOpenChange={o => !o && setPendingDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {pendingDel?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette source vidéo sera retirée de la configuration. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ── Page principale Config ──────────────────────────────────────── */

export default function Config() {
  const [cfg,      setCfg]      = useState({})
  const [tpl,      setTpl]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  // Sans cet état, un serveur injoignable laissait `cfg` à {} : les sliders
  // retombaient sur leur minimum et les toggles sur OFF, donnant une page de
  // configuration crédible mais fausse — que « Sauvegarder » aurait poussée.
  const [loadErr,  setLoadErr]  = useState(false)

  function fetchConfig() {
    setLoading(true)
    getConfig()
      .then(r => { setCfg(r.data); setLoadErr(false) })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchConfig() }, [])

  function patch(key, val) { setCfg(c => ({ ...c, [key]: val })) }

  async function handleApplyTemplate(name) {
    try {
      const res = await applyTemplate(name)
      setCfg(res.data.config || res.data)
      // Marqué « appliqué » seulement après confirmation du serveur.
      setTpl(name)
      toast.success(`Template "${name}" appliqué`)
    } catch { toast.error("Impossible d'appliquer ce template") }
  }

  async function handleSave() {
    setSaving(true)
    try { await putConfig(cfg); toast.success('Configuration sauvegardée') }
    catch { toast.error('Erreur lors de la sauvegarde') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Topbar */}
      <PageHeader title="Configuration" subtitle="Paramètres système BioGate v7.0">
        <Button
          variant="accent" onClick={handleSave}
          disabled={saving || loadErr}
          title={loadErr ? 'Configuration non chargée — sauvegarde désactivée' : undefined}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Sauvegarder
        </Button>
      </PageHeader>

      {loadErr && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          padding: '10px 24px', background: 'rgba(242,63,67,.10)',
          borderBottom: '1px solid rgba(242,63,67,.25)',
        }}>
          <TriangleAlert size={14} style={{ color: 'var(--denied)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--denied)', flex: 1 }}>
            Configuration non chargée — serveur injoignable. Les valeurs affichées
            ne reflètent pas l'état réel du système ; la sauvegarde est désactivée.
          </span>
          <button
            onClick={fetchConfig}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
              fontSize: 13, fontWeight: 500, background: 'transparent',
              border: '1px solid rgba(242,63,67,.35)', color: 'var(--denied)',
              borderRadius: 6, cursor: 'pointer', flexShrink: 0,
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 1, flex: 1, overflow: 'hidden', background: 'var(--border)' }}>
          <div style={{ background: 'var(--card)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[80, 80, 80, 80].map((h, i) => <Skeleton key={i} style={{ height: h, borderRadius: 6 }} />)}
          </div>
          <div style={{ background: 'var(--background)', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[48, 48, 48, 48, 48].map((h, i) => <Skeleton key={i} style={{ height: h, borderRadius: 6 }} />)}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 1, flex: 1, overflow: 'hidden', background: 'var(--border)' }}>

          {/* ── Left: template nav ── */}
          <div style={{ background: 'var(--card)', overflow: 'auto', padding: '8px 8px 16px' }}>
            <div style={{
              padding: '14px 10px 6px',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
              textTransform: 'uppercase', color: 'var(--muted-foreground)',
            }}>
              Profil de sécurité
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {TEMPLATES.map(t => {
                const active = tpl === t.name
                return (
                  <button
                    key={t.name}
                    onClick={() => handleApplyTemplate(t.name)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      width: '100%', padding: '10px 12px',
                      borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: active ? 'rgba(88,101,242,0.12)' : 'transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{
                      width: 3, alignSelf: 'stretch', borderRadius: 2,
                      background: active ? t.color : 'transparent',
                      flexShrink: 0, marginTop: 2, marginBottom: 2,
                      transition: 'background 0.12s',
                    }} />
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, lineHeight: 1.3,
                        color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                        transition: 'color 0.12s',
                      }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2, lineHeight: 1.4 }}>
                        {t.desc}
                      </div>
                      {active && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          marginTop: 6, fontSize: 12, fontWeight: 500,
                          color: t.color, opacity: 0.85,
                        }}>
                          <Check size={9} />
                          Appliqué
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Right: settings ── */}
          <div style={{ background: 'var(--background)', overflow: 'auto' }}>

            {/* Reconnaissance faciale */}
            <SectionLabel icon={ScanFace}>Reconnaissance faciale</SectionLabel>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <Slider label="Seuil FaceNet512" cfgKey="FACE_RECOGNITION_THRESHOLD"
                min={0.15} max={0.70} step={0.01} value={cfg.FACE_RECOGNITION_THRESHOLD} onChange={patch} />
              <Slider label="Intervalle recheck" cfgKey="FACE_RECHECK_INTERVAL"
                min={0.3} max={3.0} step={0.1} unit=" s" value={cfg.FACE_RECHECK_INTERVAL} onChange={patch} />
              <Slider label="Limite d'analyse" cfgKey="FACE_ANALYSIS_TIME_LIMIT"
                min={0.5} max={5.0} step={0.1} unit=" s" value={cfg.FACE_ANALYSIS_TIME_LIMIT} onChange={patch} />
            </div>

            {/* MFA */}
            <SectionLabel icon={ShieldCheck}>MFA</SectionLabel>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <ParamToggle label="MFA obligatoire" cfgKey="MFA_REQUIRED" value={cfg.MFA_REQUIRED} onChange={patch} />
              <ParamToggle label="Liveness activé" cfgKey="LIVENESS_ENABLED" value={cfg.LIVENESS_ENABLED} onChange={patch} />
              <Slider label="Timeout empreinte" cfgKey="FINGERPRINT_TIMEOUT"
                min={5} max={60} unit=" s" value={cfg.FINGERPRINT_TIMEOUT} onChange={patch} />
              <Slider label="Timeout liveness" cfgKey="LIVENESS_CHALLENGE_TIMEOUT"
                min={5} max={30} unit=" s" value={cfg.LIVENESS_CHALLENGE_TIMEOUT} onChange={patch} />
            </div>

            {/* Alertes & RGPD */}
            <SectionLabel icon={Bell}>Alertes & RGPD</SectionLabel>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <Slider label="Fenêtre de grâce intrus" cfgKey="ALERT_GRACE_PERIOD"
                min={10} max={120} unit=" s" value={cfg.ALERT_GRACE_PERIOD} onChange={patch} />
              <Slider label="Rétention snapshots" cfgKey="RGPD_SNAPSHOT_RETENTION_HOURS"
                min={24} max={720} unit=" h" value={cfg.RGPD_SNAPSHOT_RETENTION_HOURS} onChange={patch} />
              <Row label="Purge automatique" cfgKey="">
                <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--muted-foreground)' }}>
                  Manuelle — voir Journal → Purge RGPD
                </span>
              </Row>
            </div>

            {/* IoT */}
            <SectionLabel icon={Wifi}>IoT — Actionneurs</SectionLabel>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <ParamToggle
                label="Signaux réseau réels" cfgKey="IOT_ENABLED"
                value={cfg.IOT_ENABLED} onChange={patch}
                note={!cfg.IOT_ENABLED ? 'Mode simulation — aucun signal envoyé aux ESP32.' : undefined}
              />
              <ParamText label="IP lecteur empreinte" cfgKey="FINGERPRINT_ESP32_IP"
                placeholder="192.168.1.101" value={cfg.FINGERPRINT_ESP32_IP} onChange={patch} />
              <ParamText label="IP gâche porte" cfgKey="DOOR_ESP32_IP"
                placeholder="192.168.1.102" value={cfg.DOOR_ESP32_IP} onChange={patch} />
              <ParamText label="IP éclairage" cfgKey="LIGHT_ESP32_IP"
                placeholder="192.168.1.103" value={cfg.LIGHT_ESP32_IP} onChange={patch} />
            </div>

            {/* Caméras */}
            <CameraSection />

            {/* Padding bas */}
            <div style={{ height: 32 }} />
          </div>
        </div>
      )}
    </div>
  )
}
