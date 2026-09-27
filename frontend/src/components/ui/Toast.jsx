import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

/** Fixed-position toast notification for success/error feedback after an action. */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  const isError = toast.tone === 'error'

  return (
    <div
      className={`anim-pop fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-xl ${
        isError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {isError ? <XCircle size={16} className="shrink-0 text-rose-500" /> : <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />}
      {toast.message}
    </div>
  )
}

/** Hook returning toast state + a `showToast(message, tone)` trigger. */
export function useToast() {
  const [toast, setToast] = useState(null)
  const showToast = (message, tone = 'success') => setToast({ message, tone, id: Date.now() })
  const hideToast = () => setToast(null)
  return { toast, showToast, hideToast }
}
