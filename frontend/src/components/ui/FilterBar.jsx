import { useEffect, useRef, useState } from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'

/**
 * Shared FilterBar — dropdown selects that visually update the mock UI.
 * All option values 'all' mean "no filter".
 */
export default function FilterBar({ filters, values, onChange, onReset, className = '' }) {
  const [openKey, setOpenKey] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpenKey(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const activeCount = filters.filter((f) => (values[f.key] ?? 'all') !== 'all').length

  return (
    <div ref={rootRef} className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="relative">
        <button
          className={`chip ${activeCount > 0 ? 'chip-active' : ''}`}
          onClick={() => setOpenKey(openKey ? null : '__all__')}
        >
          <SlidersHorizontal size={14} />
          Filters {activeCount > 0 && <span className="badge badge-orange !px-1.5 !py-0 !text-[0.62rem]">{activeCount}</span>}
        </button>
        {openKey === '__all__' && (
          <div className="anim-pop absolute left-0 top-11 z-30 w-64 rounded-xl border border-ink-100 bg-white p-2 shadow-xl">
            <p className="px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-ink-400">Filter by</p>
            {filters.map((f) => (
              <button
                key={f.key}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-medium text-ink-700 hover:bg-brand-50"
                onClick={() => setOpenKey(f.key)}
              >
                {f.label}
                <span className="text-ink-300">{(values[f.key] ?? 'all') === 'all' ? 'All' : values[f.key]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {filters.map((f) => (
        <div key={f.key} className="relative">
          <button className={`chip ${(values[f.key] ?? 'all') !== 'all' ? 'chip-active' : ''}`} onClick={() => setOpenKey(openKey === f.key ? null : f.key)}>
            {f.label}
            <span className="opacity-60">:</span>
            {(values[f.key] ?? 'all') === 'all' ? 'All' : values[f.key]}
            <ChevronDown size={13} className={`transition-transform ${openKey === f.key ? 'rotate-180' : ''}`} />
          </button>
          {openKey === f.key && (
            <div className="anim-pop absolute left-0 top-11 z-30 max-h-60 w-52 overflow-auto rounded-xl border border-ink-100 bg-white p-1.5 shadow-xl">
              <button
                className="block w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium text-ink-600 hover:bg-brand-50"
                onClick={() => {
                  onChange(f.key, 'all')
                  setOpenKey(null)
                }}
              >
                All
              </button>
              {f.options.map((o) => (
                <button
                  key={o.value}
                  className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium hover:bg-brand-50 ${values[f.key] === o.value ? 'bg-brand-50 text-brand-600' : 'text-ink-600'}`}
                  onClick={() => {
                    onChange(f.key, o.value)
                    setOpenKey(null)
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {activeCount > 0 && onReset && (
        <button className="chip !text-rose-500 hover:!border-rose-300" onClick={onReset}>
          <X size={13} /> Reset
        </button>
      )}
    </div>
  )
}
