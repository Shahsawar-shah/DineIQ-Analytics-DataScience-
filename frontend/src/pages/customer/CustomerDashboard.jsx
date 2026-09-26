import { Link } from 'react-router-dom'
import {
  BarChart3, BookOpen, CalendarDays, ChevronRight, Clock, Flame, Heart, Package, ShoppingBag,
  Sparkles, Star, Tag, TrendingUp, Wallet,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import StatusBadge from '../../components/ui/StatusBadge'
import Stars from '../../components/ui/Stars'
import { InsightCard } from '../../components/ui/InsightCard'
import { useAuth } from '../../context/AuthContext'
import { CHANNEL_SHARE, CUSTOMER_ACTIVITY, CUSTOMER_PROMOS, FAVORITES, MY_ORDERS, RECOMMENDED, fmtMoney } from '../../data/mockData'

const STATUS_COLORS = {
  Completed: '#0d9459',
  Delivered: '#1d4ed8',
  Preparing: '#b54708',
  Cancelled: '#d92d20',
}

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
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const totalSpend = MY_ORDERS.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0)
  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        subtitle="Your personal dining intelligence snapshot"
        demo
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Orders" value={String(MY_ORDERS.length)} delta={12} icon={ShoppingBag} accent="#f95d0b" delay={0} />
        <KpiCard label="Total Spend" value={fmtMoney(totalSpend, 2)} delta={8.4} icon={Wallet} accent="#0d9459" delay={60} />
        <KpiCard label="Favorite Items" value={String(FAVORITES.length)} icon={Heart} accent="#e11d48" delay={120} />
        <KpiCard label="Loyalty Points" value="1,240" delta={5} icon={Star} accent="#f9a825" delay={180} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Recent Orders" subtitle="Your latest 5 orders" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="dq-table">
              <thead>
                <tr>
                  <th>Order</th><th>Date</th><th>Channel</th><th>Total</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {MY_ORDERS.slice(0, 5).map((o) => (
                  <tr key={o.id}>
                    <td className="font-semibold text-ink-900">{o.id}</td>
                    <td>{o.date}</td>
                    <td>{o.channel}</td>
                    <td className="font-semibold">{fmtMoney(o.total, 2)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/customer/orders" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline">
            View all orders <ChevronRight size={13} />
          </Link>
        </ChartCard>

        <ChartCard title="Ordering Channels" subtitle="How you usually order">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={CHANNEL_SHARE} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={4} strokeWidth={0}>
                  {CHANNEL_SHARE.map((_, i) => (
                    <Cell key={i} fill={['#f95d0b', '#fb7f38', '#f9a825', '#1d4ed8'][i % 4]} />
                  ))}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 space-y-1.5">
            {CHANNEL_SHARE.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ['#f95d0b', '#fb7f38', '#f9a825', '#1d4ed8'][i % 4] }} />
                  {c.name}
                </span>
                <span className="font-bold text-ink-900">{c.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Recommended For You"
          subtitle="Based on your taste profile"
          actions={
            <Link to="/customer/recommendations" className="text-xs font-bold text-brand-600 hover:underline">
              See all
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {RECOMMENDED.slice(0, 2).map((r) => (
              <div key={r.id} className="group flex gap-3 rounded-xl border border-ink-100 p-3 transition hover:border-brand-200 hover:shadow-md">
                <img src={r.image} alt={r.name} loading="lazy" className="food-card-img h-16 w-16 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900">{r.name}</p>
                  <p className="truncate text-[0.7rem] text-ink-400">{r.reason}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="badge badge-green">{r.match}% match</span>
                    <span className="text-xs font-bold text-brand-600">{fmtMoney(r.price, 2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Active Promotions" subtitle="Available to you right now"
          actions={<Link to="/customer/promotions" className="text-xs font-bold text-brand-600 hover:underline">See all</Link>}>
          <div className="space-y-3">
            {CUSTOMER_PROMOS.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-3.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                  <Tag size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{p.title}</p>
                  <p className="text-[0.7rem] text-ink-400">Min. spend {fmtMoney(p.minSpend)} · {p.valid}</p>
                </div>
                <code className="rounded-lg bg-white px-2.5 py-1.5 text-[0.7rem] font-bold tracking-wider text-brand-600 shadow-sm">{p.code}</code>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Spend Trend" subtitle="Last 6 orders" className="xl:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...MY_ORDERS].reverse().map((o) => ({ name: o.date.slice(5, 10), spend: o.total }))}>
                <defs>
                  <linearGradient id="custSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Area type="monotone" dataKey="spend" stroke="#f95d0b" strokeWidth={2.5} fill="url(#custSpend)" name="Spend ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Customer Activity" subtitle="Your recent actions">
          <div className="space-y-0.5">
            {CUSTOMER_ACTIVITY.slice(0, 6).map((a, i) => {
              const Icon = ACTIVITY_ICONS[a.kind] ?? Clock
              return (
                <div key={i} className="flex gap-3 rounded-xl px-2 py-2.5 transition hover:bg-brand-50/60">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${ACTIVITY_COLORS[a.kind]}1a`, color: ACTIVITY_COLORS[a.kind] }}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-snug text-ink-700">{a.text}</p>
                    <p className="text-[0.65rem] text-ink-300">{a.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard tone="info" title="You're 2 orders from Gold tier" text="Reach 25 lifetime orders to unlock 2x loyalty points and a free dessert every month." delay={0} />
        <InsightCard tone="success" title="New match for your taste" text="Grilled Salmon Bowl matches 94% with your profile — try it this weekend." delay={60} />
        <InsightCard tone="warn" title="BUNDLE20 expires soon" text="Your 20% combo discount is valid until September 30. Use it before it's gone." delay={120} />
        <InsightCard tone="info" title="Rate your last order" text="Tell us about the Truffle Mushroom Risotto — your ratings shape your recommendations." delay={180} />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Flame, label: 'Current Streak', value: '4 weekends' },
          { icon: CalendarDays, label: 'Member Since', value: 'Jan 2026' },
          { icon: TrendingUp, label: 'Avg. Basket', value: fmtMoney(38.2, 2) },
          { icon: BarChart3, label: 'Favorite Location', value: 'Downtown' },
        ].map((s) => (
          <div key={s.label} className="card card-hover flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink-400">{s.label}</p>
              <p className="font-display text-sm font-extrabold text-ink-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
