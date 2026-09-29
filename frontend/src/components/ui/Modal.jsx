import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Reusable modal dialog with backdrop and escape handling. Rendered into
 * document.body: inside <main> its animated stacking context would keep the
 * dialog below the sidebar and top bar.
 */
export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={`anim-pop card relative w-full ${width} !rounded-2xl p-0`}>
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h3 className="font-display text-sm font-bold text-ink-900">{title}</h3>
          <button className="topbar-icon-btn !h-8 !w-8 !rounded-lg" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
