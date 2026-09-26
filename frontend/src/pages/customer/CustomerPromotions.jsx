import { Check, Copy, Tag } from 'lucide-react'
import { useState } from 'react'
import PageHeader from '../../components/layout/PageHeader'
import { CUSTOMER_PROMOS, fmtMoney } from '../../data/mockData'

export default function CustomerPromotions() {
  const [copied, setCopied] = useState(null)
  const copy = (code) => {
    navigator.clipboard?.writeText(code).catch(() => undefined)
    setCopied(code)
    setTimeout(() => setCopied(null), 1600)
  }
  return (
    <>
      <PageHeader title="Promotions" subtitle="Active offers available on your account" demo />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {CUSTOMER_PROMOS.map((p, i) => (
          <div key={p.id} className="card card-hover anim-fade-up overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-3 bg-gradient-to-r from-brand-500 to-brand-400 px-5 py-4 text-white">
              <Tag size={20} />
              <div>
                <p className="font-display text-sm font-bold">{p.title}</p>
                <p className="text-[0.7rem] text-white/80">Valid: {p.valid}</p>
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs text-ink-500">Minimum spend <strong className="text-ink-900">{fmtMoney(p.minSpend)}</strong></p>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-4 py-3">
                <code className="text-sm font-bold tracking-[0.18em] text-brand-600">{p.code}</code>
                <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => copy(p.code)}>
                  {copied === p.code ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  {copied === p.code ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
