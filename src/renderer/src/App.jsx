import { useState, useEffect, useCallback } from 'react'
import { configure, healthCheck } from './api/client'
import { bridge } from './api/bridge'
import { Toaster } from 'sonner'
import Sidebar      from './components/Sidebar'
import Pairing      from './pages/Pairing'
import Surveillance from './pages/Surveillance'
import Journal      from './pages/Journal'
import Vip          from './pages/Vip'
import Config       from './pages/Config'
import Stats        from './pages/Stats'
import Alertes      from './pages/Alertes'

const PAGES = {
  surveillance: Surveillance,
  journal:      Journal,
  vip:          Vip,
  config:       Config,
  stats:        Stats,
  alertes:      Alertes,
}

// Page d'ouverture lisible depuis l'URL (`?page=journal`). Sert à ouvrir une
// page précise directement dans le navigateur pendant le travail de design ;
// sous Electron l'URL n'a pas de paramètre, on retombe donc sur Surveillance.
function initialPage() {
  try {
    const p = new URLSearchParams(location.search).get('page')
    return p && p in PAGES ? p : 'surveillance'
  } catch {
    return 'surveillance'
  }
}

export default function App() {
  const [ready,     setReady]     = useState(false)
  const [paired,    setPaired]    = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [online,    setOnline]    = useState(false)
  const [page,      setPage]      = useState(initialPage)

  useEffect(() => {
    ;(async () => {
      const cfg   = await bridge.config.get()
      const token = await bridge.token.get()
      if (cfg.serverUrl && token) {
        configure(cfg.serverUrl, token)
        setServerUrl(cfg.serverUrl)
        setPaired(true)
        pingServer(cfg.serverUrl)
      }
      setReady(true)
    })()
  }, [])

  const pingServer = useCallback(async (url) => {
    try { await healthCheck(url); setOnline(true) }
    catch { setOnline(false) }
  }, [])

  useEffect(() => {
    if (!paired || !serverUrl) return
    const id = setInterval(() => pingServer(serverUrl), 10_000)
    return () => clearInterval(id)
  }, [paired, serverUrl, pingServer])

  const handlePaired = (url, token) => {
    configure(url, token)
    setServerUrl(url)
    setPaired(true)
    setOnline(true)
  }

  const handleDisconnect = async () => {
    // On efface uniquement le jeton : l'adresse du serveur reste enregistrée
    // pour que l'écran d'appairage la propose au lieu de repartir sur le
    // placeholder par défaut à chaque reconnexion.
    await bridge.token.clear()
    setPaired(false); setOnline(false); setPage('surveillance')
  }

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <div className="w-5 h-5 border-2 border-border-hi border-t-primary rounded-full animate-spin" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Initialisation…
        </span>
      </div>
    )
  }

  if (!paired) {
    return (
      <>
        <Pairing initialUrl={serverUrl} onPaired={handlePaired} />
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            classNames: {
              toast: 'font-mono text-xs border border-border-hi bg-card shadow-md rounded-md',
            },
          }}
        />
      </>
    )
  }

  const PageComponent = PAGES[page] || Surveillance

  return (
    <>
      <div className="shell">
        <Sidebar
          page={page}
          setPage={setPage}
          online={online}
          serverUrl={serverUrl}
          onDisconnect={handleDisconnect}
        />
        <div className="main">
          <PageComponent serverUrl={serverUrl} />
        </div>
      </div>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          classNames: {
            toast: 'font-mono text-xs border border-border-hi bg-card shadow-md rounded-md',
          },
        }}
      />
    </>
  )
}
