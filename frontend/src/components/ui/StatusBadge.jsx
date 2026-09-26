const TONE_CLASS = {
  green: 'badge-green',
  red: 'badge-red',
  amber: 'badge-amber',
  blue: 'badge-blue',
  violet: 'badge-violet',
  gray: 'badge-gray',
  orange: 'badge-orange',
}

/** Maps arbitrary domain statuses to a consistent badge tone. */
export function toneForStatus(status) {
  const s = status.toLowerCase()
  if (['completed', 'delivered', 'active', 'healthy', 'operational', 'resolved', 'in stock', 'normal', 'high'].includes(s)) return 'green'
  if (['critical', 'cancelled', 'out of stock', 'suspended', 'failed'].includes(s)) return 'red'
  if (['warning', 'preparing', 'low stock', 'degraded', 'investigating', 'maintenance', 'open'].includes(s)) return 'amber'
  if (['scheduled', 'new'].includes(s)) return 'blue'
  if (['medium'].includes(s)) return 'amber'
  if (['low'].includes(s)) return 'gray'
  return 'gray'
}

export default function StatusBadge({ status, tone }) {
  return <span className={`badge ${TONE_CLASS[tone ?? toneForStatus(status)]}`}>{status}</span>
}
