import { Heart, ShoppingBag } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Stars from '../../components/ui/Stars'
import DishImage from '../../components/customer/DishImage'
import { useCustomer } from '../../context/CustomerContext'
import { RECOMMENDED, fmtMoney } from '../../data/mockData'
import { menuItem } from './shared'

export default function CustomerRecommendations() {
  const { addToBasket, isFavorite, toggleFavorite, qtyInBasket } = useCustomer()
  const items = RECOMMENDED.map((r) => ({ ...menuItem(r.id), ...r })).filter((r) => r.name)

  return (
    <>
      <PageHeader title="Recommendations" subtitle="Dishes picked for you based on your past orders and ratings" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((r, i) => {
          const fav = isFavorite(r.id)
          const inBasket = qtyInBasket(r.id)
          return (
            <div key={r.id} className="card card-hover group anim-fade-up flex flex-col overflow-hidden" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="relative h-40 overflow-hidden">
                <DishImage item={r} className="food-card-img h-full w-full" />
                <span className="absolute left-3 top-3 badge bg-white text-ink-800">{r.match}% match</span>
                <button
                  className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow transition hover:scale-110 ${fav ? 'text-rose-500' : 'text-ink-400 hover:text-rose-500'}`}
                  onClick={() => toggleFavorite(r.id)}
                  aria-pressed={fav}
                  aria-label={fav ? `Remove ${r.name} from favorites` : `Save ${r.name} to favorites`}
                  title={fav ? 'Remove from favorites' : 'Save to favorites'}
                >
                  <Heart size={15} className={fav ? 'fill-rose-500' : ''} />
                </button>
                {inBasket > 0 && <span className="anim-pop absolute bottom-3 left-3 badge badge-green shadow-sm">{inBasket} in basket</span>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display truncate text-sm font-bold text-ink-900">{r.name}</h3>
                <div className="mt-1.5"><Stars value={r.rating} /></div>
                <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-ink-400">{r.reason}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-lg font-extrabold text-brand-600">{fmtMoney(r.price, 2)}</span>
                  <button className="btn btn-primary !px-4 !py-2 text-xs" onClick={() => addToBasket(r.id)}>
                    <ShoppingBag size={13} /> Try it
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
