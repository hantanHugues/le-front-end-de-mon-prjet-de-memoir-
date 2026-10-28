import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { RefreshCw, TriangleAlert, Bell, ShieldAlert, ShieldCheck, ServerCrash, Send, Mail, Search } from 'lucide-react'
import { getLogs, getConfig, putConfig, testAlert, detectTelegramChat } from '../api/client'
import { bridge } from '../api/bridge'
import { EVENT_TYPES } from '../constants/events'
import { Switch } from '../components/ui/switch'
import { Skeleton } from '../components/ui/skeleton'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { PageHeader } from '../components/ui/page-header'
import { EmptyState } from '../components/ui/empty-state'
import { SectionLabel } from '../components/ui/section-label'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'

const KEY_N_INTRUDER = 'biogate_notif_intruder'
const KEY_N_DENIED   = 'biogate_notif_denied'
const KEY_N_TIMEOUT  = 'biogate_notif_timeout'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ls(key, def) {
  try { const v = localStorage.getItem(key); return v === null ? def : JSON.parse(v) } catch { return def }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR') + ' · ' + d.toLocaleTimeString('fr-FR', { hour12: false })
}

function errText(e) {
  const d = e?.response?.data
  return d?.message || (typeof d?.detail === 'string' ? d.detail : null) || 'Serveur injoignable.'
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
  const filename = log.snapshot_path ? log.snapshot_path.split(/[\\/]/).pop() : null
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

// `aria-label` porté par le Switch : le libellé est un élément frère, jamais
// associé au contrôle — un lecteur d'écran annonçait « interrupteur, coché »
// sans dire de quoi il s'agissait.
function NotifRow({ name, eventKey, checked, onChange, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '11px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 2 }}>
          {name}
        </div>
        <div style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--muted-foreground)' }}>
          {eventKey}
        </div>
      </div>
      <Switch aria-label={name} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// L'état dit si l'alerte partira réellement : un canal activé mais incomplet
// ne doit pas avoir l'air de fonctionner.
function ChannelStatus({ enabled, ready }) {
  if (!enabled) return <Badge variant="ghost">Désactivé</Badge>
  return ready ? <Badge variant="granted">Actif</Badge> : <Badge variant="pending">Incomplet</Badge>
}

function ChannelHeader({ icon: Icon, title, enabled, ready, onToggle, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 0 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Icon size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{title}</span>
        <ChannelStatus enabled={enabled} ready={ready} />
      </div>
      <Switch
        aria-label={`Activer les alertes ${title}`}
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  )
}

function Help({ children }) {
  return (
    <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--muted-foreground)', marginBottom: 14 }}>
      {children}
    </p>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */

const EMPTY_FORM = {
  ALERT_TELEGRAM_ENABLED: false, TELEGRAM_CHAT_ID: '',
  ALERT_EMAIL_ENABLED: false, SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '587', SMTP_USER: '', ALERT_EMAIL_TO: '',
}

export default function Alertes() {
  const [intruders, setIntruders] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [loadErr,   setLoadErr]   = useState(false)

  const [form,     setForm]     = useState(EMPTY_FORM)
  // Les secrets ne reviennent jamais du serveur : on sait seulement s'ils sont enregistrés.
  const [saved,    setSaved]    = useState({ token: false, password: false })
  const [typed,    setTyped]    = useState({ token: '', password: '' })
  const [cfgState, setCfgState] = useState('loading') // loading | ok | error
  const [busy,     setBusy]     = useState(null)

  const [nIntruder, setNIntruder] = useState(() => ls(KEY_N_INTRUDER, true))
  const [nDenied,   setNDenied]   = useState(() => ls(KEY_N_DENIED, false))
  const [nTimeout,  setNTimeout]  = useState(() => ls(KEY_N_TIMEOUT, true))

  function fetchIntruders() {
    setLoading(true)
    return getLogs({ event_type: EVENT_TYPES.INTRUDER_CONFIRMED, days: 30 })
      .then(r => { setIntruders(r.data.logs || r.data || []); setLoadErr(false) })
      .catch(() => { setIntruders([]); setLoadErr(true) })
      .finally(() => setLoading(false))
  }

  function loadAlertConfig() {
    setCfgState('loading')
    return getConfig()
      .then(r => {
        const c = r.data
        setForm({
          ALERT_TELEGRAM_ENABLED: !!c.ALERT_TELEGRAM_ENABLED,
          TELEGRAM_CHAT_ID: c.TELEGRAM_CHAT_ID ?? '',
          ALERT_EMAIL_ENABLED: !!c.ALERT_EMAIL_ENABLED,
          SMTP_HOST: c.SMTP_HOST ?? '',
          SMTP_PORT: String(c.SMTP_PORT ?? '587'),
          SMTP_USER: c.SMTP_USER ?? '',
          ALERT_EMAIL_TO: c.ALERT_EMAIL_TO ?? '',
        })
        setSaved({ token: !!c.TELEGRAM_BOT_TOKEN, password: !!c.SMTP_PASSWORD })
        setCfgState('ok')
      })
      .catch(() => setCfgState('error'))
  }

  useEffect(() => { fetchIntruders(); loadAlertConfig() }, [])

  const formDisabled = cfgState !== 'ok'
  const patchForm = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const telegramReady = (saved.token || !!typed.token.trim()) && !!form.TELEGRAM_CHAT_ID.trim()
  const emailReady = !!form.SMTP_HOST.trim() && !!form.SMTP_PORT && !!form.SMTP_USER.trim()
    && (saved.password || !!typed.password) && !!form.ALERT_EMAIL_TO.trim()

  async function run(key, fn) {
    setBusy(key)
    try { return await fn() } catch (e) { toast.error(errText(e)); return false } finally { setBusy(null) }
  }

  async function setFlag(key, value) {
    const previous = form[key]
    setForm(f => ({ ...f, [key]: value }))
    try {
      await putConfig({ [key]: value })
    } catch (e) {
      setForm(f => ({ ...f, [key]: previous }))
      toast.error(errText(e))
    }
  }

  async function persistToken() {
    const token = typed.token.trim()
    if (!token) return
    await putConfig({ TELEGRAM_BOT_TOKEN: token })
    setSaved(s => ({ ...s, token: true }))
    setTyped(t => ({ ...t, token: '' }))
  }

  async function saveTelegram() {
    const chat = form.TELEGRAM_CHAT_ID.trim()
    if (chat && !/^-?\d+$/.test(chat)) {
      toast.error("L'identifiant de conversation est un nombre (ex. 123456789).")
      return false
    }
    await persistToken()
    await putConfig({ TELEGRAM_CHAT_ID: chat })
    return true
  }

  async function saveEmail() {
    const port = Number(form.SMTP_PORT)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast.error('Le port doit être un nombre entre 1 et 65535 (587 ou 465).')
      return false
    }
    const user = form.SMTP_USER.trim()
    if (user && !EMAIL_RE.test(user)) {
      toast.error("Le compte d'envoi doit être une adresse e-mail.")
      return false
    }
    const recipients = form.ALERT_EMAIL_TO.split(/[;,]/).map(s => s.trim()).filter(Boolean)
    const invalid = recipients.find(a => !EMAIL_RE.test(a))
    if (invalid) {
      toast.error(`Adresse de destinataire invalide : ${invalid}`)
      return false
    }
    const payload = {
      SMTP_HOST: form.SMTP_HOST.trim(), SMTP_PORT: port, SMTP_USER: user,
      ALERT_EMAIL_TO: recipients.join(', '),
    }
    if (typed.password) payload.SMTP_PASSWORD = typed.password
    await putConfig(payload)
    if (typed.password) {
      setSaved(s => ({ ...s, password: true }))
      setTyped(t => ({ ...t, password: '' }))
    }
    setForm(f => ({ ...f, SMTP_HOST: payload.SMTP_HOST, SMTP_USER: user, ALERT_EMAIL_TO: payload.ALERT_EMAIL_TO }))
    return true
  }

  const onSaveTelegram = () => run('tg-save', async () => {
    if (await saveTelegram()) toast.success('Réglages Telegram enregistrés.')
  })
  const onSaveEmail = () => run('em-save', async () => {
    if (await saveEmail()) toast.success('Réglages e-mail enregistrés.')
  })

  // Le test enregistre d'abord : le serveur teste ce qu'il a en base, pas ce qui est à l'écran.
  const onTest = (channel, key, save) => () => run(key, async () => {
    if (!(await save())) return
    const r = await testAlert(channel)
    r.data.success ? toast.success(r.data.message) : toast.error(r.data.message)
  })

  const onDetectChat = () => run('tg-detect', async () => {
    if (!saved.token && !typed.token.trim()) {
      toast.error("Saisissez d'abord le jeton du bot.")
      return
    }
    await persistToken()
    const r = await detectTelegramChat()
    if (!r.data.success) { toast.error(r.data.message); return }
    await putConfig({ TELEGRAM_CHAT_ID: r.data.chat_id })
    setForm(f => ({ ...f, TELEGRAM_CHAT_ID: r.data.chat_id }))
    toast.success(r.data.label ? `Conversation trouvée : ${r.data.label}` : 'Conversation trouvée.')
  })

  function toggle(setter, key) {
    return val => { setter(val); lsSet(key, val) }
  }

  function handleTestDesktop() {
    bridge.notify('BioGate — Test', 'Notification desktop fonctionnelle ✓')
    toast.success('Notification desktop envoyée')
  }

  const spin = (key, Icon) => busy === key
    ? <RefreshCw size={14} className="animate-spin" />
    : <Icon size={14} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <PageHeader title="Alertes" subtitle="Intrusions — 30 derniers jours">
        <Button onClick={() => { fetchIntruders(); loadAlertConfig() }} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </Button>
      </PageHeader>

      {/* 2-col layout */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px',
        gap: 1, background: 'var(--border)', overflow: 'hidden',
      }}>

        {/* Alert list */}
        <div style={{ background: 'var(--background)', overflowY: 'auto' }}>
          <SectionLabel icon={ShieldAlert} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            Intrusions confirmées
          </SectionLabel>

          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <Skeleton style={{ height: 34, borderRadius: 4 }} />
            </div>
          ))}

          {!loading && loadErr && (
            <EmptyState
              variant="error"
              icon={ServerCrash}
              title="Serveur injoignable"
              description="Impossible de récupérer les alertes. Vérifiez que le service BioGate est démarré."
              action={<Button variant="accent" onClick={fetchIntruders}><RefreshCw size={14} /> Réessayer</Button>}
            />
          )}

          {!loading && !loadErr && intruders.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title="Aucune intrusion détectée"
              description="Aucune intrusion n'a été confirmée sur les 30 derniers jours. Le système fonctionne normalement."
            />
          )}

          {!loading && !loadErr && intruders.map((log, i) => (
            <AlertItem key={log.id ?? i} log={log} />
          ))}
        </div>

        {/* Right config */}
        <div style={{ background: 'var(--card)', overflowY: 'auto' }}>

          {cfgState === 'error' && (
            <div style={{
              margin: '20px 20px 0',
              background: 'rgba(242,63,67,.08)', border: '1px solid rgba(242,63,67,.22)',
              borderRadius: 8, padding: '10px 12px',
              fontSize: 12, lineHeight: 1.5, color: 'var(--denied)',
            }}>
              Configuration des alertes inaccessible : le serveur ne répond pas.
              <div style={{ marginTop: 8 }}>
                <Button variant="ghost" size="sm" onClick={loadAlertConfig}>
                  <RefreshCw size={14} /> Réessayer
                </Button>
              </div>
            </div>
          )}

          {/* Telegram */}
          <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)' }}>
            <ChannelHeader
              icon={Send} title="Telegram"
              enabled={form.ALERT_TELEGRAM_ENABLED} ready={telegramReady} disabled={formDisabled}
              onToggle={v => setFlag('ALERT_TELEGRAM_ENABLED', v)}
            />
            <Help>
              Reçoit la photo de l'intrus sur votre téléphone. Dans Telegram, ouvrez @BotFather,
              envoyez /newbot et copiez le jeton. Écrivez ensuite « salut » à votre nouveau bot,
              puis cliquez sur Détecter.
            </Help>

            <Field
              label="Jeton du bot" style={{ marginBottom: 16 }}
              hint={saved.token ? 'Jeton enregistré sur le serveur, il ne s\'affiche plus. Saisissez-en un nouveau pour le remplacer.' : undefined}
            >
              {id => (
                <Input
                  id={id} type="password" autoComplete="off" className="font-mono"
                  value={typed.token} disabled={formDisabled}
                  placeholder={saved.token ? 'Enregistré (laisser vide)' : '123456789:AA…'}
                  onChange={e => setTyped(t => ({ ...t, token: e.target.value }))}
                />
              )}
            </Field>

            <Field label="Identifiant de conversation">
              {id => (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    id={id} inputMode="numeric" className="font-mono"
                    value={form.TELEGRAM_CHAT_ID} disabled={formDisabled}
                    placeholder="123456789"
                    onChange={patchForm('TELEGRAM_CHAT_ID')}
                  />
                  <Button onClick={onDetectChat} disabled={formDisabled || busy !== null}>
                    {spin('tg-detect', Search)}
                    Détecter
                  </Button>
                </div>
              )}
            </Field>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button className="flex-1" onClick={onSaveTelegram} disabled={formDisabled || busy !== null}>
                {busy === 'tg-save' && <RefreshCw size={14} className="animate-spin" />}
                Enregistrer
              </Button>
              <Button
                variant="accent" className="flex-1" disabled={formDisabled || busy !== null}
                onClick={onTest('telegram', 'tg-test', saveTelegram)}
              >
                {spin('tg-test', Send)}
                Envoyer un test
              </Button>
            </div>
          </div>

          {/* E-mail */}
          <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)' }}>
            <ChannelHeader
              icon={Mail} title="E-mail"
              enabled={form.ALERT_EMAIL_ENABLED} ready={emailReady} disabled={formDisabled}
              onToggle={v => setFlag('ALERT_EMAIL_ENABLED', v)}
            />
            <Help>
              Envoie la photo en pièce jointe. Avec Gmail, activez la validation en 2 étapes puis créez
              un « mot de passe d'application » dans votre compte Google : le mot de passe habituel est refusé.
            </Help>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 84px', gap: 8, marginBottom: 16 }}>
              <Field label="Serveur SMTP">
                {id => (
                  <Input
                    id={id} value={form.SMTP_HOST} disabled={formDisabled}
                    placeholder="smtp.gmail.com" onChange={patchForm('SMTP_HOST')}
                  />
                )}
              </Field>
              <Field label="Port">
                {id => (
                  <Input
                    id={id} inputMode="numeric" className="font-mono"
                    value={form.SMTP_PORT} disabled={formDisabled}
                    placeholder="587" onChange={patchForm('SMTP_PORT')}
                  />
                )}
              </Field>
            </div>

            <Field label="Compte d'envoi" style={{ marginBottom: 16 }}>
              {id => (
                <Input
                  id={id} type="email" autoComplete="off"
                  value={form.SMTP_USER} disabled={formDisabled}
                  placeholder="alertes@gmail.com" onChange={patchForm('SMTP_USER')}
                />
              )}
            </Field>

            <Field
              label="Mot de passe d'application" style={{ marginBottom: 16 }}
              hint={saved.password ? 'Mot de passe enregistré sur le serveur, il ne s\'affiche plus.' : undefined}
            >
              {id => (
                <Input
                  id={id} type="password" autoComplete="new-password" className="font-mono"
                  value={typed.password} disabled={formDisabled}
                  placeholder={saved.password ? 'Enregistré (laisser vide)' : 'xxxx xxxx xxxx xxxx'}
                  onChange={e => setTyped(t => ({ ...t, password: e.target.value }))}
                />
              )}
            </Field>

            <Field label="Destinataire(s)" hint="Plusieurs adresses possibles, séparées par une virgule.">
              {id => (
                <Input
                  id={id} autoComplete="off"
                  value={form.ALERT_EMAIL_TO} disabled={formDisabled}
                  placeholder="vous@exemple.com" onChange={patchForm('ALERT_EMAIL_TO')}
                />
              )}
            </Field>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button className="flex-1" onClick={onSaveEmail} disabled={formDisabled || busy !== null}>
                {busy === 'em-save' && <RefreshCw size={14} className="animate-spin" />}
                Enregistrer
              </Button>
              <Button
                variant="accent" className="flex-1" disabled={formDisabled || busy !== null}
                onClick={onTest('email', 'em-test', saveEmail)}
              >
                {spin('em-test', Mail)}
                Envoyer un test
              </Button>
            </div>
          </div>

          {/* Notifications desktop */}
          <div style={{ padding: '0 20px 18px' }}>
            <SectionLabel icon={Bell} style={{ padding: '20px 0 10px' }}>
              Notifications desktop
            </SectionLabel>
            <NotifRow
              name="Intrus confirmé" eventKey="INTRUDER_CONFIRMED"
              checked={nIntruder} onChange={toggle(setNIntruder, KEY_N_INTRUDER)}
            />
            <NotifRow
              name="Accès refusé" eventKey="DENIED"
              checked={nDenied} onChange={toggle(setNDenied, KEY_N_DENIED)}
            />
            <NotifRow
              name="Timeout MFA" eventKey="MFA_TIMEOUT"
              checked={nTimeout} onChange={toggle(setNTimeout, KEY_N_TIMEOUT)}
              last
            />
            <Button variant="accent" className="w-full" style={{ marginTop: 16 }} onClick={handleTestDesktop}>
              <Bell size={14} />
              Test notification desktop
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
