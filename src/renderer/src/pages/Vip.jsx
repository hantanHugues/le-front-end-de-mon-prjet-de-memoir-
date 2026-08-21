import { useState, useEffect, useRef } from 'react'
import { getProfiles, deleteProfile, enrollVip } from '../api/client'

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function EnrollModal({ onClose, onDone }) {
  const [name,    setName]    = useState('')
  const [file,    setFile]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const fileRef = useRef()

  async function submit(e) {
    e.preventDefault()
    if (!file || !name.trim()) return
    setError(''); setLoading(true)
    try {
      const form = new FormData()
      form.append('name', name.trim())
      form.append('file', file)
      await enrollVip(form)
      onDone()
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Enrôler un VIP</div>
        <form onSubmit={submit}>
          <div className="field">
            <div className="field-label">Nom complet</div>
            <input className="field-input" value={name} onChange={e => setName(e.target.value)}
              placeholder="Prénom Nom" required />
          </div>
          <div className="field">
            <div className="field-label">Photo de référence</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
              onChange={e => setFile(e.target.files[0])} />
            <button type="button" className="btn" style={{ width:'100%', justifyContent:'center' }}
              onClick={() => fileRef.current.click()}>
              {file ? file.name : 'Choisir une photo…'}
            </button>
          </div>
          {error && <div className="pairing-err">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-accent" disabled={loading || !file || !name.trim()}>
              {loading ? <span className="spinner" /> : 'Enrôler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Vip() {
  const [profiles, setProfiles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await getProfiles()
      setProfiles(res.data.profiles || res.data || [])
    } catch { setProfiles([]) }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(name) {
    if (!confirm(`Supprimer le profil de ${name} ?`)) return
    await deleteProfile(name).catch(() => {})
    load()
  }

  return (
    <>
      <div className="topbar">
        <span className="page-title">Profils VIP</span>
        <div className="topbar-right">
          <button className="btn btn-accent" onClick={() => setShowModal(true)}>+ Enrôler</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : (
        <div className="vip-grid">
          {profiles.map(p => (
            <div className="vip-card" key={p.name}>
              <div className="vip-avatar">{initials(p.name)}</div>
              <div className="vip-name">{p.name}</div>
              <div className="vip-meta">
                {p.embedding_count ?? '?'} embedding{p.embedding_count !== 1 ? 's' : ''}
                {p.enrolled_at ? ` · ${new Date(p.enrolled_at).toLocaleDateString('fr-FR')}` : ''}
              </div>
              <div className="vip-acts">
                <button
                  className="btn btn-danger"
                  style={{ fontSize:11, padding:'4px 9px' }}
                  onClick={() => handleDelete(p.name)}
                >
                  Retirer
                </button>
              </div>
            </div>
          ))}
          <div className="vip-add" onClick={() => setShowModal(true)}>
            <span className="vip-plus">+</span>
            <span>Ajouter un profil</span>
          </div>
        </div>
      )}

      {showModal && (
        <EnrollModal
          onClose={() => setShowModal(false)}
          onDone={() => { setShowModal(false); load() }}
        />
      )}
    </>
  )
}
