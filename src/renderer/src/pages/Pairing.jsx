import { useState } from 'react'
import { ArrowLeft, Loader2, Plug, KeyRound, ShieldCheck } from 'lucide-react'
import { requestPair, authToken } from '../api/client'
import { bridge } from '../api/bridge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Field } from '../components/ui/field'

export default function Pairing({ onPaired }) {
  const [step,      setStep]      = useState('url')   // 'url' | 'pin'
  const [serverUrl, setServerUrl] = useState('http://192.168.1.100:8000')
  const [pin,       setPin]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  // Étape 1 : demande le PIN au serveur (généré et affiché dans son terminal)
  async function handleRequestPin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // L'adresse est nettoyée avant usage : une espace collée au copier-coller
      // se retrouvait sinon stockée dans la configuration.
      const url = serverUrl.trim().replace(/\/+$/, '')
      setServerUrl(url)
      await requestPair(url)
      setStep('pin')
    } catch (err) {
      setError(`Impossible de joindre le serveur : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Étape 2 : envoie le PIN, récupère le jeton
  async function handleSubmitPin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res   = await authToken(serverUrl, pin.trim())
      const token = res.data.access_token
      await bridge.config.set({ serverUrl })
      await bridge.token.set(token)
      onPaired(serverUrl, token)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message
      setError(`Échec : ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--background)', padding: 24,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 420,
          background: 'var(--card)',
          border: '1px solid var(--border-hi)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          padding: 32,
        }}
      >
        {/* Marque */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(88,101,242,0.12)',
              border: '1px solid rgba(88,101,242,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ShieldCheck size={19} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              BioGate
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
              v7.0 · Contrôle d'accès Edge AI
            </div>
          </div>
        </div>

        {/* Indicateur d'étape */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '26px 0 20px' }}>
          <StepDot active label="1" />
          <div style={{ flex: 1, height: 1, background: step === 'pin' ? 'var(--primary)' : 'var(--border-hi)' }} />
          <StepDot active={step === 'pin'} label="2" />
        </div>

        {step === 'url' && (
          <form onSubmit={handleRequestPin}>
            <Field
              label="Adresse du serveur"
              hint="Le serveur BioGate doit tourner sur le même réseau. Un code PIN s'affichera dans son terminal."
            >
              {id => (
                <Input
                  id={id}
                  type="text"
                  value={serverUrl}
                  onChange={e => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.100:8000"
                  required
                />
              )}
            </Field>

            {error && <ErrorNote>{error}</ErrorNote>}

            <Button
              type="submit" variant="primary" size="lg"
              className="w-full justify-center mt-5"
              disabled={loading || !serverUrl.trim()}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Plug size={15} />}
              Connecter et générer un PIN
            </Button>
          </form>
        )}

        {step === 'pin' && (
          <form onSubmit={handleSubmitPin}>
            <Field
              label="Code PIN"
              hint="Le PIN est affiché dans le terminal du serveur. Il expire au bout de 5 minutes et tolère 5 tentatives."
            >
              {id => (
                <Input
                  id={id}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  required
                  className="font-mono text-center"
                  style={{ fontSize: 22, letterSpacing: '0.4em', height: 48 }}
                />
              )}
            </Field>

            {error && <ErrorNote>{error}</ErrorNote>}

            <Button
              type="submit" variant="primary" size="lg"
              className="w-full justify-center mt-5"
              disabled={loading || pin.length !== 6}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              Valider le PIN
            </Button>

            <Button
              type="button" variant="ghost" size="sm"
              className="w-full justify-center mt-2"
              onClick={() => { setStep('url'); setPin(''); setError('') }}
            >
              <ArrowLeft size={13} />
              Changer d'adresse serveur
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

function StepDot({ active, label }) {
  return (
    <div
      style={{
        width: 22, height: 22, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        background: active ? 'var(--primary)' : 'transparent',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border-hi)'}`,
        color: active ? '#fff' : 'var(--muted-foreground)',
        transition: 'background .15s, border-color .15s, color .15s',
      }}
    >
      {label}
    </div>
  )
}

function ErrorNote({ children }) {
  return (
    <div
      role="alert"
      style={{
        marginTop: 14,
        background: 'rgba(242,63,67,.10)',
        border: '1px solid rgba(242,63,67,.24)',
        borderRadius: 8, padding: '10px 12px',
        fontSize: 13, lineHeight: 1.45, color: 'var(--denied)',
      }}
    >
      {children}
    </div>
  )
}
