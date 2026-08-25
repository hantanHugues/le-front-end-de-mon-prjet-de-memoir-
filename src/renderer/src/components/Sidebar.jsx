import { Fragment } from 'react'
import { Camera, FileText, Star, SlidersHorizontal, BarChart2, Bell } from 'lucide-react'

const NAV = [
  { id: 'surveillance', label: 'Surveillance',    section: 'Système',  Icon: Camera },
  { id: 'journal',      label: "Journal d'accès", section: null,       Icon: FileText },
  { id: 'vip',          label: 'VIP',             section: 'Gestion',  Icon: Star },
  { id: 'config',       label: 'Configuration',   section: null,       Icon: SlidersHorizontal },
  { id: 'stats',        label: 'Statistiques',    section: 'Analyse',  Icon: BarChart2 },
  { id: 'alertes',      label: 'Alertes',         section: null,       Icon: Bell },
]

export default function Sidebar({ page, setPage, online, serverUrl, onDisconnect }) {
  const addr = serverUrl.replace(/^https?:\/\//, '')

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="logo-mark">BioGate</div>
        <div className="logo-sub">v7.0 &nbsp;·&nbsp; Edge AI</div>
      </div>

      <nav className="sb-nav">
        {NAV.map(({ id, label, section, Icon }) => (
          <Fragment key={id}>
            {section && <div className="nav-section">{section}</div>}
            <button
              type="button"
              className={`nav-item${page === id ? ' active' : ''}`}
              onClick={() => setPage(id)}
              aria-current={page === id ? 'page' : undefined}
            >
              <Icon size={14} strokeWidth={2} style={{ opacity: page === id ? 1 : 0.55, flexShrink: 0 }} />
              {label}
            </button>
          </Fragment>
        ))}
      </nav>

      <div className="sb-footer">
        <div className="conn-row">
          <span className={`conn-dot${online ? '' : ' offline'}`} />
          {online ? 'Connecté' : 'Hors ligne'}
        </div>
        <div className="srv-addr">{addr}</div>
        <button
          type="button"
          className="pairing-link"
          style={{ marginTop: 10, fontSize: 12 }}
          onClick={onDisconnect}
        >
          Déconnecter
        </button>
      </div>
    </aside>
  )
}
