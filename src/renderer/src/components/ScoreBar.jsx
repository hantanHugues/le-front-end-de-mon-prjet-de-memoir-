const colorOf = (score) => {
  if (score >= 85) return 'var(--granted)'
  if (score >= 60) return 'var(--pending)'
  return 'var(--denied)'
}

export default function ScoreBar({ score, color }) {
  const c = color || colorOf(score)
  return (
    <div className="sbar">
      <div className="sbar-fill" style={{ width: `${score}%`, background: c }} />
    </div>
  )
}
