import { Link } from 'react-router-dom'
import {
  AlertTriangle, Boxes, Coins, Gauge, LineChart as LineChartIcon, PackageX, ShoppingBasket, Trash2,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { InsightCard } from '../../components/ui/InsightCard'
import {
  CONSUMPTION_TREND, FORECAST_DAILY, INVENTORY, WASTAGE_BY_CATEGORY, WASTAGE_TREND, fmtMoney, fmtNum,
} from '../../data/mockData'

export default function InventoryDashboard() {
  const low = INVENTORY.filter((i) => i.status === 'Low Stock')
  const out = INVENTORY.filter((i) => i.status === 'Out of Stock')
  const value = INVENTORY.reduce((s, i) => s + i.value, 0)
  const consumption = CONSUMPTION_TREND.reduce((s, c) => s + c.consumption, 0)
  const wastageUnits = WASTAGE_TREND.reduce((s, w) => s + w.wastage, 0)
  const forecast = FORECAST_DAILY.filter((f) => f.forecast).reduce((s, f) => s + f.forecast, 0)

  return (
    <>
      <PageHeader title="Inventory Control Center" subtitle="All locations · live stock and consumption view" demo
        actions={<span className="badge badge-green"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sync 5 min ago</span>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Boxes, label: 'Inventory Items', value: fmtNum(INVENTORY.length * 18), accent: '#f95d0b' },
          { icon: AlertTriangle, label: 'Low Stock Items', value: String(low.length * 3), accent: '#b54708' },
          { icon: PackageX, label: 'Out of Stock', value: String(out.length + 2), accent: '#d92d20' },
          { icon: Coins, label: 'Inventory Value', value: fmtMoney(value * 14), accent: '#0d9459' },
          { icon: ShoppingBasket, label: 'Consumption (30d)', value: `${fmtNum(consumption * 10)} units`, accent: '#1d4ed8' },
          { icon: Trash2, label: 'Wastage (week)', value: `${fmtNum(wastageUnits)} units`, accent: '#e11d48' },
          { icon: Gauge, label: 'Wastage Risk', value: 'Medium', accent: '#f9a825' },
          { icon: LineChartIcon, label: 'Forecasted Demand', value: `${fmtNum(Math.round(forecast * 9))} covers`, accent: '#6938ef' },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 55}ms` }}>
            <div className="flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${k.accent}16`, color: k.accent }}>
                <k.icon size={17} />
              </div>
            </div>
            <p className="font-display mt-3 text-lg font-extrabold text-ink-900">{k.value}</p>
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-ink-400">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Stock vs Consumption" subtitle="Weekly units, all locations" className="xl:col-span-2"
          actions={<Link to="/inventory/consumption" className="text-xs font-bold text-brand-600 hover:underline">Details</Link>}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CONSUMPTION_TREND}>
                <defs>
                  <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="consGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Area type="monotone" dataKey="stock" stroke="#1d4ed8" strokeWidth={2} fill="url(#stockGrad)" name="Stock on hand" />
                <Area type="monotone" dataKey="consumption" stroke="#f95d0b" strokeWidth={2.4} fill="url(#consGrad)" name="Consumption" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Low Stock Alerts" subtitle="Items below par level"
          actions={<Link to="/inventory/stock" className="text-xs font-bold text-brand-600 hover:underline">All stock</Link>}>
          <div className="space-y-2.5">
            {[...low, ...out].slice(0, 6).map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${i.status === 'Out of Stock' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink-900">{i.item}</p>
                  <p className="text-[0.65rem] text-ink-400">{i.stock} / {i.parLevel} {i.unit} · next delivery {i.nextDelivery}</p>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Wastage Trend" subtitle="Daily units this week">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WASTAGE_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="wastage" radius={[4, 4, 0, 0]} name="Units">
                  {WASTAGE_TREND.map((_, i) => <Cell key={i} fill={i >= 4 ? '#e11d48' : '#fb7f38'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Wastage by Category" subtitle="Share of waste">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WASTAGE_BY_CATEGORY} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#686d8c' }} width={70} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} name="% of waste" barSize={13} fill="#e11d48" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Demand Forecast (7 days)" subtitle="Expected covers, mock model"
          actions={<Link to="/inventory/forecast" className="text-xs font-bold text-brand-600 hover:underline">Full forecast</Link>}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={FORECAST_DAILY.filter((f) => f.forecast).map((f) => ({ day: f.day, covers: Math.round(f.forecast / 30.7) }))}>
                <defs>
                  <linearGradient id="fcInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6938ef" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6938ef" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Area type="monotone" dataKey="covers" stroke="#6938ef" strokeWidth={2.4} fill="url(#fcInv)" name="Covers" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <InsightCard tone="danger" title="Squid (Calamari) is out of stock" text="Delivery arrives Sep 26. Feature alternative starters to protect 860 monthly sales." />
        <InsightCard tone="warn" title="Produce drives 34% of wastage" text="Roma tomatoes and romaine lettuce are the top contributors — adjust crate sizes." delay={70} />
        <InsightCard tone="info" title="Reorder 36 kg coffee beans" text="Forecast shows +12% beverage demand; current stock covers 18 days." delay={140} />
      </div>
    </>
  )
}
