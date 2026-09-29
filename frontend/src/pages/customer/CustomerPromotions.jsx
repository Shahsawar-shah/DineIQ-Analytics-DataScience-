import { Check, CheckCircle2, Copy, ShoppingBag, Tag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader'
import { useCustomer } from '../../context/CustomerContext'
import { CUSTOMER_PROMOS, fmtMoney } from '../../data/mockData'

/** Copies text, falling back to a hidden textarea where the Clipboard API is unavailable (plain-HTTP deployments). */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    el.remove()
    return ok
  }
}

export default function CustomerPromotions() {
  const { basket, basketCount, applyPromo, removePromo, notify, openBasket } = useCustomer()
  const [copied, setCopied] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async (code) => {
    if (!(await copyText(code))) {
      notify(`Could not copy. Your code is ${code}`, { tone: 'error' })
      return
    }
    setCopied(code)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1600)
  }

  const apply = (code) => {
    const res = applyPromo(code)
    const viewBasket = { label: 'View basket', onClick: openBasket }
    if (basketCount === 0) notify(`${code} saved. It will apply when your basket qualifies`, { action: viewBasket })
    else if (res.qualifies) notify(`${code} applied to your basket`, { action: viewBasket })
    else notify(`${code} saved. ${res.message}`, { action: viewBasket })
  }

  return (
    <>
      <PageHeader title="Promotions" subtitle="Active offers available on your account. One code per order" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {CUSTOMER_PROMOS.map((p, i) => {
          const applied = basket.promoCode === p.code
          return (
            <div key={p.id} className="card card-hover anim-fade-up flex flex-col overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-3 bg-brand-500 px-5 py-4 text-white">
                <Tag size={20} />
                <div>
                  <p className="font-display text-sm font-bold">{p.title}</p>
                  <p className="text-[0.7rem] text-white/80">{p.terms}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs text-ink-500">Minimum spend <strong className="text-ink-900">{fmtMoney(p.minSpend)}</strong></p>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-4 py-3">
                  <code className="text-sm font-bold tracking-[0.18em] text-brand-600">{p.code}</code>
                  <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => copy(p.code)}>
                    {copied === p.code ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    {copied === p.code ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {applied ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Applied to your basket</span>
                    <button className="font-bold text-ink-400 hover:text-rose-600" onClick={removePromo}>Remove</button>
                  </div>
                ) : (
                  <button className="btn btn-primary mt-3 w-full !py-2.5 text-xs" onClick={() => apply(p.code)}>
                    <ShoppingBag size={13} /> Apply to basket
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
