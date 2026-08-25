import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Download, Trash2, ShieldAlert, ImageIcon, Loader2 } from 'lucide-react'
import { getLogs, deleteLog, purgeLogs } from '../api/client'
import { eventMeta, EVENT_FILTER_OPTIONS } from '../constants/events'
import { Skeleton } from '../components/ui/skeleton'
import { Button } from '../components/ui/button'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../components/ui/table'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '../components/ui/alert-dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'

/* ── Helpers ─────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour12: false })
}

const EVENT_COLOR = {
  's-granted':  { text: 'var(--granted)',  bg: 'rgba(35,165,90,.12)',  border: 'rgba(35,165,90,.22)'  },
  's-denied':   { text: 'var(--denied)',   bg: 'rgba(242,63,67,.12)',  border: 'rgba(242,63,67,.22)'  },
  's-intruder': { text: 'var(--intruder)', bg: 'rgba(242,63,67,.12)',  border: 'rgba(242,63,67,.22)'  },
  's-pending':  { text: 'var(--pending)',  bg: 'rgba(240,177,50,.12)', border: 'rgba(240,177,50,.22)' },
  's-idle':     { text: 'var(--t3)',       bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.10)' },
  's-analyzing':{ text: 'var(--primary)',  bg: 'rgba(88,101,242,.10)', border: 'rgba(88,101,242,.22)' },
}

function EventBadge({ cls, label }) {
  const c = EVENT_COLOR[cls] || EVENT_COLOR['s-idle']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: '.05em',
      textTransform: 'uppercase', color: c.text, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function Journal() {
  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState({ days: '7', event_type: '', vip_name: '' })
  const [purging,    setPurging]    = useState(false)
  const [pendingDel, setPendingDel] = useState(null)
  const [purgeOpen,  setPurgeOpen]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.days)       params.days       = filter.days
      if (filter.event_type) params.event_type = filter.event_type
      if (filter.vip_name)   params.vip_name   = filter.vip_name
      const res = await getLogs(params)
      setLogs(res.data.logs || res.data || [])
    } catch { setLogs([]) }
    finally  { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function confirmDelete() {
    const id = pendingDel
    setPendingDel(null)
    try { await deleteLog(id); toast.success('Entrée supprimée'); load() }
    catch { toast.error('Suppression impossible') }
  }

  async function confirmPurge() {
    setPurgeOpen(false); setPurging(true)
    try { await purgeLogs(); toast.success('Purge RGPD effectuée') }
    catch { toast.error('Purge impossible') }
    finally { setPurging(false); load() }
  }

  function exportCsv() {
    if (!logs.length) { toast.error('Aucun événement à exporter'); return }
    const head = 'Date,Événement,VIP,Score\n'
    const rows = logs.map(l =>
      `"${fmtDate(l.timestamp)}","${l.event_type}","${l.name || ''}","${l.confidence || ''}"`
    ).join('\n')
    const blob = new Blob([head + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'biogate_logs.csv'; a.click()
    URL.revokeObjectURL(url)
    // Sous Electron le téléchargement est silencieux : sans ce retour, le bouton
    // paraît sans effet.
    toast.success(`${logs.length} événement${logs.length > 1 ? 's' : ''} exporté${logs.length > 1 ? 's' : ''}`)
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
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Journal d'accès</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>
            {loading ? '…' : `${logs.length} événement${logs.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button onClick={exportCsv}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="destructive" onClick={() => setPurgeOpen(true)} disabled={purging}>
            {purging ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
            Purge RGPD
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        padding: '10px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--card)', flexShrink: 0,
      }}>
        <Select
          value={filter.days || 'all'}
          onValueChange={v => setFilter(f => ({ ...f, days: v === 'all' ? '' : v }))}
        >
          <SelectTrigger style={{ width: 168, height: 30, fontSize: 13 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Aujourd'hui</SelectItem>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">Ce mois</SelectItem>
            <SelectItem value="all">Tout</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filter.event_type || 'all'}
          onValueChange={v => setFilter(f => ({ ...f, event_type: v === 'all' ? '' : v }))}
        >
          <SelectTrigger style={{ width: 200, height: 30, fontSize: 13 }}>
            <SelectValue placeholder="Tous les événements" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les événements</SelectItem>
            {EVENT_FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <input
          style={{
            height: 30, width: 200, padding: '0 10px',
            background: 'var(--secondary)', border: '1px solid var(--border-hi)',
            color: 'var(--foreground)', fontSize: 13, fontFamily: 'var(--fu)',
            borderRadius: 6, outline: 'none',
          }}
          placeholder="Filtrer par nom VIP…"
          value={filter.vip_name}
          onChange={e => setFilter(f => ({ ...f, vip_name: e.target.value }))}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-hi)'}
        />
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} style={{ height: 36, borderRadius: 4 }} />)}
          </div>
        ) : logs.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192,
            fontFamily: 'var(--fm)', fontSize: 12, letterSpacing: '.07em',
            textTransform: 'uppercase', color: 'var(--muted-foreground)',
          }}>
            Aucun événement
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horodatage</TableHead>
                <TableHead>Événement</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="w-10" />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => {
                const { cls, label } = eventMeta(log.event_type)
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-muted-foreground tabular-nums whitespace-nowrap">
                      {fmtDate(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <EventBadge cls={cls} label={label} />
                    </TableCell>
                    <TableCell className="text-foreground">
                      {log.name || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground tabular-nums">
                      {log.confidence ? `${log.confidence.toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell className="text-center w-10">
                      {log.snapshot_path && (
                        <ImageIcon size={14} style={{ color: 'var(--muted-foreground)', opacity: 0.55 }} />
                      )}
                    </TableCell>
                    <TableCell className="text-center w-10 py-1">
                      <Button
                        variant="ghost" size="icon"
                        aria-label={`Supprimer l'événement du ${fmtDate(log.timestamp)}`}
                        className="text-muted-foreground hover:text-denied hover:bg-[rgba(242,63,67,0.10)]"
                        onClick={() => setPendingDel(log.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={pendingDel !== null} onOpenChange={o => !o && setPendingDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'événement sera définitivement retiré du journal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge dialog */}
      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purger les logs anciens ?</AlertDialogTitle>
            <AlertDialogDescription>
              Supprime définitivement tous les événements au-delà de la période de rétention RGPD configurée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPurge}>Purger</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
