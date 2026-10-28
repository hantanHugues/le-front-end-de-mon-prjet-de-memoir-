import { useState, useEffect, useRef } from 'react'
import { getProfiles, deleteProfile, enrollVip, getSnapshot, getCameras, getStreamUrl, getCameraStreamUrl } from '../api/client'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { PageHeader } from '../components/ui/page-header'
import { EmptyState } from '../components/ui/empty-state'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui/dialog'
import { UserPlus, X, Check, Loader2, Upload, ServerCrash, RefreshCw, Camera, RotateCcw } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '../components/ui/alert-dialog'

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const MAX_SHOTS = 5

/* ── Enroll modal ─────────────────────────────────────────────────
   Capture live plutôt qu'upload de fichier : la version précédente exigeait
   d'avoir déjà une photo sur le disque, et n'enregistrait jamais qu'un seul
   gabarit alors que la base en supporte plusieurs par profil. On capture
   maintenant directement depuis la caméra (plusieurs prises), l'import de
   fichier reste disponible en secours. */
function EnrollModal({ onClose, onDone }) {
  const [mode,     setMode]     = useState('capture')   // 'capture' | 'file'
  const [name,     setName]     = useState('')
  const [file,     setFile]     = useState(null)
  const [shots,    setShots]    = useState([])           // [{id, blob, url}]
  const [camId,    setCamId]    = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const fileRef = useRef()

  // La caméra active du dashboard sert par défaut à la capture — la même
  // que celle affichée dans Surveillance, pas la peine de la re-sélectionner.
  useEffect(() => {
    getCameras()
      .then(r => {
        const cam = (r.data?.cameras || []).find(c => c.running)
        if (cam) setCamId(cam.cam_id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => () => shots.forEach(s => URL.revokeObjectURL(s.url)), [])

  async function handleCapture() {
    setCapturing(true); setError('')
    try {
      const res = await getSnapshot(camId)
      const blob = res.data
      setShots(s => [...s, { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) }])
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible de capturer — vérifiez que la caméra est active.")
    } finally { setCapturing(false) }
  }

  function removeShot(id) {
    setShots(s => {
      const target = s.find(x => x.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return s.filter(x => x.id !== id)
    })
  }

  async function submit(e) {
    e.preventDefault()
    const vipName = name.trim()
    if (!vipName) return
    if (mode === 'capture' && shots.length === 0) return
    if (mode === 'file' && !file) return

    setError(''); setLoading(true)

    const photos = mode === 'file' ? [file] : shots.map(s => s.blob)
    let okCount = 0
    let lastError = ''

    // Séquentiel, pas Promise.all : /enroll ajoute un gabarit à la fois côté
    // DB, et un message d'erreur clair par photo vaut mieux qu'un échec groupé.
    for (const photo of photos) {
      try {
        const form = new FormData()
        form.append('name', vipName)
        form.append('file', photo, 'capture.jpg')
        await enrollVip(form)
        okCount += 1
      } catch (err) {
        lastError = err.response?.data?.detail || err.message
      }
    }

    setLoading(false)

    if (okCount === photos.length) {
      toast.success(
        photos.length > 1
          ? `${vipName} enrôlé avec ${okCount} gabarits`
          : `${vipName} enrôlé avec succès`
      )
      onDone()
    } else if (okCount > 0) {
      toast.warning(`${vipName} : ${okCount}/${photos.length} gabarits enregistrés — ${lastError}`)
      onDone()
    } else {
      setError(lastError || 'Aucune photo n\'a pu être enregistrée.')
    }
  }

  const canSubmit = name.trim() && (mode === 'capture' ? shots.length > 0 : !!file)

  // Portée sur Dialog (Radix) plutôt que sur un <div> maison : on récupère la
  // touche Échap, le piège à focus, le retour du focus au déclencheur, le
  // verrouillage du défilement et `role="dialog"` — rien de tout cela n'était
  // géré par la version écrite à la main.
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Enrôler un VIP</DialogTitle>
          <DialogDescription>
            Chaque photo capturée devient un gabarit biométrique distinct — plusieurs
            prises (angles, expressions) rendent la reconnaissance plus fiable.
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

          {/* Bascule capture / import */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <Button
              type="button" size="sm"
              variant={mode === 'capture' ? 'accent' : 'outline'}
              className="flex-1 justify-center"
              onClick={() => setMode('capture')}
            >
              <Camera size={13} /> Webcam en direct
            </Button>
            <Button
              type="button" size="sm"
              variant={mode === 'file' ? 'accent' : 'outline'}
              className="flex-1 justify-center"
              onClick={() => setMode('file')}
            >
              <Upload size={13} /> Importer un fichier
            </Button>
          </div>

          {mode === 'capture' ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                position: 'relative', width: '100%', aspectRatio: '4/3',
                background: '#000', borderRadius: 8, overflow: 'hidden',
                border: '1px solid var(--border-hi)', marginBottom: 10,
              }}>
                <img
                  key={camId || 'default'}
                  src={camId ? getCameraStreamUrl(camId) : getStreamUrl()}
                  alt="Aperçu caméra"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>

              <Button
                type="button" variant="accent"
                className="w-full justify-center"
                onClick={handleCapture}
                disabled={capturing || shots.length >= MAX_SHOTS}
              >
                {capturing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                {shots.length >= MAX_SHOTS ? `Maximum atteint (${MAX_SHOTS})` : 'Capturer une photo'}
              </Button>

              {shots.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {shots.map(s => (
                    <div key={s.id} style={{ position: 'relative', width: 64, height: 64 }}>
                      <img src={s.url} alt="capture"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-hi)' }} />
                      <button
                        type="button"
                        aria-label="Retirer cette photo"
                        onClick={() => removeShot(s.id)}
                        style={{
                          position: 'absolute', top: -6, right: -6,
                          width: 18, height: 18, borderRadius: '50%',
                          background: 'var(--destructive)', color: '#fff',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 8 }}>
                {shots.length}/{MAX_SHOTS} photo{shots.length !== 1 ? 's' : ''} — au moins une requise, plusieurs recommandées.
              </div>
            </div>
          ) : (
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
          )}

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
            <Button type="submit" variant="primary" disabled={loading || !canSubmit}>
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
