import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Clock, Heart, MessageSquare, Plus, ShoppingBag,
  Star, Tag, TrendingUp, Wallet,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { InsightCard } from '../../components/ui/InsightCard'
import DishImage from '../../components/customer/DishImage'
import { useAuth } from '../../context/AuthContext'
import { useCustomer } from '../../context/CustomerContext'
import { CUSTOMER_PROMOS, RECOMMENDED, fmtMoney } from '../../data/mockData'
import { fmtDateTime, fmtMonthYear, fmtShort, isFulfilled, loyaltyFor, menuItem } from './shared'

const CHANNEL_COLORS = ['#f95d0b', '#fb7f38', '#f9a825', '#1d4ed8']
// Clickable wrapper for the insight cards
const TIP = 'block w-full rounded-2xl text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300'

const ACTIVITY_ICONS = {
  order: ShoppingBag,
  rating: Star,
  promo: Tag,
  fav: Heart,
  alert: BookOpen,
}
const ACTIVITY_COLORS = {
  order: '#f95d0b',
  rating: '#f9a825',
  promo: '#1d4ed8',
  fav: '#e11d48',
  alert: '#d92d20',
}

export default function CustomerDashboard() {
  const { user } = useAuth()
  const { orders, favorites, reviews, activity, basket, basketCount, addToBasket, applyPromo, openBasket, notify } = useCustomer()
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const stats = useMemo(() => {
    const fulfilled = orders.filter((o) => isFulfilled(o.status))
    const inProgress = orders.filter((o) => o.status === 'Preparing').length
    const spend = fulfilled.reduce((s, o) => s + o.total, 0)
    const byChannel = {}
    const byLocation = {}
    for (const o of orders) {
      if (o.status === 'Cancelled') continue
      byChannel[o.channel] = (byChannel[o.channel] ?? 0) + 1
      byLocation[o.location] = (byLocation[o.location] ?? 0) + 1
    }
    const counted = Object.values(byChannel).reduce((s, n) => s + n, 0)
    const channels = Object.entries(byChannel)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => ({ name, value: Math.round((n / counted) * 100), orders: n }))
    const favoriteLocation = Object.entries(byLocation).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    const trend = fulfilled
      .slice(0, 8)
      .reverse()
      .map((o) => ({ name: fmtDateTime(o.placedAt).slice(5, 10), spend: o.total, id: o.id }))
    return {
      inProgress,
      spend,
      avgBasket: fulfilled.length ? spend / fulfilled.length : 0,
      channels,
      favoriteLocation,
      trend,
      loyalty: loyaltyFor(orders),
      firstOrder: orders.length ? orders[orders.length - 1].placedAt : null,
    }
  }, [orders])

  const orderedIds = useMemo(() => new Set(orders.flatMap((o) => o.lines.map((l) => l.itemId))), [orders])
  const recommended = RECOMMENDED.map((r) => ({ ...menuItem(r.id), ...r })).filter((r) => r.name)
  const newToTry = recommended.find((r) => !orderedIds.has(r.id))

  // Latest fulfilled order with a dish the customer has not reviewed yet
  const toRate = useMemo(() => {
    const reviewed = new Set(reviews.map((r) => r.itemId))
    for (const o of orders) {
      if (!isFulfilled(o.status)) continue
      const line = o.lines.find((l) => !reviewed.has(l.itemId))
      if (line) return line
    }
    return null
  }, [orders, reviews])

  const applyCode = (code) => {
    const res = applyPromo(code)
    const viewBasket = { label: 'View basket', onClick: openBasket }
    notify(basketCount && res.qualifies ? `${code} applied to your basket` : `${code} saved. It will apply when your basket qualifies`, { action: viewBasket })
  }

  const { loyalty } = stats
  return (
    <>
      <PageHeader title={`Welcome back, ${firstName}`} subtitle="Your orders, rewards and offers" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Orders"
          value={String(orders.length)}
          icon={ShoppingBag}
          accent="#f95d0b"
          delay={0}
          footer={<p className="mt-1 text-xs text-ink-400">{stats.inProgress ? `${stats.inProgress} being prepared` : 'None in progress'}</p>}
        />
        <KpiCard
          label="Total Spend"
          value={fmtMoney(stats.spend, 2)}
          icon={Wallet}
          accent="#0d9459"
          delay={60}
          footer={<p className="mt-1 text-xs text-ink-400">Completed and delivered orders</p>}
        />
        <KpiCard
          label="Favorite Items"
          value={String(favorites.length)}
          icon={Heart}
          accent="#e11d48"
          delay={120}
          footer={<Link to="/customer/favorites" className="mt-1 inline-block text-xs font-semibold text-brand-600 hover:underline">View favorites</Link>}
        />
        <KpiCard
          label="Loyalty Points"
          value={loyalty.points.toLocaleString('en-US')}
          icon={Star}
          accent="#f9a825"
          delay={180}
          footer={<p className="mt-1 text-xs text-ink-400">{loyalty.tier} tier{loyalty.next ? ` · ${loyalty.toNext.toLocaleString('en-US')} to ${loyalty.next}` : ''}</p>}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Recent Orders" subtitle="Your latest 5 orders" className="xl:col-span-2" actions={null}>
          {orders.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-400">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="dq-table">
                <thead>
                  <tr>
                    <th>Order</th><th>Date</th><th>Channel</th><th>Total</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((o) => (
                    <tr key={o.id}>
                      <td className="font-semibold text-ink-900">{o.id}</td>
                      <td>{fmtDateTime(o.placedAt)}</td>
                      <td>{o.channel}</td>
                      <td className="font-semibold">{fmtMoney(o.total, 2)}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link to="/customer/orders" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline">
            View all orders <ChevronRight size={13} />
          </Link>
        </ChartCard>

        <ChartCard title="Ordering Channels" subtitle="How you usually order" actions={null}>
          {stats.channels.length === 0 ? (
            <p className="py-16 text-center text-xs text-ink-400">Your channels appear after your first order.</p>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.channels} dataKey="orders" innerRadius={48} outerRadius={72} paddingAngle={4} strokeWidth={0}>
                      {stats.channels.map((c, i) => (
                        <Cell key={c.name} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v, name) => [`${v} order${v === 1 ? '' : 's'}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 space-y-1.5">
                {stats.channels.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-ink-500">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="font-bold text-ink-900">{c.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Recommended For You"
          subtitle="Based on your taste profile"
          actions={<Link to="/customer/recommendations" className="text-xs font-bold text-brand-600 hover:underline">See all</Link>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {recommended.slice(0, 2).map((r) => (
              <div key={r.id} className="group flex gap-3 rounded-xl border border-ink-100 p-3 transition hover:border-brand-200 hover:shadow-md">
                <DishImage item={r} className="food-card-img h-16 w-16 shrink-0 rounded-lg" iconSize={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{r.name}</p>
                  <p className="truncate text-[0.7rem] text-ink-400">{r.reason}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="badge badge-green">{r.match}% match</span>
                    <span className="text-xs font-bold text-brand-600">{fmtMoney(r.price, 2)}</span>
                    <button
                      className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600"
                      onClick={() => addToBasket(r.id)}
                      aria-label={`Add ${r.name} to basket`}
                      title="Add to basket"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Active Promotions"
          subtitle="Available to you right now"
          actions={<Link to="/customer/promotions" className="text-xs font-bold text-brand-600 hover:underline">See all</Link>}
        >
          <div className="space-y-3">
            {CUSTOMER_PROMOS.map((p) => {
              const applied = basket.promoCode === p.code
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-500 text-white">
                    <Tag size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{p.title}</p>
                    <p className="truncate text-[0.7rem] text-ink-400">Min. spend {fmtMoney(p.minSpend)} · {p.terms}</p>
                  </div>
                  {applied ? (
                    <span className="flex shrink-0 items-center gap-1 text-[0.7rem] font-bold text-emerald-600"><CheckCircle2 size={13} /> Applied</span>
                  ) : (
                    <button
                      className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-[0.7rem] font-bold tracking-wider text-brand-600 shadow-sm transition hover:bg-brand-500 hover:text-white"
                      onClick={() => applyCode(p.code)}
                      title={`Apply ${p.code} to your basket`}
                    >
                      {p.code}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Spend Trend" subtitle="Your last completed orders" className="xl:col-span-2" actions={null}>
          <div className="h-56">
            {stats.trend.length === 0 ? (
              <p className="py-20 text-center text-xs text-ink-400">No completed orders yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trend}>
                  <defs>
                    <linearGradient id="custSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                  <RTooltip formatter={(v) => [fmtMoney(v, 2), 'Spend']} labelFormatter={(l, p) => p?.[0]?.payload?.id ?? l} />
                  <Area type="monotone" dataKey="spend" stroke="#f95d0b" strokeWidth={2.5} fill="url(#custSpend)" name="Spend" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Customer Activity" subtitle="Your recent actions" actions={null}>
          <div className="space-y-0.5">
            {activity.length === 0 && <p className="py-8 text-center text-xs text-ink-400">Nothing yet.</p>}
            {activity.slice(0, 6).map((a, i) => {
              const Icon = ACTIVITY_ICONS[a.kind] ?? Clock
              return (
                <div key={`${a.at}-${i}`} className="flex gap-3 rounded-xl px-2 py-2.5 transition hover:bg-brand-50/60">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${ACTIVITY_COLORS[a.kind]}1a`, color: ACTIVITY_COLORS[a.kind] }}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-snug text-ink-700">{a.text}</p>
                    <p className="text-[0.65rem] text-ink-300">{fmtShort(a.at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/customer/profile" className={TIP}>
          <InsightCard
            tone="info"
            title={loyalty.next ? `${loyalty.toNext.toLocaleString('en-US')} points to ${loyalty.next}` : `You're a ${loyalty.tier} member`}
            text={`You earn 10 points for every $1 on completed orders. You are ${loyalty.tier} with ${loyalty.points.toLocaleString('en-US')} points.`}
            delay={0}
          />
        </Link>
        <Link to="/customer/recommendations" className={TIP}>
          <InsightCard
            tone="success"
            title="Something new to try"
            text={newToTry ? `Based on what you usually order, you might like the ${newToTry.name}.` : 'You have tried every dish we recommended. New picks arrive as you order.'}
            delay={60}
          />
        </Link>
        {basketCount > 0 ? (
          <button className={TIP} onClick={openBasket}>
            <InsightCard
              tone="warn"
              title={`${basketCount} item${basketCount === 1 ? '' : 's'} in your basket`}
              text="Your basket is saved. Open it to choose a location and place your order."
              delay={120}
            />
          </button>
        ) : (
          <Link to="/customer/promotions" className={TIP}>
            <InsightCard tone="warn" title={`${CUSTOMER_PROMOS.length} offers available`} text={`${CUSTOMER_PROMOS[0].code}: ${CUSTOMER_PROMOS[0].title}. ${CUSTOMER_PROMOS[0].terms}.`} delay={120} />
          </Link>
        )}
        <Link to={toRate ? `/customer/ratings?item=${toRate.itemId}` : '/customer/ratings'} className={TIP}>
          <InsightCard
            tone="info"
            title={toRate ? 'Rate your last order' : 'All caught up on reviews'}
            text={toRate ? `How was the ${toRate.name}? Your ratings help us suggest better dishes.` : 'You have reviewed every dish you ordered. Thank you!'}
            delay={180}
          />
        </Link>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: MessageSquare, label: 'Reviews Written', value: String(reviews.length) },
          { icon: CalendarDays, label: 'First Order', value: stats.firstOrder ? fmtMonthYear(stats.firstOrder) : 'Not yet' },
          { icon: TrendingUp, label: 'Avg. Basket', value: fmtMoney(stats.avgBasket, 2) },
          { icon: BarChart3, label: 'Favorite Location', value: stats.favoriteLocation },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
              <s.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink-400">{s.label}</p>
              <p className="font-display truncate text-sm font-extrabold text-ink-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
