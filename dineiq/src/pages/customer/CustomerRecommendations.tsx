import { Sparkles } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Stars from '@/components/ui/Stars'
import { RECOMMENDED, fmtMoney } from '@/data/mockData'

export default function CustomerRecommendations() {
  return (
    <>
      <PageHeader title="Recommendations" subtitle="Personalized picks from the DineIQ recommendation engine" demo />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {RECOMMENDED.map((r, i) => (
          <div key={r.id} className="card card-hover group anim-fade-up overflow-hidden" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="relative h-40 overflow-hidden">
              <img src={r.image} alt={r.name} loading="lazy" className="food-card-img h-full w-full object-cover" />
              <span className="absolute left-3 top-3 badge badge-violet">
                <Sparkles size={11} /> {r.match}% match
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-display truncate text-sm font-bold text-ink-900">{r.name}</h3>
              <div className="mt-1.5"><Stars value={r.rating} /></div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-400">{r.reason}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-display text-lg font-extrabold text-brand-600">{fmtMoney(r.price, 2)}</span>
                <button className="btn btn-primary !px-4 !py-2 text-xs">Try it</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-xs leading-relaxed text-violet-800">
        <strong>How this works:</strong> in the full product, recommendations are produced by the ML service
        (market-basket + collaborative filtering) inside the DineIQ pipeline. This page shows mock output of
        that service for the demo account.
      </div>
    </>
  )
}
