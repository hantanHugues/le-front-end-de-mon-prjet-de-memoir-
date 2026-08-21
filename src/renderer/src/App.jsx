import { useState, useEffect, useCallback } from 'react'
import { configure, healthCheck } from './api/client'
import Sidebar      from './components/Sidebar'
import Pairing      from './pages/Pairing'
import Surveillance from './pages/Surveillance'
import Journal      from './pages/Journal'
import Vip          from './pages/Vip'
import Config       from './pages/Config'
import Stats        from './pages/Stats'
import Alertes      from './pages/Alertes'
import ToastContainer from './components/Toast'

const PAGES = {
  surveillance: Surveillance,
  journal:      Journal,
  vip:          Vip,
  config:       Config,
  stats:        Stats,
  alertes:      Alertes,
}

export default function App() {
  const [ready,     setReady]     = useState(false)
  const [paired,    setPaired]    = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [online,    setOnline]    = useState(false)
  const [page,      setPage]      = useState('surveillance')

  useEffect(() => {
    ;(async () => {
      const cfg   = await window.electronAPI.config.get()
      const token = await window.electronAPI.token.get()
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
    try {
      await healthCheck(url)
      setOnline(true)
    } catch {
      setOnline(false)
    }
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
    await window.electronAPI.token.clear()
    await window.electronAPI.config.set({ serverUrl: '' })
    setPaired(false)
    setOnline(false)
    setServerUrl('')
    setPage('surveillance')
  }

  if (!ready) {
    return (
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)',fontFamily:'var(--fm)',fontSize:11,color:'var(--t3)',flexDirection:'column',gap:14 }}>
        <span className="spinner" />
        <span style={{ letterSpacing:'.18em', textTransform:'uppercase' }}>INITIALISATION…</span>
      </div>
    )
  }

  if (!paired) {
    return (
      <>
        <Pairing onPaired={handlePaired} />
        <ToastContainer />
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
      <ToastContainer />
    </>
  )
}
