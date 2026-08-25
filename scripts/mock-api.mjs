/**
 * Backend simulé pour le travail de design.
 *
 * Permet d'ouvrir le renderer dans un navigateur avec des pages réellement
 * remplies, sans dépendre du serveur Python. Sert uniquement au développement
 * de l'interface — aucun lien avec la production.
 *
 *   node scripts/mock-api.mjs        (écoute sur :8000)
 */
import { createServer } from 'http'

const PORT = 8000
const now = Date.now()
const iso = (minutesAgo) => new Date(now - minutesAgo * 60_000).toISOString()

const NAMES = [
  'Hugues HANTAN', 'Adjovi KOSSOU', 'Rachidi ALADJI', 'Mariam SOGLO',
  'Bertrand AHOUANDJINOU', 'Félicité DOSSOU',
]

const EVENTS = [
  'VIP_ENTRY', 'VIP_ENTRY', 'VIP_ENTRY', 'LIVENESS_SUCCESS', 'FINGERPRINT_OK',
  'INTRUDER_CONFIRMED', 'INTRUDER_PENDING', 'FINGERPRINT_FAIL', 'ACCESS_DENIED',
]

const LOGS = Array.from({ length: 64 }, (_, i) => {
  const event_type = EVENTS[i % EVENTS.length]
  const named = ['VIP_ENTRY', 'LIVENESS_SUCCESS', 'FINGERPRINT_OK'].includes(event_type)
  return {
    id: 1000 + i,
    timestamp: iso(i * 47 + (i % 5) * 13),
    event_type,
    name: named ? NAMES[i % NAMES.length] : null,
    confidence: named ? 72 + ((i * 7) % 27) + Math.random() : null,
    snapshot_path: event_type.startsWith('INTRUDER') ? `/snapshots/intrus_${1000 + i}.jpg` : null,
  }
})

const PROFILES = NAMES.map((name, i) => ({
  name,
  enrolled_at: iso(i * 1440 + 300),
  samples: 3 + (i % 4),
  role: i === 0 ? 'Administrateur' : i < 3 ? 'Personnel autorisé' : 'Visiteur VIP',
}))

const CONFIG = {
  FACE_RECOGNITION_THRESHOLD: 0.42,
  FACE_RECHECK_INTERVAL: 1.2,
  FACE_ANALYSIS_TIME_LIMIT: 2.5,
  MFA_REQUIRED: true,
  LIVENESS_ENABLED: true,
  FINGERPRINT_TIMEOUT: 25,
  LIVENESS_CHALLENGE_TIMEOUT: 15,
  ALERT_GRACE_PERIOD: 45,
  RGPD_SNAPSHOT_RETENTION_HOURS: 168,
  IOT_ENABLED: false,
  FINGERPRINT_ESP32_IP: '192.168.1.101',
  DOOR_ESP32_IP: '192.168.1.102',
  LIGHT_ESP32_IP: '192.168.1.103',
}

const CAMERAS = [
  { cam_id: 'cam_entree',  name: 'Portail avant',  type: 'usb',   usb_index: 0, zone: 'Entrée',  running: true,  connected: true,  fps: 24, url: null },
  { cam_id: 'cam_couloir', name: 'Couloir Nord',   type: 'mjpeg', usb_index: 0, zone: 'Couloir', running: true,  connected: true,  fps: 18, url: 'http://192.168.1.140/stream' },
  { cam_id: 'cam_bureau',  name: 'Bureau direction', type: 'rtsp', usb_index: 0, zone: 'Bureau', running: false, connected: false, fps: 0,  url: 'rtsp://192.168.1.150/live' },
]

const ACCESS_STATUS = {
  trust_scores: {
    '17': { vip_name: 'Hugues HANTAN', score: 94, state: 'GRANTED' },
    '18': { vip_name: null, score: 41, state: 'ANALYZING' },
    '19': { vip_name: 'Mariam SOGLO', score: 68, state: 'LIVENESS_PENDING',
            liveness_progress: { blinks: 1, blinks_required: 2, remaining: 9 } },
  },
  iot: { door: 'closed', light: 'auto', fingerprint: true, iot_enabled: false },
}

const routes = [
  [/^\/logs\/purge$/,      () => ({ purged: 12 })],
  [/^\/logs\/\d+$/,        () => ({ ok: true })],
  [/^\/logs$/,             () => ({ logs: LOGS })],
  [/^\/profiles/,          () => ({ profiles: PROFILES })],
  [/^\/config\/templates$/, () => ({ templates: [] })],
  [/^\/config\/apply_template$/, () => ({ config: CONFIG })],
  [/^\/config$/,           () => CONFIG],
  [/^\/cameras\/scan\/usb$/, () => ({ devices: [{ usb_index: 0, label: 'HD WebCam (integrated)' }] })],
  [/^\/cameras/,           () => ({ cameras: CAMERAS })],
  [/^\/access_status$/,    () => ACCESS_STATUS],
  [/^\/iot\//,             () => ({ ok: true })],
  [/^\/health$/,           () => ({ status: 'ok' })],
]

createServer((req, res) => {
  const path = req.url.split('?')[0]
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const hit = routes.find(([re]) => re.test(path))
  const body = hit ? hit[1]() : { detail: `mock: route inconnue ${path}` }
  res.writeHead(hit ? 200 : 404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}).listen(PORT, () => console.log(`mock API sur http://localhost:${PORT}`))
