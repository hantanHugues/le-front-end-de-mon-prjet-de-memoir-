const CLASS = {
  GRANTED:              's-granted',
  DENIED:               's-denied',
  FINGERPRINT_PENDING:  's-pending',
  LIVENESS_PENDING:     's-pending',
  INTRUDER_PENDING:     's-intruder',
  INTRUDER_CONFIRMED:   's-intruder',
  ANALYZING:            's-analyzing',
  FACE_MATCHED:         's-analyzing',
  IDLE:                 's-idle',
}

const LABEL = {
  GRANTED:              'Accès',
  DENIED:               'Refusé',
  FINGERPRINT_PENDING:  'Empreinte',
  LIVENESS_PENDING:     'Liveness',
  INTRUDER_PENDING:     'Intrus ?',
  INTRUDER_CONFIRMED:   'INTRUS',
  ANALYZING:            'Analyse',
  FACE_MATCHED:         'VIP détecté',
  IDLE:                 'Inactif',
}

export default function StateChip({ state }) {
  const cls = CLASS[state] || 's-idle'
  const lbl = LABEL[state] || state
  return <span className={`state ${cls}`}>{lbl}</span>
}
