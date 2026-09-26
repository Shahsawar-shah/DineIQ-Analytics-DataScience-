export type BadgeTone = 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'gray' | 'orange'

const TONE_CLASS: Record<BadgeTone, string> = {
  green: 'badge-green',
  red: 'badge-red',
  amber: 'badge-amber',
  blue: 'badge-blue',
  violet: 'badge-violet',
  gray: 'badge-gray',
  orange: 'badge-orange',
}

/** Maps arbitrary domain statuses to a consistent badge tone. */
export function toneForStatus(status: string): BadgeTone {
  const s = status.toLowerCase()
  if (['completed', 'delivered', 'active', 'healthy', 'operational', 'resolved', 'in stock', 'normal', 'high'].includes(s)) return 'green'
  if (['critical', 'cancelled', 'out of stock', 'suspended', 'failed'].includes(s)) return 'red'
  if (['warning', 'preparing', 'low stock', 'degraded', 'investigating', 'maintenance', 'open'].includes(s)) return 'amber'
  if (['scheduled', 'new'].includes(s)) return 'blue'
  if (['medium'].includes(s)) return 'amber'
  if (['low'].includes(s)) return 'gray'
  return 'gray'
}

export default function StatusBadge({ status, tone }: { status: string; tone?: BadgeTone }) {
  return <span className={`badge ${TONE_CLASS[tone ?? toneForStatus(status)]}`}>{status}</span>
}
