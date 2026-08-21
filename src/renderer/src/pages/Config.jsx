import { useState, useEffect, useCallback } from 'react'
import { getConfig, putConfig, getTemplates, applyTemplate,
         getCameras, addCamera, deleteCamera, scanUsbCameras } from '../api/client'
import Toggle from '../components/Toggle'

const TEMPLATES = [
  { name: 'portail',        label: 'Portail',       desc: 'MFA off · Seuil souple 0.35' },
  { name: 'domicile',       label: 'Domicile',       desc: 'MFA optionnel · Liveness on' },
  { name: 'bureau',         label: 'Bureau',         desc: 'MFA obligatoire · Fingerprint' },
  { name: 'haute_securite', label: 'Haute Sécurité', desc: 'MFA + fingerprint + liveness' },
]

const CAM_TYPES = [
  { value: 'usb',   label: 'USB / Webcam' },
  { value: 'mjpeg', label: 'MJPEG HTTP (ex: BW21-CBV)' },
  { value: 'rtsp',  label: 'RTSP (caméra IP)' },
  { value: 'file',  label: 'Fichier vidéo (test)' },
]

function Slider({ label, cfgKey, min, max, step = 1, unit = '', value, onChange }) {
  const id = `sl-${cfgKey}`
  return (
    <div className="prow">
      <div>
        <div className="pname">{label}</div>
        <div className="pkey">{cfgKey}</div>
      </div>
      <div className="pctrl">
        <input
          id={id} type="range" min={min} max={max} step={step}
          value={value ?? min}
          onChange={e => onChange(cfgKey, step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        />
        <span className="pval">{value}{unit}</span>
      </div>
    </div>
  )
}

function ParamToggle({ label, cfgKey, value, onChange }) {
  return (
    <div className="prow">
      <div>
        <div className="pname">{label}</div>
        <div className="pkey">{cfgKey}</div>
      </div>
      <div className="pctrl">
        <Toggle value={!!value} onChange={v => onChange(cfgKey, v)} />
      </div>
    </div>
  )
}

function ParamText({ label, cfgKey, placeholder, value, onChange, disabled }) {
  return (
    <div className="prow">
      <div>
        <div className="pname">{label}</div>
        <div className="pkey">{cfgKey}</div>
      </div>
      <div className="pctrl">
        <input
          type="text"
          className="field-input"
          style={{ width: 150, fontSize: 12 }}
          placeholder={placeholder}
          value={value ?? ''}
          disabled={disabled}
          onChange={e => onChange(cfgKey, e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Section Sources Vidéo ─────────────────────────────────────────────

const EMPTY_CAM = { name: '', type: 'usb', url: '', usb_index: 0, zone: '' }

function CameraSection() {
  const [cameras,    setCameras]    = useState([])
  const [scanning,   setScanning]   = useState(false)
  const [usbDevices, setUsbDevices] = useState([])
  const [form,       setForm]       = useState(EMPTY_CAM)
  const [adding,     setAdding]     = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [err,        setErr]        = useState('')

  const loadCameras = useCallback(() => {
    getCameras().then(r => setCameras(r.data?.cameras || [])).catch(() => {})
  }, [])

  useEffect(() => { loadCameras() }, [loadCameras])

  async function handleScan() {
    setScanning(true)
    setErr('')
    try {
      const res = await scanUsbCameras()
      setUsbDevices(res.data?.devices || [])
      if ((res.data?.devices || []).length === 0)
        setErr('Aucune webcam USB détectée.')
    } catch (ex) {
      const status = ex.response?.status
      const detail = ex.response?.data?.detail || ex.message || 'inconnue'
      setErr(`[HTTP ${status ?? 'réseau'}] ${detail}`)
    } finally {
      setScanning(false)
    }
  }

  function prefillUsb(dev) {
    setForm({ name: dev.label, type: 'usb', url: '', usb_index: dev.usb_index, zone: '' })
    setShowForm(true)
    setUsbDevices([])
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Nom requis.'); return }
    setAdding(true); setErr('')
    try {
      await addCamera(form)
      setForm(EMPTY_CAM)
      setShowForm(false)
      loadCameras()
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Erreur lors de l\'ajout.')
    } finally { setAdding(false) }
  }

  async function handleDelete(cam_id, name) {
    if (!confirm(`Supprimer la source "${name}" ?`)) return
    try {
      await deleteCamera(cam_id)
      loadCameras()
    } catch { setErr('Erreur lors de la suppression.') }
  }

  const needsUrl = ['mjpeg', 'rtsp', 'file'].includes(form.type)

  return (
    <div className="pgroup cam-section">
      <div className="pgroup-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>Sources vidéo</span>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-sm" onClick={handleScan} disabled={scanning}>
            {scanning ? <span className="spinner" /> : '⌕ Détecter USB'}
          </button>
          <button className="btn btn-sm btn-accent" onClick={() => { setShowForm(v => !v); setErr('') }}>
            {showForm ? '✕ Annuler' : '+ Ajouter'}
          </button>
        </div>
      </div>

      {err && <div className="cam-err">{err}</div>}

      {/* Résultats scan USB */}
      {usbDevices.length > 0 && (
        <div className="cam-usb-list">
          <div className="pkey" style={{ marginBottom:6 }}>Webcams détectées — cliquer pour pré-remplir :</div>
          {usbDevices.map(d => (
            <button key={d.usb_index} className="btn btn-sm cam-usb-chip" onClick={() => prefillUsb(d)}>
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showForm && (
        <form className="cam-form" onSubmit={handleAdd}>
          <div className="cam-form-row">
            <label>Nom</label>
            <input
              type="text" placeholder="ex: Portail avant"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="cam-form-row">
            <label>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {CAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {needsUrl && (
            <div className="cam-form-row">
              <label>URL</label>
              <input
                type="text"
                placeholder={form.type === 'mjpeg' ? 'http://192.168.1.X/stream' : form.type === 'rtsp' ? 'rtsp://user:pass@192.168.1.X/stream' : '/chemin/vers/video.mp4'}
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              />
            </div>
          )}
          {form.type === 'usb' && (
            <div className="cam-form-row">
              <label>Index USB</label>
              <input
                type="number" min={0} max={7}
                value={form.usb_index}
                onChange={e => setForm(f => ({ ...f, usb_index: parseInt(e.target.value) || 0 }))}
                style={{ width:70 }}
              />
              <span className="pkey" style={{ marginLeft:8 }}>0 = webcam principale</span>
            </div>
          )}
          <div className="cam-form-row">
            <label>Zone</label>
            <input
              type="text" placeholder="ex: Entrée, Couloir, Bureau…"
              value={form.zone}
              onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
            />
          </div>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button type="submit" className="btn btn-accent" disabled={adding}>
              {adding ? <span className="spinner" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* Liste des caméras enregistrées */}
      <div className="cam-list">
        {cameras.length === 0 ? (
          <div className="cam-empty">Aucune source vidéo configurée</div>
        ) : cameras.map(c => (
          <div className="cam-row" key={c.cam_id}>
            <div className="cam-status-dot" style={{ background: c.connected ? 'var(--granted)' : c.running ? 'var(--pending)' : 'var(--t4)' }} />
            <div className="cam-info">
              <div className="cam-name">{c.name}</div>
              <div className="cam-meta">
                <span className="cam-tag">{c.type.toUpperCase()}</span>
                {c.zone && <span className="cam-tag">{c.zone}</span>}
                {c.type === 'usb' && <span className="cam-tag">USB #{c.usb_index}</span>}
                {c.url && <span className="cam-url" title={c.url}>{c.url}</span>}
              </div>
            </div>
            <div className="cam-fps">
              {c.running ? (
                <span style={{ color: c.connected ? 'var(--granted)' : 'var(--pending)', fontFamily:'var(--fm)', fontSize:10 }}>
                  {c.connected ? `${c.fps} fps` : 'Connexion…'}
                </span>
              ) : (
                <span style={{ color:'var(--t4)', fontFamily:'var(--fm)', fontSize:10 }}>hors ligne</span>
              )}
            </div>
            <button
              className="btn btn-sm btn-danger-ghost"
              onClick={() => handleDelete(c.cam_id, c.name)}
              title="Supprimer cette source"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page principale Config ────────────────────────────────────────────

export default function Config() {
  const [cfg,      setCfg]      = useState({})
  const [tpl,      setTpl]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    getConfig()
      .then(r => setCfg(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function patch(key, val) {
    setCfg(c => ({ ...c, [key]: val }))
    setSaved(false)
  }

  async function handleApplyTemplate(name) {
    setTpl(name)
    try {
      const res = await applyTemplate(name)
      setCfg(res.data.config || res.data)
    } catch { /* ignore */ }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await putConfig(cfg)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="topbar">
        <span className="page-title">Configuration</span>
        <div className="topbar-right">
          {saved && <span style={{ fontFamily:'var(--fm)', fontSize:10, color:'var(--granted)' }}>✓ Sauvegardé</span>}
          <button className="btn btn-accent" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : (
        <div className="cfg-layout">
          {/* Templates */}
          <div className="cfg-templates">
            <div className="slabel">Templates</div>
            {TEMPLATES.map(t => (
              <div
                key={t.name}
                className={`tpl-item${tpl === t.name ? ' active' : ''}`}
                onClick={() => handleApplyTemplate(t.name)}
              >
                <div className="tpl-name">{t.label}</div>
                <div className="tpl-desc">{t.desc}</div>
              </div>
            ))}
          </div>

          {/* Paramètres + Sources vidéo */}
          <div className="cfg-params">
            <div className="pgroup">
              <div className="pgroup-title">Reconnaissance faciale</div>
              <Slider label="Seuil FaceNet512" cfgKey="FACE_RECOGNITION_THRESHOLD"
                min={0.15} max={0.70} step={0.01} value={cfg.FACE_RECOGNITION_THRESHOLD} onChange={patch} />
              <Slider label="Intervalle recheck (s)" cfgKey="FACE_RECHECK_INTERVAL"
                min={0.3} max={3.0} step={0.1} unit="s" value={cfg.FACE_RECHECK_INTERVAL} onChange={patch} />
              <Slider label="Limite d'analyse (s)" cfgKey="FACE_ANALYSIS_TIME_LIMIT"
                min={0.5} max={5.0} step={0.1} unit="s" value={cfg.FACE_ANALYSIS_TIME_LIMIT} onChange={patch} />
            </div>

            <div className="pgroup">
              <div className="pgroup-title">MFA</div>
              <ParamToggle label="MFA obligatoire"  cfgKey="MFA_REQUIRED"      value={cfg.MFA_REQUIRED}      onChange={patch} />
              <ParamToggle label="Liveness activé"  cfgKey="LIVENESS_ENABLED"  value={cfg.LIVENESS_ENABLED}  onChange={patch} />
              <Slider label="Timeout empreinte (s)" cfgKey="FINGERPRINT_TIMEOUT"
                min={5} max={60} unit="s" value={cfg.FINGERPRINT_TIMEOUT} onChange={patch} />
              <Slider label="Timeout liveness (s)"  cfgKey="LIVENESS_CHALLENGE_TIMEOUT"
                min={5} max={30} unit="s" value={cfg.LIVENESS_CHALLENGE_TIMEOUT} onChange={patch} />
            </div>

            <div className="pgroup">
              <div className="pgroup-title">Alertes & RGPD</div>
              <Slider label="Fenêtre de grâce intrus (s)" cfgKey="ALERT_GRACE_PERIOD"
                min={10} max={120} unit="s" value={cfg.ALERT_GRACE_PERIOD} onChange={patch} />
              <Slider label="Rétention snapshots (h)" cfgKey="RGPD_SNAPSHOT_RETENTION_HOURS"
                min={24} max={720} unit="h" value={cfg.RGPD_SNAPSHOT_RETENTION_HOURS} onChange={patch} />
              <div className="prow" style={{ opacity: 0.7 }}>
                <div className="pname">Purge automatique</div>
                <div className="pctrl" style={{ fontSize: 10, fontFamily: 'var(--fm)' }}>
                  Manuelle uniquement — voir Journal → « Purge RGPD »
                </div>
              </div>
            </div>

            <div className="pgroup">
              <div className="pgroup-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>IoT — Actionneurs</span>
                <span style={{
                  fontFamily: 'var(--fm)', fontSize: 9, padding: '2px 6px', borderRadius: 3,
                  color: cfg.IOT_ENABLED ? 'var(--granted)' : 'var(--pending, #d9a441)',
                  border: `1px solid ${cfg.IOT_ENABLED ? 'var(--granted)' : 'var(--pending, #d9a441)'}`,
                }}>
                  {cfg.IOT_ENABLED ? 'RÉEL' : 'MOCK'}
                </span>
              </div>
              <ParamToggle label="Signaux réseau réels" cfgKey="IOT_ENABLED" value={cfg.IOT_ENABLED} onChange={patch} />
              {!cfg.IOT_ENABLED && (
                <div className="prow" style={{ opacity: 0.6 }}>
                  <div className="pctrl" style={{ fontSize: 10, fontFamily: 'var(--fm)' }}>
                    Mode simulation — aucun signal envoyé aux ESP32 tant que désactivé.
                  </div>
                </div>
              )}
              <ParamText label="IP lecteur empreinte" cfgKey="FINGERPRINT_ESP32_IP"
                placeholder="192.168.1.101" value={cfg.FINGERPRINT_ESP32_IP} onChange={patch} />
              <ParamText label="IP gâche porte" cfgKey="DOOR_ESP32_IP"
                placeholder="192.168.1.102" value={cfg.DOOR_ESP32_IP} onChange={patch} />
              <ParamText label="IP éclairage" cfgKey="LIGHT_ESP32_IP"
                placeholder="192.168.1.103" value={cfg.LIGHT_ESP32_IP} onChange={patch} />
            </div>

            {/* Sources vidéo */}
            <CameraSection />
          </div>
        </div>
      )}
    </>
  )
}
