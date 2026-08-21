import { useState } from 'react'
import { requestPair, authToken } from '../api/client'

export default function Pairing({ onPaired }) {
  const [step,      setStep]      = useState('url')   // 'url' | 'pin'
  const [serverUrl, setServerUrl] = useState('http://192.168.1.100:8000')
  const [pin,       setPin]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  // Étape 1 : demande le PIN au serveur (génère et affiche dans le terminal)
  async function handleRequestPin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPair(serverUrl)
      setStep('pin')
    } catch (err) {
      setError(`Impossible de joindre le serveur : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Étape 2 : envoie le PIN, récupère le JWT
  async function handleSubmitPin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res   = await authToken(serverUrl, pin.trim())
      const token = res.data.access_token
      await window.electronAPI.config.set({ serverUrl })
      await window.electronAPI.token.set(token)
      onPaired(serverUrl, token)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message
      setError(`Échec : ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pairing-screen">
      <div className="pairing-card">
        <div className="pairing-logo">BioGate</div>
        <div className="pairing-sub">Dashboard · Connexion initiale</div>

        {step === 'url' && (
          <form onSubmit={handleRequestPin}>
            <div className="field">
              <div className="field-label">Adresse du serveur</div>
              <input
                className="field-input"
                type="text"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="http://192.168.1.100:8000"
                required
              />
            </div>
            <p className="pairing-hint">
              Le serveur BioGate doit être démarré sur le même réseau Wi-Fi.
              Un code PIN sera affiché dans son terminal.
            </p>
            {error && <div className="pairing-err">{error}</div>}
            <button className="btn btn-accent" style={{ width:'100%', justifyContent:'center', padding:'9px' }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Connecter → générer PIN'}
            </button>
          </form>
        )}

        {step === 'pin' && (
          <form onSubmit={handleSubmitPin}>
            <div className="field">
              <div className="field-label">Code PIN (affiché dans le terminal serveur)</div>
              <input
                className="field-input mono"
                type="text"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g,''))}
                placeholder="000000"
                autoFocus
                required
              />
            </div>
            <p className="pairing-hint">
              Le PIN expire dans 5 minutes et est limité à 5 tentatives.
            </p>
            {error && <div className="pairing-err">{error}</div>}
            <button className="btn btn-accent" style={{ width:'100%', justifyContent:'center', padding:'9px' }} disabled={loading || pin.length !== 6}>
              {loading ? <span className="spinner" /> : 'Valider le PIN'}
            </button>
            <div className="pairing-link" onClick={() => { setStep('url'); setPin(''); setError('') }}>
              ← Changer d'adresse serveur
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
