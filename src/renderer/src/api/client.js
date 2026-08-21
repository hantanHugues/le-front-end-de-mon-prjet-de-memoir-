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

// IoT
export const openDoor        = ()       => http().post('/iot/door/open')
export const lockDoor        = ()       => http().post('/iot/door/lock')

// Health
export const healthCheck     = (base)   =>
  axios.get(`${base.replace(/\/$/,'')}/health`, { timeout: 4000 })

// Caméras
export const getCameras      = ()                => http().get('/cameras')
export const addCamera       = (body)            => http().post('/cameras', body)
export const updateCamera    = (cam_id, body)    => http().put(`/cameras/${encodeURIComponent(cam_id)}`, body)
export const deleteCamera    = (cam_id)          => http().delete(`/cameras/${encodeURIComponent(cam_id)}`)
export const scanUsbCameras  = ()                => http().get('/cameras/scan/usb', { timeout: 30000 })
