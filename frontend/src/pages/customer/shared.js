/**
 * Customer portal rules: menu lookup, basket pricing, promo codes, order
 * status and loyalty. Pure functions only — state lives in CustomerContext.
 */
import {
  CUSTOMER_PROMOS, DISH_IMAGES, LOCATIONS, MENU_ITEMS, SEED_ACTIVITY, SEED_FAVORITES, SEED_ORDERS, SEED_REVIEWS,
  fmtMoney,
} from '../../data/mockData'

export const DELIVERY_FEE = 4.99
export const MAX_QTY = 20
export const PREP_MINUTES = 10
export const POINTS_PER_DOLLAR = 10
export const ORDER_CHANNELS = ['Dine-in', 'Takeaway', 'Delivery']
export const DIETARY_OPTIONS = ['Vegetarian options', 'Gluten-free', 'Low spice', 'Seafood lover', 'Dessert first']
export const TIERS = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 1000 },
  { name: 'Gold', min: 2500 },
  { name: 'Platinum', min: 5000 },
]

export const ORDER_STATUS_COLORS = {
  Completed: '#0d9459',
  Delivered: '#1d4ed8',
  Preparing: '#b54708',
  Cancelled: '#d92d20',
}

const MENU = new Map(MENU_ITEMS.map((m) => [m.id, { ...m, image: DISH_IMAGES[m.id] ?? null }]))
export const menuItem = (id) => MENU.get(id) ?? null

/** Locations a customer can order from; ones under maintenance are listed but closed. */
export const ORDER_LOCATIONS = LOCATIONS.map((l) => ({ name: l.name, open: l.status === 'Operational' }))
export const isLocationOpen = (name) => ORDER_LOCATIONS.some((l) => l.name === name && l.open)

const round2 = (n) => Math.round(n * 100) / 100

/** Basket lines ({itemId, qty}) -> priced lines with the menu snapshot an order keeps. */
export function resolveLines(lines) {
  return lines
    .map(({ itemId, qty }) => {
      const m = menuItem(itemId)
      return m ? { itemId, name: m.name, category: m.category, price: m.price, qty } : null
    })
    .filter(Boolean)
}

export const lineUnits = (lines) => lines.reduce((s, l) => s + l.qty, 0)
const lineSubtotal = (lines) => round2(lines.reduce((s, l) => s + l.price * l.qty, 0))

export const findPromo = (code) => CUSTOMER_PROMOS.find((p) => p.code === String(code ?? '').trim().toUpperCase()) ?? null

/** Checks a promo against priced lines + channel. Returns { ok, discount, message }. */
export function evaluatePromo(promo, lines, channel) {
  const subtotal = lineSubtotal(lines)
  if (subtotal < promo.minSpend) {
    return { ok: false, discount: 0, message: `Add ${fmtMoney(round2(promo.minSpend - subtotal), 2)} more to use ${promo.code} (min. spend ${fmtMoney(promo.minSpend)})` }
  }
  if (promo.combo) {
    const cats = new Set(lines.map((l) => l.category))
    if (!cats.has('Main Course') || !(cats.has('Sides') || cats.has('Beverages'))) {
      return { ok: false, discount: 0, message: `${promo.code} needs a main course plus a side or drink` }
    }
    return { ok: true, discount: round2((subtotal * promo.percent) / 100), message: `${promo.code}: ${promo.title}` }
  }
  if (promo.category) {
    const base = lineSubtotal(lines.filter((l) => l.category === promo.category))
    if (base === 0) return { ok: false, discount: 0, message: `${promo.code} applies to ${promo.category.toLowerCase()}. Add one to your basket` }
    return { ok: true, discount: round2((base * promo.percent) / 100), message: `${promo.code}: ${promo.title}` }
  }
  if (promo.freeDelivery) {
    if (channel !== 'Delivery') return { ok: false, discount: 0, message: `${promo.code} is for delivery orders` }
    return { ok: true, discount: DELIVERY_FEE, message: `${promo.code}: ${promo.title}` }
  }
  return { ok: false, discount: 0, message: `${promo.code} cannot be applied` }
}

/** Full price breakdown for priced lines. A promo that does not qualify is reported, not applied. */
export function priceOrder(lines, channel, promoCode) {
  const subtotal = lineSubtotal(lines)
  const deliveryFee = channel === 'Delivery' && lines.length > 0 ? DELIVERY_FEE : 0
  const promo = promoCode ? findPromo(promoCode) : null
  const promoResult = promo ? evaluatePromo(promo, lines, channel) : null
  const discount = promoResult?.ok ? Math.min(promoResult.discount, subtotal + deliveryFee) : 0
  return {
    subtotal,
    deliveryFee,
    discount,
    total: round2(subtotal + deliveryFee - discount),
    promo,
    promoResult,
  }
}

/** A new order is Preparing for PREP_MINUTES, then Completed (or Delivered for delivery). */
export function orderStatus(order, now) {
  if (order.status !== 'Preparing') return order.status
  const ready = new Date(order.placedAt).getTime() + PREP_MINUTES * 60_000
  if (now < ready) return 'Preparing'
  return order.channel === 'Delivery' ? 'Delivered' : 'Completed'
}

export const isFulfilled = (status) => status === 'Completed' || status === 'Delivered'

export function nextOrderId(orders) {
  const max = orders.reduce((m, o) => Math.max(m, Number(o.id.replace(/\D/g, '')) || 0), 0)
  return `ORD-${max + 1}`
}

/** Points are earned on fulfilled orders only. */
export function loyaltyFor(orders) {
  const spend = orders.filter((o) => isFulfilled(o.status)).reduce((s, o) => s + o.total, 0)
  const points = Math.floor(spend * POINTS_PER_DOLLAR)
  const idx = TIERS.findLastIndex((t) => points >= t.min)
  const next = TIERS[idx + 1] ?? null
  return { points, spend: round2(spend), tier: TIERS[idx].name, next: next?.name ?? null, toNext: next ? next.min - points : 0 }
}

const pad = (n) => String(n).padStart(2, '0')
/** '2026-09-25 19:42' in the viewer's time zone. */
export function fmtDateTime(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fmtDate = (iso) => fmtDateTime(iso).slice(0, 10)
/** 'Sep 25 · 19:42' */
export function fmtShort(iso) {
  const d = new Date(iso)
  return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fmtMonthYear = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', year: 'numeric' })

export const STORE_VERSION = 1

/** State every customer account starts with (demo history). */
export function seedState() {
  return {
    v: STORE_VERSION,
    orders: SEED_ORDERS.map(({ lines, promoCode = null, ...o }) => {
      const priced = resolveLines(lines.map(([itemId, qty]) => ({ itemId, qty })))
      const { subtotal, deliveryFee, discount, total } = priceOrder(priced, o.channel, promoCode)
      return { ...o, lines: priced, promoCode, subtotal, deliveryFee, discount, total }
    }),
    favorites: [...SEED_FAVORITES],
    reviews: SEED_REVIEWS.map((r) => ({ ...r })),
    activity: SEED_ACTIVITY.map((a) => ({ ...a })),
    profile: { phone: '', preferredLocation: 'Downtown Flagship', dietary: ['Vegetarian options', 'Seafood lover'] },
    basket: { lines: [], channel: 'Dine-in', location: 'Downtown Flagship', promoCode: null },
  }
}

export const clampQty = (q) => Math.min(MAX_QTY, Math.max(1, Math.round(Number(q)) || 1))

/** Validates stored state so a stale or hand-edited localStorage entry can never break the pages. */
export function sanitizeState(raw) {
  const seed = seedState()
  if (!raw || raw.v !== STORE_VERSION) return seed
  const arr = (v) => (Array.isArray(v) ? v : [])
  const basket = raw.basket ?? {}
  return {
    v: STORE_VERSION,
    orders: arr(raw.orders).filter((o) => o && o.id && o.placedAt && Array.isArray(o.lines)),
    favorites: [...new Set(arr(raw.favorites).filter((id) => menuItem(id)))],
    reviews: arr(raw.reviews).filter((r) => r && menuItem(r.itemId) && r.rating >= 1 && r.rating <= 5),
    activity: arr(raw.activity).filter((a) => a && a.at && a.text),
    profile: { ...seed.profile, ...(raw.profile ?? {}), dietary: arr(raw.profile?.dietary).filter((d) => DIETARY_OPTIONS.includes(d)) },
    basket: {
      lines: arr(basket.lines).filter((l) => menuItem(l?.itemId)).map((l) => ({ itemId: l.itemId, qty: clampQty(l.qty) })),
      channel: ORDER_CHANNELS.includes(basket.channel) ? basket.channel : seed.basket.channel,
      location: ORDER_LOCATIONS.some((l) => l.name === basket.location) ? basket.location : seed.basket.location,
      promoCode: findPromo(basket.promoCode)?.code ?? null,
    },
  }
}
