import { useState, useEffect, useRef } from 'react'
import { getProfiles, deleteProfile, enrollVip } from '../api/client'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { PageHeader } from '../components/ui/page-header'
import { EmptyState } from '../components/ui/empty-state'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui/dialog'
import { UserPlus, X, Check, Loader2, Upload, ServerCrash, RefreshCw } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
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

  // Portée sur Dialog (Radix) plutôt que sur un <div> maison : on récupère la
  // touche Échap, le piège à focus, le retour du focus au déclencheur, le
  // verrouillage du défilement et `role="dialog"` — rien de tout cela n'était
  // géré par la version écrite à la main.
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Enrôler un VIP</DialogTitle>
          <DialogDescription>
            La photo servira à générer le gabarit biométrique de reconnaissance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit}>
          <Field label="Nom complet" className="mb-3.5">
            {id => (
              <Input
                id={id} value={name} required
                onChange={e => setName(e.target.value)}
                placeholder="Prénom Nom"
              />
            )}
          </Field>

          <Field label="Photo de référence" className="mb-3.5">
            {id => (
              <>
                <input
                  ref={fileRef} id={id} type="file" accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files[0])}
                />
                <Button
                  type="button" variant="outline"
                  className="w-full justify-center"
                  onClick={() => fileRef.current.click()}
                >
                  <Upload size={14} />
                  {file ? file.name : 'Choisir une photo…'}
                </Button>
              </>
            )}
          </Field>

          {error && (
            <div style={{
              fontSize: 13, color: 'var(--denied)', marginBottom: 12,
              background: 'rgba(242,63,67,.10)', border: '1px solid rgba(242,63,67,.22)',
              borderRadius: 8, padding: '9px 11px', lineHeight: 1.45,
            }}>
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={loading || !file || !name.trim()}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Enrôler
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const [loadErr,   setLoadErr]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await getProfiles()
      setProfiles(res.data.profiles || res.data || [])
      setLoadErr(false)
    } catch { setProfiles([]); setLoadErr(true) }
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

      <PageHeader
        title="Profils VIP"
        subtitle={loading ? '…' : `${profiles.length} profil${profiles.length !== 1 ? 's' : ''} enrôlé${profiles.length !== 1 ? 's' : ''}`}
      >
        <Button variant="accent" onClick={() => setShowModal(true)}>
          <UserPlus size={14} />
          Enrôler
        </Button>
      </PageHeader>

      {/* Grid */}
      {loading ? (
        // Squelettes plutôt qu'un spinner : cohérent avec Journal et Config,
        // et la forme de la grille est annoncée avant l'arrivée des données.
        <div style={{
          flex: 1, overflowY: 'auto', padding: 24,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 260px))',
          gap: 12, alignContent: 'start',
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 152, borderRadius: 10 }} />
          ))}
        </div>
      ) : loadErr ? (
        <EmptyState
          className="flex-1"
          variant="error"
          icon={ServerCrash}
          title="Serveur injoignable"
          description="Impossible de récupérer les profils enrôlés. Vérifiez que le service BioGate est démarré."
          action={<Button variant="accent" onClick={load}><RefreshCw size={14} /> Réessayer</Button>}
        />
      ) : profiles.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={UserPlus}
          title="Aucun profil enrôlé"
          description="Enrôlez une première personne pour que le système puisse la reconnaître à l'entrée."
          action={<Button variant="accent" onClick={() => setShowModal(true)}><UserPlus size={14} /> Enrôler</Button>}
        />
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
