import { Star } from 'lucide-react'

/** Reusable 5-star rating display. */
export default function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-ink-200'}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-ink-500">{value.toFixed(1)}</span>
    </span>
  )
}
