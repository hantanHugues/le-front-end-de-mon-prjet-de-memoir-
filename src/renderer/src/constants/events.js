// Types d'événements — DOIVENT correspondre exactement aux constantes EVENT_*
// de database/db_manager.py (backend). Toute valeur ici qui ne matche pas une
// constante backend ne sera jamais retournée par GET /logs.
export const EVENT_TYPES = {
  VIP_ENTRY:           'VIP_ENTRY',
  ACCESS_DENIED:       'ACCESS_DENIED',
  INTRUDER_PENDING:    'INTRUDER_PENDING',
  INTRUDER_CONFIRMED:  'INTRUDER_CONFIRMED',
  LIVENESS_SUCCESS:    'LIVENESS_SUCCESS',
  FINGERPRINT_OK:      'FINGERPRINT_OK',
  FINGERPRINT_FAIL:    'FINGERPRINT_FAIL',
  FLIGHT_ALERT:        'FLIGHT_ALERT',
  FACELESS_PASSAGE:    'FACELESS_PASSAGE',
  DETECTION:           'DETECTION',
}

export const EVENT_META = {
  VIP_ENTRY:          { cls: 's-granted',  label: 'ACCÈS VIP' },
  ACCESS_DENIED:      { cls: 's-denied',   label: 'REFUS' },
  INTRUDER_PENDING:   { cls: 's-pending',  label: 'INTRUS ?' },
  INTRUDER_CONFIRMED: { cls: 's-intruder', label: 'INTRUS' },
  LIVENESS_SUCCESS:   { cls: 's-granted',  label: 'LIVENESS' },
  FINGERPRINT_OK:     { cls: 's-granted',  label: 'EMPREINTE' },
  FINGERPRINT_FAIL:   { cls: 's-denied',   label: 'EMPREINTE ✗' },
  FLIGHT_ALERT:       { cls: 's-denied',   label: 'FUITE' },
  FACELESS_PASSAGE:   { cls: 's-idle',     label: 'PASSAGE' },
  DETECTION:          { cls: 's-idle',     label: 'DÉTECTION' },
}

// Options du filtre — seuls les types réellement émis par le pipeline actuel
// (voir api.py / core/face_recognizer.py : ACCESS_DENIED et DETECTION sont
// déclarés côté DB mais jamais produits aujourd'hui).
export const EVENT_FILTER_OPTIONS = [
  { value: EVENT_TYPES.VIP_ENTRY,          label: 'Accès VIP' },
  { value: EVENT_TYPES.INTRUDER_PENDING,   label: 'Intrus (en cours)' },
  { value: EVENT_TYPES.INTRUDER_CONFIRMED, label: 'Intrus confirmé' },
  { value: EVENT_TYPES.FLIGHT_ALERT,       label: 'Fuite (visage vu, parti avant le verdict)' },
  { value: EVENT_TYPES.FACELESS_PASSAGE,   label: 'Passage sans visage' },
  { value: EVENT_TYPES.LIVENESS_SUCCESS,   label: 'Liveness réussi' },
  { value: EVENT_TYPES.FINGERPRINT_OK,     label: 'Empreinte validée' },
  { value: EVENT_TYPES.FINGERPRINT_FAIL,   label: 'Empreinte refusée' },
]

export function eventMeta(type) {
  return EVENT_META[type] || { cls: 's-idle', label: type || '—' }
}
