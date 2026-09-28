import { AlertTriangle } from 'lucide-react'

/** Light-theme loading skeleton for dashboard pages waiting on real API data. */
export default function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card h-28 animate-pulse bg-ink-50" />
      ))}
    </div>
  )
}

/** Light-theme error state for a failed API call. */
export function ErrorState({ message }) {
  return (
    <div className="card border-rose-100 bg-rose-50/60 p-8 text-center">
      <AlertTriangle size={22} className="mx-auto text-rose-500" />
      <p className="mt-2 text-sm font-bold text-rose-600">Could not load this data</p>
      <p className="mt-1 text-xs text-ink-500">{message}</p>
    </div>
  )
}
