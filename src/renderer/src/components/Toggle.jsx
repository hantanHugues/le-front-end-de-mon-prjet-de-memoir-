export default function Toggle({ value, onChange }) {
  return (
    <div
      className={`toggle${value ? ' on' : ''}`}
      onClick={() => onChange(!value)}
    />
  )
}
