import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import { MiniStat } from '../../components/ui/InsightCard'
import { CalendarClock, LineChart as LineIcon, Target, Users } from 'lucide-react'
import { FORECAST_DAILY } from '../../data/mockData'

export default function DemandForecast() {
  const data = FORECAST_DAILY.map((f) => ({
    day: f.day,
    covers: f.actual !== null ? Math.round(f.actual / 30.7) : null,
    forecast: f.forecast !== null ? Math.round(f.forecast / 30.7) : null,
    low: f.low !== null ? Math.round(f.low / 30.7) : null,
    high: f.high !== null ? Math.round(f.high / 30.7) : null,
  }))
  const fc = data.filter((d) => d.forecast !== null)
  const avg = Math.round(fc.reduce((s, d) => s + d.forecast, 0) / fc.length)

  return (
    <>
      <PageHeader title="Demand Forecast" subtitle="Expected covers driving purchasing needs (mock model)" demo />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MiniStat icon={<Users size={17} />} color="#6938ef" label="Avg Forecast Covers" value={String(avg)} />
        <MiniStat icon={<CalendarClock size={17} />} color="#f95d0b" label="Peak Day" value={`${fc.reduce((a, b) => (b.forecast > a.forecast ? b : a)).forecast} covers`} />
        <MiniStat icon={<Target size={17} />} color="#0d9459" label="Model Accuracy" value="94.2%" />
        <MiniStat icon={<LineIcon size={17} />} color="#1d4ed8" label="Horizon" value="7 days" />
      </div>

      <ChartCard title="Covers Forecast — Next 7 Days" subtitle="Historical covers + forecast with confidence band" className="mt-5" height={330}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="bandCov" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6938ef" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#6938ef" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="histCov" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
            <RTooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="high" stroke="none" fill="url(#bandCov)" name="Upper range" />
            <Area type="monotone" dataKey="low" stroke="none" fill="#fff" fillOpacity={0.9} name="Lower range" />
            <Area type="monotone" dataKey="covers" stroke="#f95d0b" strokeWidth={2.6} fill="url(#histCov)" name="Actual covers" connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke="#6938ef" strokeWidth={2.4} strokeDasharray="7 5" dot={{ r: 3 }} connectNulls={false} name="Forecast covers" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Recommended Prep Labor', value: '+8% weekend shifts', note: 'Matches Saturday covers peak' },
          { label: 'Seafood Pre-order', value: '40 kg salmon', note: 'Cover 3-day lead time' },
          { label: 'Produce Deliveries', value: '4× per week', note: 'Cut romaine spoilage' },
          { label: 'Beverage Stock', value: '+36 kg beans', note: 'Cold brew trend +12.3%' },
        ].map((c, i) => (
          <div key={c.label} className="card card-hover anim-fade-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-400">{c.label}</p>
            <p className="font-display mt-1.5 text-lg font-extrabold text-ink-900">{c.value}</p>
            <p className="mt-1 text-xs text-ink-400">{c.note}</p>
          </div>
        ))}
      </div>
    </>
  )
}
