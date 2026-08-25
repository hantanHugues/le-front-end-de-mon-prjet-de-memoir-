import { useState, useEffect, useRef } from 'react'
import { getProfiles, deleteProfile, enrollVip } from '../api/client'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { UserPlus, X, Check, Loader2, Upload } from 'lucide-react'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '../components/ui/alert-dialog'

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

/* ── Enroll modal ─────────────────────────────────────────────── */
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
      toast.success(`${name.trim()} enrôlé avec succès`)
      onDone()
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally { setLoading(false) }
  }

  const overlay  = { position: 'fixed', inset: 0, background: 'rgba(30,31,34,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
  const box      = { width: 420, background: 'var(--card)', border: '1px solid var(--border-hi)', borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', padding: 26 }
  const fieldLbl = { display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 5 }
  const inp      = { width: '100%', background: 'var(--secondary)', border: '1px solid var(--border-hi)', color: 'var(--foreground)', fontSize: 14, fontFamily: 'var(--fu)', padding: '9px 12px', borderRadius: 7, outline: 'none' }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 18, letterSpacing: '-0.015em' }}>
          Enrôler un VIP
        </div>
        <form onSubmit={submit}>
          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLbl}>Nom complet</label>
            <input
              style={inp}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Prénom Nom"
              required
            />
          </div>

          {/* File picker */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLbl}>Photo de référence</label>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0])} />
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '9px 12px', justifyContent: 'center',
                background: 'var(--secondary)', border: '1px solid var(--border-hi)',
                color: file ? 'var(--foreground)' : 'var(--muted-foreground)',
                fontSize: 13, borderRadius: 7, cursor: 'pointer',
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-hi)'}
            >
              <Upload size={13} />
              {file ? file.name : 'Choisir une photo…'}
            </button>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--denied)', marginBottom: 12 }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="accent" disabled={loading || !file || !name.trim()}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Enrôler
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── VIP card ─────────────────────────────────────────────────── */
function VipCard({ profile, onDelete }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--card)',
        border: `1px solid ${hover ? 'var(--border-hi)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: 18, cursor: 'default',
        transition: 'border-color .12s, transform .12s',
        transform: hover ? 'translateY(-1px)' : 'none',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40,
        background: 'rgba(88,101,242,0.12)',
        border: '1px solid rgba(88,101,242,0.22)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 700, color: 'var(--primary)',
        marginBottom: 10, flexShrink: 0,
      }}>
        {initials(profile.name)}
      </div>

      {/* Name + meta */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 2 }}>
        {profile.name}
      </div>
      {/* Le nom du champ varie selon la version du backend ; on n'affiche le
          nombre de gabarits que s'il est réellement fourni, plutôt qu'un « ? ». */}
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, flex: 1 }}>
        {(() => {
          const n = profile.embedding_count ?? profile.embeddings ?? profile.samples
          const parts = []
          if (typeof n === 'number') parts.push(`${n} gabarit${n !== 1 ? 's' : ''}`)
          if (profile.role) parts.push(profile.role)
          if (profile.enrolled_at) parts.push(new Date(profile.enrolled_at).toLocaleDateString('fr-FR'))
          return parts.length ? parts.join(' · ') : 'Profil enrôlé'
        })()}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <Button
          variant="destructive" size="sm"
          aria-label={`Retirer le profil de ${profile.name}`}
          onClick={() => onDelete(profile.name)}
        >
          <X size={12} />
          Retirer
        </Button>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function Vip() {
  const [profiles,  setProfiles]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [pendingDel, setPendingDel] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await getProfiles()
      setProfiles(res.data.profiles || res.data || [])
    } catch { setProfiles([]) }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Le succès n'est annoncé que si la requête a réellement abouti : sinon un
  // backend éteint affichait un toast vert alors que le profil restait en place.
  async function confirmDelete() {
    const name = pendingDel
    setPendingDel(null)
    try {
      await deleteProfile(name)
      toast.success(`Profil de ${name} supprimé`)
    } catch {
      toast.error(`Suppression impossible — serveur injoignable`)
    } finally {
      load()
    }
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
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Profils VIP</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>
            {loading ? '…' : `${profiles.length} profil${profiles.length !== 1 ? 's' : ''} enrôlé${profiles.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <Button variant="accent" onClick={() => setShowModal(true)}>
          <UserPlus size={14} />
          Enrôler
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <span className="spinner" style={{ width: 18, height: 18 }} />
        </div>
      ) : (
        // `minmax(240px, 260px)` plutôt que `1fr` : au-delà de six profils les
        // cartes s'aligneraient sinon sur toute la largeur de l'écran et
        // deviendraient des bandes étirées. Ici elles gardent une taille lisible
        // et la grille se remplit de gauche à droite.
        <div style={{
          flex: 1, overflowY: 'auto', padding: 24,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 260px))',
          gap: 12, alignContent: 'start',
        }}>
          {profiles.map(p => (
            <VipCard key={p.name} profile={p} onDelete={setPendingDel} />
          ))}

          {/* Add card */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              background: 'transparent', border: '1px dashed var(--border-hi)',
              borderRadius: 10, fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 8, cursor: 'pointer',
              minHeight: 152, color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500,
              transition: 'border-color .15s, color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
          >
            <UserPlus size={18} />
            <span>Ajouter un profil</span>
          </button>
        </div>
      )}

      {showModal && (
        <EnrollModal
          onClose={() => setShowModal(false)}
          onDone={() => { setShowModal(false); load() }}
        />
      )}

      <AlertDialog open={pendingDel !== null} onOpenChange={o => !o && setPendingDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le profil de {pendingDel} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le gabarit biométrique associé sera définitivement effacé. Cette personne
              ne sera plus reconnue par le système.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
