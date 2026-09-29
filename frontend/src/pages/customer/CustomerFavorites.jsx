import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, Trash2 } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Stars from '../../components/ui/Stars'
import DishImage from '../../components/customer/DishImage'
import { useCustomer } from '../../context/CustomerContext'
import { fmtMoney } from '../../data/mockData'
import { menuItem } from './shared'

export default function CustomerFavorites() {
  const { favorites, orders, addToBasket, removeFavorite, qtyInBasket } = useCustomer()
  const items = favorites.map(menuItem).filter(Boolean)

  // How many of the customer's (non-cancelled) orders included each dish
  const timesOrdered = useMemo(() => {
    const counts = {}
    for (const o of orders) {
      if (o.status === 'Cancelled') continue
      for (const l of o.lines) counts[l.itemId] = (counts[l.itemId] ?? 0) + 1
    }
    return counts
  }, [orders])

  return (
    <>
      <PageHeader title="Favorites" subtitle="The dishes you keep coming back to" />
      {items.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <Heart size={24} />
          </div>
          <p className="font-display mt-4 text-sm font-bold text-ink-900">No favorites yet</p>
          <p className="mt-1 max-w-sm text-xs text-ink-400">Tap the heart on any recommended dish to keep it here for quick reordering.</p>
          <Link to="/customer/recommendations" className="btn btn-primary mt-5 !px-5 !py-2 text-xs">Browse recommendations</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((f, i) => {
            const inBasket = qtyInBasket(f.id)
            const ordered = timesOrdered[f.id] ?? 0
            return (
              <div key={f.id} className="card card-hover group anim-fade-up overflow-hidden" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="relative h-40 overflow-hidden">
                  <DishImage item={f} className="food-card-img h-full w-full" />
                  <span className="absolute left-3 top-3 badge badge-orange">{f.category}</span>
                  <button
                    className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-rose-500 shadow transition hover:scale-110"
                    onClick={() => removeFavorite(f.id)}
                    aria-label={`Remove ${f.name} from favorites`}
                    title="Remove from favorites"
                  >
                    <Heart size={15} className="fill-rose-500" />
                  </button>
                  {inBasket > 0 && <span className="anim-pop absolute bottom-3 left-3 badge badge-green shadow-sm">{inBasket} in basket</span>}
                </div>
                <div className="p-4">
                  <h3 className="font-display truncate text-sm font-bold text-ink-900">{f.name}</h3>
                  <div className="mt-1.5"><Stars value={f.rating} /></div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-display text-lg font-extrabold text-brand-600">{fmtMoney(f.price, 2)}</span>
                    <span className="text-[0.68rem] font-semibold text-ink-400">
                      {ordered ? `Ordered ${ordered}×` : 'Not ordered yet'}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn btn-primary flex-1 !py-2 text-xs" onClick={() => addToBasket(f.id)}>
                      <ShoppingBag size={13} /> Add to basket
                    </button>
                    <button
                      className="btn btn-ghost !px-3 !py-2 hover:!border-rose-200 hover:!text-rose-600"
                      onClick={() => removeFavorite(f.id)}
                      title="Remove from favorites"
                      aria-label={`Remove ${f.name} from favorites`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
