import { Heart, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Stars from '@/components/ui/Stars'
import { FAVORITES, fmtMoney } from '@/data/mockData'

export default function CustomerFavorites() {
  return (
    <>
      <PageHeader title="Favorites" subtitle="The dishes you keep coming back to" demo />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {FAVORITES.map((f, i) => (
          <div key={f.id} className="card card-hover group anim-fade-up overflow-hidden" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="relative h-40 overflow-hidden">
              <img src={f.image} alt={f.name} loading="lazy" className="food-card-img h-full w-full object-cover" />
              <span className="absolute left-3 top-3 badge badge-orange">{f.category}</span>
              <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-rose-500 shadow">
                <Heart size={15} className="fill-rose-500" />
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-display truncate text-sm font-bold text-ink-900">{f.name}</h3>
              <div className="mt-1.5"><Stars value={f.rating} /></div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-display text-lg font-extrabold text-brand-600">{fmtMoney(f.price, 2)}</span>
                <span className="text-[0.68rem] font-semibold text-ink-400">{f.orders} orders</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn btn-primary flex-1 !py-2 text-xs">Add to basket</button>
                <button className="btn btn-ghost !px-3 !py-2" title="Remove from favorites" aria-label="Remove">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
