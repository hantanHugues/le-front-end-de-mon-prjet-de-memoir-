import axios from 'axios'

let _base  = null
let _token = null

export function configure(serverUrl, token) {
  _base  = serverUrl.replace(/\/$/, '')
  _token = token
}

export function getStreamUrl() {
  return `${_base}/stream?token=${_token}`
}

export function getCameraStreamUrl(cam_id) {
  return `${_base}/stream/${encodeURIComponent(cam_id)}?token=${_token}`
}

// Capture d'une seule frame — utilisé par l'enrôlement VIP. Une vraie requête
// (pas un flux), donc récupérable en blob directement, sans les soucis de
// canvas/CORS qu'aurait posés une capture depuis le <img> MJPEG affiché.
export const getSnapshot = (camId) =>
  http().get(camId ? `/snapshot/${encodeURIComponent(camId)}` : '/snapshot', { responseType: 'blob' })

function http() {
  return axios.create({
    baseURL: _base,
    timeout: 8000,
    headers: { Authorization: `Bearer ${_token}` },
  })
}

// Auth & pairing (pas de JWT requis)
export function requestPair(serverUrl) {
  return axios.post(`${serverUrl.replace(/\/$/,'')}/pair/request`, {}, { timeout: 8000 })
}
export function authToken(serverUrl, pin) {
  return axios.post(`${serverUrl.replace(/\/$/,'')}/auth/token`, { pin }, { timeout: 8000 })
}

// Surveillance
export const getAccessStatus = ()       => http().get('/access_status')

// Journal
export const getLogs         = (params) => http().get('/logs', { params })
export const deleteLog       = (id)     => http().delete(`/logs/${id}`)
export const purgeLogs       = (hours)  => http().delete('/logs/purge', { params: { retention_hours: hours } })
export const getRgpdStatus   = ()       => http().get('/rgpd/status')

// VIP
export const getProfiles     = ()       => http().get('/profiles')
export const deleteProfile   = (name)   => http().delete(`/profiles/${encodeURIComponent(name)}`)
export const enrollVip       = (form)   =>
  http().post('/enroll', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 })

// Config
export const getConfig       = ()       => http().get('/config')
export const putConfig       = (data)   => http().put('/config', data)
export const getTemplates    = ()       => http().get('/config/templates')
export const applyTemplate   = (name)  => http().post('/config/apply_template', { template_name: name })

// Alertes (Telegram / e-mail) — le serveur utilise la configuration enregistrée
export const testAlert          = (channel) => http().post('/alerts/test', { channel }, { timeout: 30000 })
export const detectTelegramChat = ()        => http().post('/alerts/telegram/detect', {}, { timeout: 30000 })

// IoT
export const openDoor        = ()       => http().post('/iot/door/open')
export const lockDoor        = ()       => http().post('/iot/door/lock')

// MFA — simulation empreinte (pas de capteur ESP32 réel branché pour l'instant).
// /fingerprint_result attend du form-urlencoded (Form(...) côté FastAPI), pas du JSON.
export const fingerprintResult = (objectId, success) => {
  const params = new URLSearchParams()
  params.append('object_id', objectId)
  params.append('success', success)
  return http().post('/fingerprint_result', params)
}

// Health
export const healthCheck     = (base)   =>
  axios.get(`${base.replace(/\/$/,'')}/health`, { timeout: 4000 })

// Caméras
export const getCameras      = ()                => http().get('/cameras')
export const addCamera       = (body)            => http().post('/cameras', body)
export const updateCamera    = (cam_id, body)    => http().put(`/cameras/${encodeURIComponent(cam_id)}`, body)
export const deleteCamera    = (cam_id)          => http().delete(`/cameras/${encodeURIComponent(cam_id)}`)
export const scanUsbCameras  = ()                => http().get('/cameras/scan/usb', { timeout: 30000 })
