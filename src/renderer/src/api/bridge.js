/**
 * Pont vers le process principal Electron.
 *
 * Deux raisons d'exister plutôt que d'appeler `window.electronAPI` directement :
 *
 * 1. Robustesse — si le preload échoue à s'injecter, `window.electronAPI` est
 *    `undefined` et `App.jsx` plantait sur `.config.get()` avant même le premier
 *    rendu : écran noir, sans message. Le repli garantit une app qui démarre.
 *
 * 2. Itération visuelle — le renderer devient ouvrable dans un navigateur
 *    ordinaire (http://localhost:5173), ce qui permet de travailler le design
 *    avec rechargement à chaud sans relancer Electron à chaque essai.
 *
 * En navigateur, la persistance retombe sur `localStorage` : le comportement
 * reste cohérent d'un rechargement à l'autre.
 */

const LS_CONFIG = 'biogate_dev_config'
const LS_TOKEN = 'biogate_dev_token'

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota plein ou stockage désactivé : sans effet en dev */
  }
}

/**
 * Amorce pour le travail de design : ouvrir `http://localhost:5173/?seed=<url>`
 * pré-remplit l'appairage et fait entrer directement dans le dashboard, au lieu
 * de bloquer sur l'écran d'appairage. Sans valeur, `http://localhost:8000` est
 * utilisé (voir `scripts/mock-api.mjs`).
 *
 * Ce code appartient au repli navigateur : sous Electron, `bridge` vaut
 * `window.electronAPI` et rien de tout ceci n'est atteignable.
 */
function seedFromUrl() {
  try {
    const p = new URLSearchParams(location.search)
    if (!p.has('seed')) return null
    return p.get('seed') || 'http://localhost:8000'
  } catch {
    return null
  }
}

const browserFallback = {
  config: {
    get: async () => {
      const seeded = seedFromUrl()
      if (seeded) return { serverUrl: seeded }
      return readLS(LS_CONFIG, { serverUrl: '' })
    },
    set: async (patch) => writeLS(LS_CONFIG, { ...readLS(LS_CONFIG, {}), ...patch }),
  },
  token: {
    get: async () => (seedFromUrl() ? 'seed-token' : readLS(LS_TOKEN, null)),
    set: async (t) => writeLS(LS_TOKEN, t),
    clear: async () => {
      try { localStorage.removeItem(LS_TOKEN) } catch { /* ignore */ }
    },
  },
  notify: (title, body) => {
    // Pas de notification système hors Electron : on trace, sans casser l'appel.
    console.info(`[notification] ${title} — ${body}`)
  },
}

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export const bridge = isElectron ? window.electronAPI : browserFallback
