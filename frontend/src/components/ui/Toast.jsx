import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

/** Fixed-position toast notification for success/error feedback after an action, with an optional action button (e.g. Undo). */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, toast.action ? 5000 : 3500)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  const isError = toast.tone === 'error'

  return (
    <div
      role="status"
      className={`anim-pop fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-xl ${
        isError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {isError ? <XCircle size={16} className="shrink-0 text-rose-500" /> : <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />}
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.action && (
        <button
          className="shrink-0 rounded-lg bg-white px-2.5 py-1 font-bold text-ink-900 shadow-sm hover:bg-ink-50"
          onClick={() => {
            toast.action.onClick()
            onClose()
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

/** Hook returning toast state + a `showToast(message, tone, action)` trigger. */
export function useToast() {
  const [toast, setToast] = useState(null)
  const showToast = useCallback((message, tone = 'success', action = null) => setToast({ message, tone, action, id: Date.now() }), [])
  const hideToast = useCallback(() => setToast(null), [])
  return { toast, showToast, hideToast }
}
