import { Link } from 'react-router-dom'
import {
  ChefHat, DollarSign, Receipt, ShoppingBag, TriangleAlert, TrendingUp, Users, Wallet,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import ChartCard from '@/components/charts/ChartCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { InsightCard } from '@/components/ui/InsightCard'
import {
  ANOMALIES, CATEGORY_REVENUE, CHANNEL_SHARE, HOURLY_SALES, LOCATIONS, MENU_ITEMS, REVENUE_TREND,
  fmtMoney, fmtNum, fmtPct,
} from '@/data/mockData'

export default function ManagerDashboard() {
  const highPerf = MENU_ITEMS.filter((m) => m.perfClass === 'High').length
  return (
    <>
      <PageHeader
        title="Business Intelligence Overview"
        subtitle="Downtown Flagship · last 30 days"
        demo
        actions={<span className="badge badge-green"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data feed</span>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue" value={fmtMoney(128450)} delta={5.5} icon={DollarSign} accent="#f95d0b" />
        <KpiCard label="Profit" value={fmtMoney(41320)} delta={7.2} icon={Wallet} accent="#0d9459" delay={60} />
        <KpiCard label="Total Orders" value={fmtNum(4182)} delta={3.9} icon={ShoppingBag} accent="#1d4ed8" delay={120} />
        <KpiCard label="Avg Order Value" value={fmtMoney(30.7, 2)} delta={1.6} icon={Receipt} accent="#6938ef" delay={180} />
        <KpiCard label="Active Customers" value={fmtNum(1020)} delta={4.8} icon={Users} accent="#f9a825" delay={240} />
        <KpiCard label="Menu Performance" value={`${highPerf}/${MENU_ITEMS.length}`} footer={<span className="badge badge-green mt-1">High performers</span>} icon={ChefHat} accent="#e04a05" delay={300} />
        <KpiCard label="Wastage" value={fmtPct(3.1)} delta={-12.5} icon={TriangleAlert} accent="#d92d20" delay={360} />
        <KpiCard label="Forecast (next 7d)" value={fmtMoney(30180)} delta={3.8} icon={TrendingUp} accent="#0d9459" delay={420} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Revenue Overview" subtitle="Monthly revenue vs target — 2026" className="xl:col-span-2"
          actions={<Link to="/manager/sales" className="text-xs font-bold text-brand-600 hover:underline">Sales analytics</Link>}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_TREND}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
                <RTooltip formatter={(v: unknown) => (typeof v === 'number' ? fmtMoney(v) : String(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#f95d0b" strokeWidth={2.6} fill="url(#revGrad)" name="Revenue" />
                <Area type="monotone" dataKey="target" stroke="#1d4ed8" strokeWidth={1.6} strokeDasharray="5 4" fill="transparent" name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Ordering Channels" subtitle="Share of orders (30d)">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={CHANNEL_SHARE} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={4} strokeWidth={0}>
                  {CHANNEL_SHARE.map((_, i) => <Cell key={i} fill={['#f95d0b', '#fb7f38', '#f9a825', '#1d4ed8'][i % 4]} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
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

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Menu Matrix — Performance Classes" subtitle="Frontend classification from mock scoring"
          actions={<Link to="/manager/menu-intelligence" className="text-xs font-bold text-brand-600 hover:underline">Menu intelligence</Link>}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'High', count: MENU_ITEMS.filter((m) => m.perfClass === 'High').length },
                { name: 'Medium', count: MENU_ITEMS.filter((m) => m.perfClass === 'Medium').length },
                { name: 'Low', count: MENU_ITEMS.filter((m) => m.perfClass === 'Low').length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Items">
                  <Cell fill="#0d9459" /><Cell fill="#d97706" /><Cell fill="#e11d48" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {MENU_ITEMS.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs">
                <span className={`badge ${m.perfClass === 'High' ? 'badge-green' : m.perfClass === 'Medium' ? 'badge-amber' : 'badge-red'}`}>{m.perfClass}</span>
                <span className="truncate px-2 font-medium text-ink-600">{m.name}</span>
                <span className="font-bold text-ink-900">{fmtPct(m.margin)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Hourly Sales Pattern" subtitle="Average sales by hour">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HOURLY_SALES}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="sales" fill="#fb7f38" radius={[4, 4, 0, 0]} name="Sales ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Anomaly Watchlist" subtitle="Latest detection results"
          actions={<Link to="/manager/anomalies" className="text-xs font-bold text-brand-600 hover:underline">All anomalies</Link>}>
          <div className="space-y-2.5">
            {ANOMALIES.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-2.5">
                <span className={`h-2 w-2 rounded-full ${a.severity === 'Critical' ? 'bg-rose-500' : a.severity === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-800">{a.metric} — {a.location}</p>
                  <p className="text-[0.65rem] text-ink-400">{a.date} · expected {a.expected} → actual {a.actual}</p>
                </div>
                <StatusBadge status={a.severity} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard tone="success" title="Dessert margin opportunity" text="Lava Cake holds a 72% margin with +9.7% trend — feature it in upsell prompts." />
        <InsightCard tone="warn" title="Calamari wastage rising" text="5.6% wastage with falling sales. Reduce par level by 20% this week." delay={60} />
        <InsightCard tone="info" title="Champions drive 31% of revenue" text="184 customers in the Champions segment — protect with loyalty perks." delay={120} />
        <InsightCard tone="danger" title="Revenue anomaly at Harbor Point" text="Sep 24 revenue came in 32% below forecast. Investigation is open." delay={180} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Category Revenue Mix" subtitle="30-day revenue by menu category">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CATEGORY_REVENUE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#686d8c' }} width={82} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="value" fill="#f95d0b" radius={[0, 6, 6, 0]} name="Revenue ($)" barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Location Comparison" subtitle="Revenue trend by location (indexed)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={REVENUE_TREND.map((r) => ({
                month: r.month,
                Downtown: Math.round(r.revenue * 1),
                Riverside: Math.round(r.revenue * 0.67),
                Harbor: Math.round(r.revenue * 0.79),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
                <RTooltip />
                <Line type="monotone" dataKey="Downtown" stroke="#f95d0b" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="Riverside" stroke="#1d4ed8" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                <Line type="monotone" dataKey="Harbor" stroke="#0d9459" strokeWidth={2} strokeDasharray="2 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <p className="mt-4 text-[0.68rem] text-ink-300">
        Showing data scoped to {LOCATIONS.length} locations · Demo / Mock Data — connect the backend to see live figures.
      </p>
    </>
  )
}
