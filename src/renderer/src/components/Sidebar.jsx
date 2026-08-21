import { Fragment } from 'react'

export default function Sidebar({ page, setPage, online, serverUrl, onDisconnect }) {
  const items = [
    { id: 'surveillance', label: 'Surveillance',   section: 'Système' },
    { id: 'journal',      label: "Journal d'accès", section: null },
    { id: 'vip',          label: 'VIP',             section: 'Gestion' },
    { id: 'config',       label: 'Configuration',   section: null },
    { id: 'stats',        label: 'Statistiques',    section: 'Analyse' },
    { id: 'alertes',      label: 'Alertes',         section: null },
  ]

  const addr = serverUrl.replace(/^https?:\/\//, '')

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="logo-mark">BioGate</div>
        <div className="logo-sub">v7.0 &nbsp;·&nbsp; Edge AI</div>
      </div>

      <nav className="sb-nav">
        {items.map(({ id, label, section }) => (
          <Fragment key={id}>
            {section && <div className="nav-section">{section}</div>}
            <div
              className={`nav-item${page === id ? ' active' : ''}`}
              onClick={() => setPage(id)}
            >
              <span className="nav-dot" />
              {label}
            </div>
          </Fragment>
        ))}
      </nav>

      <div className="sb-footer">
        <div className="conn-row">
          <span className={`conn-dot${online ? '' : ' offline'}`} />
          {online ? 'Connecté' : 'Hors ligne'}
        </div>
        <div className="srv-addr">{addr}</div>
        <div
          className="pairing-link"
          style={{ marginTop: 10, fontSize: 11 }}
          onClick={onDisconnect}
        >
          Déconnecter
        </div>
      </div>
    </aside>
  )
}
