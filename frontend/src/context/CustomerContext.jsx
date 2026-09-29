import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import Toast, { useToast } from '../components/ui/Toast'
import {
  clampQty, findPromo, isLocationOpen, menuItem, nextOrderId, orderStatus, priceOrder, resolveLines, sanitizeState,
  MAX_QTY, ORDER_CHANNELS,
} from '../pages/customer/shared'

const CustomerContext = createContext(null)

const STORAGE_PREFIX = 'dineiq_customer:'
const MAX_ACTIVITY = 50

function loadState(key) {
  try {
    return sanitizeState(JSON.parse(localStorage.getItem(key)))
  } catch {
    return sanitizeState(null)
  }
}

const logEntry = (text, kind) => ({ at: new Date().toISOString(), text, kind })
const withActivity = (s, ...entries) => ({ ...s, activity: [...entries, ...s.activity].slice(0, MAX_ACTIVITY) })

/**
 * Customer portal state: basket, orders, favorites, reviews and profile.
 * Kept per signed-in account in localStorage, so it survives reloads and is
 * shared across open tabs.
 */
export function CustomerProvider({ children }) {
  const { user } = useAuth()
  const storageKey = `${STORAGE_PREFIX}${user?.email ?? 'guest'}`
  const [state, setState] = useState(() => loadState(storageKey))
  const [loadedKey, setLoadedKey] = useState(storageKey)
  const [basketOpen, setBasketOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const { toast, showToast, hideToast } = useToast()

  // Another account signed in without a remount: switch to its own data
  if (loadedKey !== storageKey) {
    setLoadedKey(storageKey)
    setState(loadState(storageKey))
  }

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // storage full or disabled: the session keeps working in memory
    }
  }, [storageKey, state])

  useEffect(() => {
    const onStorage = (e) => e.key === storageKey && setState(loadState(storageKey))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [storageKey])

  // Re-evaluate "Preparing" orders while any are in flight
  const hasPreparing = state.orders.some((o) => o.status === 'Preparing')
  useEffect(() => {
    if (!hasPreparing) return
    const t = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [hasPreparing])

  const orders = useMemo(
    () => state.orders
      .map((o) => ({ ...o, status: orderStatus(o, now), items: o.lines.reduce((s, l) => s + l.qty, 0) }))
      .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt)),
    [state.orders, now],
  )

  const basketLines = useMemo(() => resolveLines(state.basket.lines), [state.basket.lines])
  const basketPricing = useMemo(
    () => priceOrder(basketLines, state.basket.channel, state.basket.promoCode),
    [basketLines, state.basket.channel, state.basket.promoCode],
  )
  const basketCount = basketLines.reduce((s, l) => s + l.qty, 0)
  const qtyInBasket = useCallback((itemId) => state.basket.lines.find((l) => l.itemId === itemId)?.qty ?? 0, [state.basket.lines])

  const openBasket = useCallback(() => setBasketOpen(true), [])
  const closeBasket = useCallback(() => setBasketOpen(false), [])
  const notify = useCallback((message, opts = {}) => showToast(message, opts.tone ?? 'success', opts.action ?? null), [showToast])
  const viewBasketAction = useMemo(() => ({ label: 'View basket', onClick: () => setBasketOpen(true) }), [])

  const updateBasket = (fn) => setState((s) => ({ ...s, basket: { ...s.basket, ...fn(s.basket) } }))

  /* ---------- basket ---------- */

  const addToBasket = (itemId, qty = 1) => {
    const item = menuItem(itemId)
    if (!item) return
    const current = qtyInBasket(itemId)
    if (current >= MAX_QTY) {
      notify(`You can order up to ${MAX_QTY} × ${item.name} at once`, { tone: 'error' })
      return
    }
    updateBasket((b) => ({
      lines: current
        ? b.lines.map((l) => (l.itemId === itemId ? { ...l, qty: clampQty(l.qty + qty) } : l))
        : [...b.lines, { itemId, qty: clampQty(qty) }],
    }))
    notify(`Added ${item.name} to your basket`, { action: viewBasketAction })
  }

  const setBasketQty = (itemId, qty) =>
    updateBasket((b) => ({ lines: b.lines.map((l) => (l.itemId === itemId ? { ...l, qty: clampQty(qty) } : l)) }))

  const removeFromBasket = (itemId) => updateBasket((b) => ({ lines: b.lines.filter((l) => l.itemId !== itemId) }))

  const clearBasket = () => {
    const snapshot = state.basket
    updateBasket(() => ({ lines: [], promoCode: null }))
    notify('Basket cleared', { action: { label: 'Undo', onClick: () => setState((s) => ({ ...s, basket: snapshot })) } })
  }

  const setBasketOptions = ({ channel, location }) =>
    updateBasket((b) => ({
      channel: ORDER_CHANNELS.includes(channel) ? channel : b.channel,
      location: location ?? b.location,
    }))

  /** Saves the code on the basket; priceOrder() decides live whether it qualifies. */
  const applyPromo = (code) => {
    const promo = findPromo(code)
    if (!promo) return { ok: false, message: `"${String(code).trim().toUpperCase()}" is not a valid promo code` }
    updateBasket(() => ({ promoCode: promo.code }))
    const result = priceOrder(basketLines, state.basket.channel, promo.code).promoResult
    return { ok: true, code: promo.code, qualifies: result.ok, message: result.message }
  }

  const removePromo = () => updateBasket(() => ({ promoCode: null }))

  const reorder = (orderId) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return
    const available = order.lines.filter((l) => menuItem(l.itemId))
    const wasEmpty = state.basket.lines.length === 0
    updateBasket((b) => {
      const lines = [...b.lines]
      for (const l of available) {
        const i = lines.findIndex((x) => x.itemId === l.itemId)
        if (i >= 0) lines[i] = { ...lines[i], qty: clampQty(lines[i].qty + l.qty) }
        else lines.push({ itemId: l.itemId, qty: clampQty(l.qty) })
      }
      // An empty basket takes over the old order's location and channel when they can still be used
      const takeOver = wasEmpty && isLocationOpen(order.location)
      return {
        lines,
        location: takeOver ? order.location : b.location,
        channel: wasEmpty && ORDER_CHANNELS.includes(order.channel) ? order.channel : b.channel,
      }
    })
    setBasketOpen(true)
    notify(`${available.reduce((s, l) => s + l.qty, 0)} items from ${order.id} added to your basket`)
  }

  /** Turns the basket into an order. Returns { ok, id } or { ok: false, error }. */
  const placeOrder = () => {
    const { channel, location, promoCode } = state.basket
    if (basketLines.length === 0) return { ok: false, error: 'Your basket is empty' }
    if (!isLocationOpen(location)) return { ok: false, error: `${location} is not taking orders right now. Choose another location` }
    const { subtotal, deliveryFee, discount, total, promoResult } = basketPricing
    const usedPromo = promoResult?.ok ? promoCode : null
    const id = nextOrderId(state.orders)
    const order = {
      id,
      placedAt: new Date().toISOString(),
      channel,
      location,
      status: 'Preparing',
      lines: basketLines,
      promoCode: usedPromo,
      subtotal,
      deliveryFee,
      discount,
      total,
    }
    const entries = [logEntry(`Placed order ${id} at ${location} (${channel})`, 'order')]
    if (usedPromo) entries.unshift(logEntry(`Redeemed promo code ${usedPromo} on ${id}`, 'promo'))
    setState((s) => withActivity({ ...s, orders: [order, ...s.orders], basket: { ...s.basket, lines: [], promoCode: null } }, ...entries))
    setNow(Date.now())
    return { ok: true, id, total }
  }

  const cancelOrder = (orderId) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'Preparing') {
      notify('This order can no longer be cancelled', { tone: 'error' })
      return false
    }
    setState((s) => withActivity(
      { ...s, orders: s.orders.map((o) => (o.id === orderId ? { ...o, status: 'Cancelled' } : o)) },
      logEntry(`Order ${orderId} was cancelled`, 'alert'),
    ))
    notify(`Order ${orderId} cancelled`)
    return true
  }

  /* ---------- favorites ---------- */

  const isFavorite = (itemId) => state.favorites.includes(itemId)

  /** `index` restores an undone removal to its old position (and is not logged as new activity). */
  const addFavorite = (itemId, index) => {
    const item = menuItem(itemId)
    if (!item) return
    setState((s) => {
      if (s.favorites.includes(itemId)) return s
      const favorites = [...s.favorites]
      favorites.splice(Math.min(index ?? favorites.length, favorites.length), 0, itemId)
      return index === undefined ? withActivity({ ...s, favorites }, logEntry(`Added ${item.name} to favorites`, 'fav')) : { ...s, favorites }
    })
  }

  const removeFavorite = (itemId) => {
    const index = state.favorites.indexOf(itemId)
    if (index < 0) return
    setState((s) => ({ ...s, favorites: s.favorites.filter((id) => id !== itemId) }))
    notify(`Removed ${menuItem(itemId)?.name} from favorites`, { action: { label: 'Undo', onClick: () => addFavorite(itemId, index) } })
  }

  const toggleFavorite = (itemId) => {
    if (isFavorite(itemId)) {
      removeFavorite(itemId)
    } else {
      addFavorite(itemId)
      notify(`Saved ${menuItem(itemId)?.name} to favorites`)
    }
  }

  /* ---------- reviews ---------- */

  /** One review per dish: writing again replaces the earlier one. */
  const saveReview = ({ itemId, rating, comment }) => {
    const item = menuItem(itemId)
    if (!item || rating < 1 || rating > 5) return false
    const existing = state.reviews.find((r) => r.itemId === itemId)
    const review = {
      id: existing?.id ?? `RV-${Date.now()}`,
      itemId,
      rating,
      comment: (comment ?? '').trim(),
      date: new Date().toISOString().slice(0, 10),
    }
    setState((s) => withActivity(
      { ...s, reviews: [review, ...s.reviews.filter((r) => r.itemId !== itemId)] },
      logEntry(`Rated ${item.name} ${rating} star${rating === 1 ? '' : 's'}`, 'rating'),
    ))
    notify(existing ? `Review for ${item.name} updated` : `Thanks! Your review of ${item.name} is posted`)
    return true
  }

  const deleteReview = (reviewId) => {
    const index = state.reviews.findIndex((r) => r.id === reviewId)
    if (index < 0) return
    const review = state.reviews[index]
    setState((s) => ({ ...s, reviews: s.reviews.filter((r) => r.id !== reviewId) }))
    notify(`Review of ${menuItem(review.itemId)?.name} deleted`, {
      action: {
        label: 'Undo',
        onClick: () => setState((s) => {
          if (s.reviews.some((r) => r.itemId === review.itemId)) return s
          const reviews = [...s.reviews]
          reviews.splice(index, 0, review)
          return { ...s, reviews }
        }),
      },
    })
  }

  /* ---------- profile ---------- */

  /** The preferred location also becomes the basket's location while the basket is empty. */
  const saveProfile = (profile) => setState((s) => {
    const next = { ...s.profile, ...profile }
    const moveBasket = s.basket.lines.length === 0 && isLocationOpen(next.preferredLocation)
    return { ...s, profile: next, basket: moveBasket ? { ...s.basket, location: next.preferredLocation } : s.basket }
  })

  const value = {
    orders,
    favorites: state.favorites,
    reviews: state.reviews,
    activity: state.activity,
    profile: state.profile,
    basket: state.basket,
    basketLines,
    basketPricing,
    basketCount,
    basketOpen,
    qtyInBasket,
    openBasket,
    closeBasket,
    addToBasket,
    setBasketQty,
    removeFromBasket,
    clearBasket,
    setBasketOptions,
    applyPromo,
    removePromo,
    reorder,
    placeOrder,
    cancelOrder,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    saveReview,
    deleteReview,
    saveProfile,
    notify,
  }

  return (
    <CustomerContext.Provider value={value}>
      {children}
      <Toast toast={toast} onClose={hideToast} />
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be used inside <CustomerProvider>')
  return ctx
}
