import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react'
import { useCustomer } from '../../context/CustomerContext'
import { fmtMoney } from '../../data/mockData'
import {
  DELIVERY_FEE, MAX_QTY, ORDER_CHANNELS, ORDER_LOCATIONS, isLocationOpen, menuItem,
} from '../../pages/customer/shared'
import DishImage from './DishImage'

/** Top-bar basket button with item count; opens the basket drawer. */
export default function BasketButton() {
  const { basketCount, basketOpen, openBasket } = useCustomer()
  return (
    <>
      <button className="topbar-icon-btn" onClick={openBasket} aria-label={`Basket, ${basketCount} items`} title="Your basket">
        <ShoppingBag size={16} />
        {basketCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-brand-500 px-1 text-[0.58rem] font-bold text-white">
            {basketCount > 99 ? '99+' : basketCount}
          </span>
        )}
      </button>
      {/* Portal: inside the sticky header the drawer would sit below the sidebar */}
      {basketOpen && createPortal(<BasketDrawer />, document.body)}
    </>
  )
}

function SummaryRow({ label, value, className = '' }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <dt>{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}

/** Mounted only while open, so its form state starts fresh every time. */
function BasketDrawer() {
  const {
    basket, basketLines, basketPricing, basketCount, closeBasket, setBasketQty, removeFromBasket, clearBasket,
    setBasketOptions, applyPromo, removePromo, placeOrder, notify,
  } = useCustomer()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [promoError, setPromoError] = useState(null)
  const [error, setError] = useState(null)
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && closeBasket()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [closeBasket])

  const { subtotal, deliveryFee, discount, total, promo, promoResult } = basketPricing
  const locationOpen = isLocationOpen(basket.location)
  const empty = basketLines.length === 0

  const submitCode = (e) => {
    e.preventDefault()
    const res = applyPromo(code)
    if (!res.ok) {
      setPromoError(res.message)
      return
    }
    setPromoError(null)
    setCode('')
  }

  const submitOrder = () => {
    const res = placeOrder()
    if (!res.ok) {
      setError(res.error)
      return
    }
    closeBasket()
    notify(`Order ${res.id} placed (${fmtMoney(res.total, 2)}). We're preparing it now.`)
    navigate('/customer/orders')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="anim-fade-in absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={closeBasket} />
      <aside role="dialog" aria-modal="true" aria-label="Your basket" className="anim-slide-right relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h2 className="font-display text-base font-extrabold text-ink-900">Your basket</h2>
            <p className="text-[0.7rem] text-ink-400">{basketCount === 1 ? '1 item' : `${basketCount} items`}</p>
          </div>
          <button ref={closeRef} className="topbar-icon-btn !h-9 !w-9 !rounded-lg" onClick={closeBasket} aria-label="Close basket">
            <X size={16} />
          </button>
        </div>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
              <ShoppingBag size={24} />
            </div>
            <p className="font-display mt-4 text-sm font-bold text-ink-900">Your basket is empty</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">
              Add dishes from your favorites or recommendations, or reorder something you had before.
            </p>
            {basket.promoCode && (
              <p className="mt-3 rounded-lg bg-brand-50 px-3 py-1.5 text-[0.7rem] font-semibold text-brand-600">
                {basket.promoCode} is saved and will apply at checkout
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link to="/customer/recommendations" onClick={closeBasket} className="btn btn-primary !px-4 !py-2 text-xs">Recommendations</Link>
              <Link to="/customer/favorites" onClick={closeBasket} className="btn btn-ghost !px-4 !py-2 text-xs">Favorites</Link>
              <Link to="/customer/orders" onClick={closeBasket} className="btn btn-ghost !px-4 !py-2 text-xs">My orders</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <ul className="space-y-4">
                {basketLines.map((l) => (
                  <li key={l.itemId} className="flex gap-3">
                    <DishImage item={menuItem(l.itemId)} className="h-16 w-16 shrink-0 rounded-xl" iconSize={20} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink-900">{l.name}</p>
                          <p className="text-[0.7rem] text-ink-400">{fmtMoney(l.price, 2)} each · {l.category}</p>
                        </div>
                        <button
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-300 transition hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => removeFromBasket(l.itemId)}
                          aria-label={`Remove ${l.name}`}
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-ink-100">
                          <button
                            className="grid h-7 w-7 place-items-center text-ink-500 hover:text-ink-900 disabled:opacity-30"
                            onClick={() => setBasketQty(l.itemId, l.qty - 1)}
                            disabled={l.qty <= 1}
                            aria-label={`Decrease ${l.name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-ink-900">{l.qty}</span>
                          <button
                            className="grid h-7 w-7 place-items-center text-ink-500 hover:text-ink-900 disabled:opacity-30"
                            onClick={() => setBasketQty(l.itemId, l.qty + 1)}
                            disabled={l.qty >= MAX_QTY}
                            aria-label={`Increase ${l.name}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-ink-900">{fmtMoney(l.price * l.qty, 2)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="space-y-4 border-t border-ink-100 pt-5">
                <div>
                  <label className="label" htmlFor="basket-location">Location</label>
                  <div className="relative">
                    <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <select
                      id="basket-location"
                      className={`input !py-2.5 !pl-9 text-sm ${locationOpen ? '' : 'input-error'}`}
                      value={basket.location}
                      onChange={(e) => {
                        setBasketOptions({ location: e.target.value })
                        setError(null)
                      }}
                    >
                      {ORDER_LOCATIONS.map((l) => (
                        <option key={l.name} value={l.name} disabled={!l.open}>
                          {l.name}{l.open ? '' : ' (temporarily closed)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!locationOpen && <p className="mt-1.5 text-[0.7rem] font-semibold text-rose-600">{basket.location} is temporarily closed. Choose another location.</p>}
                </div>
                <div>
                  <p className="label">How would you like it?</p>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-50 p-1">
                    {ORDER_CHANNELS.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        aria-pressed={basket.channel === ch}
                        className={`rounded-lg py-2 text-xs font-bold transition ${basket.channel === ch ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-700'}`}
                        onClick={() => setBasketOptions({ channel: ch })}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                  {basket.channel === 'Delivery' && (
                    <p className="mt-1.5 text-[0.7rem] text-ink-400">Delivery fee {fmtMoney(DELIVERY_FEE, 2)}, free with FREESHIP on orders over $30.</p>
                  )}
                </div>
                <div>
                  <p className="label">Promo code</p>
                  {promo ? (
                    <div
                      className={`flex items-center gap-2.5 rounded-xl border border-dashed px-3 py-2.5 ${
                        promoResult.ok ? 'border-emerald-300 bg-emerald-50/60' : 'border-amber-300 bg-amber-50/60'
                      }`}
                    >
                      <Tag size={14} className={`shrink-0 ${promoResult.ok ? 'text-emerald-600' : 'text-amber-600'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold tracking-wider text-ink-900">{promo.code}</p>
                        <p className={`text-[0.7rem] ${promoResult.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {promoResult.ok ? `${promo.title}: you save ${fmtMoney(discount, 2)}` : `Not applied yet. ${promoResult.message}`}
                        </p>
                      </div>
                      <button className="shrink-0 text-[0.7rem] font-bold text-ink-400 hover:text-rose-600" onClick={removePromo}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={submitCode} className="flex gap-2">
                        <input
                          className={`input !py-2.5 text-sm uppercase ${promoError ? 'input-error' : ''}`}
                          placeholder="Enter code"
                          aria-label="Promo code"
                          aria-invalid={!!promoError}
                          value={code}
                          onChange={(e) => {
                            setCode(e.target.value)
                            setPromoError(null)
                          }}
                        />
                        <button type="submit" className="btn btn-ghost !px-4 text-xs" disabled={!code.trim()}>Apply</button>
                      </form>
                      {promoError && <p className="mt-1.5 text-[0.7rem] font-semibold text-rose-600">{promoError}</p>}
                      <Link to="/customer/promotions" onClick={closeBasket} className="mt-1.5 inline-block text-[0.7rem] font-semibold text-brand-600 hover:underline">
                        See your offers
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-ink-100 px-5 py-4">
              <dl className="space-y-1.5 text-xs text-ink-500">
                <SummaryRow label="Subtotal" value={fmtMoney(subtotal, 2)} />
                {deliveryFee > 0 && <SummaryRow label="Delivery fee" value={fmtMoney(deliveryFee, 2)} />}
                {discount > 0 && <SummaryRow label={`Discount (${promo.code})`} value={`−${fmtMoney(discount, 2)}`} className="text-emerald-600" />}
                <SummaryRow label="Total" value={fmtMoney(total, 2)} className="border-t border-ink-100 pt-2 text-sm font-extrabold text-ink-900" />
              </dl>
              {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
              <button className="btn btn-primary mt-4 w-full !py-3 text-sm" onClick={submitOrder} disabled={!locationOpen}>
                Place order · {fmtMoney(total, 2)}
              </button>
              <button className="mt-2 w-full py-1 text-center text-[0.7rem] font-semibold text-ink-400 hover:text-rose-600" onClick={clearBasket}>
                Clear basket
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
