import { useMemo, useState } from 'react'
import { CalendarDays, ShoppingBag, TrendingUp, Wallet } from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import FilterBar from '@/components/ui/FilterBar'
import ChartCard from '@/components/charts/ChartCard'
import { FORECAST_DAILY, FORECAST_MONTHLY, FORECAST_WEEKLY, fmtMoney } from '@/data/mockData'

const HORIZONS = {
  Daily: FORECAST_DAILY,
  Weekly: FORECAST_WEEKLY,
  Monthly: FORECAST_MONTHLY,
} as const

type Horizon = keyof typeof HORIZONS

export default function Forecasting() {
  const [period, setPeriod] = useState<Horizon>('Daily')
  const series = HORIZONS[period]

  const stats = useMemo(() => {
    const fc = series.filter((d) => d.forecast !== null) as { forecast: number; low: number; high: number }[]
    const sum = fc.reduce((s, d) => s + d.forecast, 0)
    const lastActual = [...series].reverse().find((d) => d.actual !== null)?.actual ?? 0
    const firstFc = fc[0]?.forecast ?? 0
    const delta = lastActual ? +(((firstFc - lastActual) / lastActual) * 100).toFixed(1) : 0
    const fcOrders = Math.round(sum / 30.7)
    return { sum, low: fc.reduce((s, d) => s + d.low, 0), high: fc.reduce((s, d) => s + d.high, 0), delta, fcOrders }
  }, [series])

  return (
    <>
      <PageHeader title="Sales Forecasting" subtitle="Historical sales + ML forecast with confidence range" demo />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          {(Object.keys(HORIZONS) as Horizon[]).map((h) => (
            <button key={h} className={`chip ${period === h ? 'chip-active' : ''}`} onClick={() => setPeriod(h)}>
              {h}
            </button>
          ))}
        </div>
        <FilterBar
          className="ml-auto"
          filters={[
            { key: 'metric', label: 'Metric', options: [{ label: 'Revenue', value: 'Revenue' }, { label: 'Orders', value: 'Orders' }] },
            { key: 'loc', label: 'Location', options: [{ label: 'All locations', value: 'all' }, { label: 'Downtown Flagship', value: 'L1' }] },
          ]}
          values={{ metric: 'all', loc: 'all' }}
          onChange={() => undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="card card-hover anim-fade-up p-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Forecast Revenue</p>
          <p className="font-display mt-1.5 text-2xl font-extrabold text-ink-900">{fmtMoney(stats.sum)}</p>
          <p className="mt-1 text-xs text-ink-400">Range: {fmtMoney(stats.low)} – {fmtMoney(stats.high)}</p>
          <p className={`mt-2 inline-flex items-center gap-1 text-xs font-bold ${stats.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            <TrendingUp size={13} /> {stats.delta >= 0 ? '+' : ''}{stats.delta}% vs last actual
          </p>
        </div>
        <div className="card card-hover anim-fade-up p-5" style={{ animationDelay: '60ms' }}>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Forecast Orders</p>
          <p className="font-display mt-1.5 text-2xl font-extrabold text-ink-900">{stats.fcOrders.toLocaleString()}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-400"><ShoppingBag size={12} /> derived from AOV $30.70</p>
        </div>
        <div className="card card-hover anim-fade-up p-5" style={{ animationDelay: '120ms' }}>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Model Accuracy</p>
          <p className="font-display mt-1.5 text-2xl font-extrabold text-ink-900">94.2%</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-400"><CalendarDays size={12} /> XGBoost v2.3 (mock)</p>
        </div>
        <div className="card card-hover anim-fade-up p-5" style={{ animationDelay: '180ms' }}>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Trend Direction</p>
          <p className="font-display mt-1.5 text-2xl font-extrabold text-emerald-600">▲ Upward</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-400"><Wallet size={12} /> seasonality-adjusted</p>
        </div>
      </div>

      <ChartCard title={`${period} Forecast — Revenue`} subtitle="Solid = history · dashed = forecast · band = 90% confidence range" className="mt-5" height={340}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
            <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
            <RTooltip formatter={(v: unknown) => (typeof v === 'number' ? fmtMoney(v) : String(v))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="high" stroke="none" fill="url(#bandGrad)" name="Upper range" />
            <Area type="monotone" dataKey="low" stroke="none" fill="#ffffff" fillOpacity={0.9} name="Lower range" />
            <Area type="monotone" dataKey="actual" stroke="#f95d0b" strokeWidth={2.6} fill="url(#histGrad)" name="Actual" connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke="#1d4ed8" strokeWidth={2.4} strokeDasharray="7 5" dot={{ r: 3 }} connectNulls={false} name="Forecast" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Next Period Peak', value: fmtMoney(Math.max(...series.filter((d) => d.forecast).map((d) => d.forecast as number))), note: 'Highest forecast point' },
          { label: 'Confidence Band', value: `±${Math.round(((stats.high - stats.low) / 2 / stats.sum) * 100)}%`, note: '90% interval width' },
          { label: 'History Points', value: String(series.filter((d) => d.actual).length), note: 'Actuals feeding the model' },
          { label: 'Forecast Points', value: String(series.filter((d) => d.forecast).length), note: 'Predicted periods ahead' },
        ].map((c, i) => (
          <div key={c.label} className="card card-hover anim-fade-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ink-400">{c.label}</p>
            <p className="font-display mt-1.5 text-xl font-extrabold text-ink-900">{c.value}</p>
            <p className="mt-1 text-xs text-ink-400">{c.note}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[0.68rem] text-ink-300">
        Demo / Mock Data — the forecast series is illustrative. The real product computes it in the Spark +
        XGBoost pipeline described in the SRS.
      </p>
    </>
  )
}
