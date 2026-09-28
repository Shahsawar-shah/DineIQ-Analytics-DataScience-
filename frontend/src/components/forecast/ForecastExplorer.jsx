import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Gauge, Target, TrendingUp } from 'lucide-react'
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../../services/api'
import ChartCard from '../charts/ChartCard'
import DataTable from '../ui/DataTable'
import KpiCard from '../ui/KpiCard'
import LoadingState, { ErrorState } from '../ui/LoadingState'
import { InsightCard } from '../ui/InsightCard'
import useApi from '../../hooks/useApi'
import { fmtNum, fmtPct } from '../../utils/helpers'

const LEVELS = [
  { value: 'overall', label: 'All items' },
  { value: 'category', label: 'Menu category' },
  { value: 'location', label: 'Location' },
  { value: 'item', label: 'Menu item' },
]
const HORIZONS = [7, 14, 30, 60, 90]
const MODEL_KEYS = ['Naive (last value)', 'Seasonal Naive (7-day)', 'Linear Regression', 'ARIMA']

function buildChart(forecast) {
  const byDate = new Map()
  const row = (date) => {
    if (!byDate.has(date)) byDate.set(date, { date })
    return byDate.get(date)
  }
  forecast.history.forEach((p) => { row(p.date).actual = p.actual })
  forecast.test.forEach((p) => {
    const r = row(p.date)
    r.actual = p.actual
    r.backtest = p[forecast.best_model]
    r.naive = p['Naive (last value)']
  })
  forecast.future.forEach((p) => {
    const r = row(p.date)
    r.forecast = p.forecast
    r.band = [p.lower, p.upper]
  })
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export default function ForecastExplorer({ defaultLevel = 'overall', defaultHorizon = 30 }) {
  const [level, setLevel] = useState(defaultLevel)
  const [entityId, setEntityId] = useState(null)
  const [horizon, setHorizon] = useState(defaultHorizon)
  const [forecast, setForecast] = useState({ loading: true, error: null, data: null })

  const entities = useApi(() => (level === 'overall' ? Promise.resolve([]) : api.forecast.entities(level)), [level])
  const levelMetrics = useApi(() => api.forecast.metrics(level), [level])

  // pick the first entity whenever the level changes
  useEffect(() => {
    if (level === 'overall') setEntityId(null)
    else if (entities.data?.length && !entities.data.some((e) => e.entity_id === entityId)) setEntityId(entities.data[0].entity_id)
  }, [level, entities.data, entityId])

  useEffect(() => {
    if (level !== 'overall' && !entityId) return
    setForecast((f) => ({ ...f, loading: true }))
    api.forecast.demand({ level, entityId, horizon })
      .then((data) => setForecast({ loading: false, error: null, data }))
      .catch((err) => setForecast({ loading: false, error: err.message, data: null }))
  }, [level, entityId, horizon])

  const chart = useMemo(() => (forecast.data ? buildChart(forecast.data) : []), [forecast.data])

  if (forecast.error) return <ErrorState message={forecast.error} />
  if (!forecast.data) return <LoadingState />

  const f = forecast.data
  const m = f.best_model_metrics
  const testStart = f.test_period.start
  const firstFuture = f.future[0]?.date

  const metricColumns = [
    { key: 'name', header: LEVELS.find((l) => l.value === level)?.label ?? 'Series', render: (r) => <span className="font-semibold text-ink-900">{r.name}</span> },
    { key: 'model', header: 'Best model', render: (r) => r.best_model },
    { key: 'mae', header: 'MAE', align: 'right', render: (r) => fmtNum(r.mae, 1) },
    { key: 'rmse', header: 'RMSE', align: 'right', render: (r) => fmtNum(r.rmse, 1) },
    { key: 'mape', header: 'MAPE', align: 'right', render: (r) => fmtPct(r.mape) },
    { key: 'naive', header: 'Naive MAE', align: 'right', render: (r) => fmtNum(r.naive_mae, 1) },
    {
      key: 'imp', header: 'vs baseline', align: 'right',
      render: (r) => <span className={r.beats_baseline ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{r.improvement_vs_naive_pct > 0 ? '+' : ''}{r.improvement_vs_naive_pct}%</span>,
    },
  ]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input !w-auto !py-2 text-xs" value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        {level !== 'overall' && (
          <select className="input !w-auto !py-2 text-xs" value={entityId ?? ''} onChange={(e) => setEntityId(e.target.value)}>
            {(entities.data ?? []).map((e) => <option key={e.entity_id} value={e.entity_id}>{e.name}</option>)}
          </select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-500">Horizon</span>
          {HORIZONS.map((h) => (
            <button key={h} className={`chip ${horizon === h ? 'chip-active' : ''}`} onClick={() => setHorizon(h)}>{h} days</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label={`Forecast units, next ${horizon} days`} value={fmtNum(f.forecast_total)} icon={CalendarDays} accent="#1d4ed8"
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">Estimate for {f.name}</p>} />
        <KpiCard label="Best model (lowest test MAE)" value={f.best_model} icon={Gauge} accent="#6938ef" delay={60}
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">MAE {fmtNum(m.mae, 1)} · RMSE {fmtNum(m.rmse, 1)}</p>} />
        <KpiCard label="Test MAPE" value={fmtPct(m.mape)} icon={Target} accent="#0d9459" delay={120}
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">R² {m.r2 ?? '—'} on {f.test_period.days} unseen days</p>} />
        <KpiCard label="vs naive baseline" value={`${f.improvement_vs_naive_pct > 0 ? '+' : ''}${f.improvement_vs_naive_pct}%`} icon={TrendingUp}
          accent={f.beats_baseline ? '#0d9459' : '#e11d48'} delay={180}
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">{f.beats_baseline ? 'Lower MAE than last-value forecast' : 'Does not beat the baseline'}</p>} />
      </div>

      <ChartCard
        title={`Historical vs predicted demand: ${f.name}`}
        subtitle={`Train ${f.train_period.start} → ${f.train_period.end} · test ${f.test_period.start} → ${f.test_period.end} · band = 90% interval`}
        className="mt-5" height={360}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtNum(v)} />
            <RTooltip formatter={(v) => (Array.isArray(v) ? `${fmtNum(v[0])} – ${fmtNum(v[1])}` : fmtNum(v, 1))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={testStart} stroke="#878ba7" strokeDasharray="4 4" label={{ value: 'test →', fontSize: 10, fill: '#878ba7', position: 'insideTopLeft' }} />
            {firstFuture && <ReferenceLine x={firstFuture} stroke="#1d4ed8" strokeDasharray="4 4" label={{ value: 'forecast →', fontSize: 10, fill: '#1d4ed8', position: 'insideTopLeft' }} />}
            <Area type="monotone" dataKey="band" stroke="none" fill="#1d4ed8" fillOpacity={0.12} name="90% interval" />
            <Line type="monotone" dataKey="actual" stroke="#f95d0b" strokeWidth={2} dot={false} name="Actual" connectNulls={false} />
            <Line type="monotone" dataKey="backtest" stroke="#6938ef" strokeWidth={2} dot={false} name={`${f.best_model} (test)`} />
            <Line type="monotone" dataKey="naive" stroke="#878ba7" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Naive baseline (test)" />
            <Line type="monotone" dataKey="forecast" stroke="#1d4ed8" strokeWidth={2.4} strokeDasharray="7 5" dot={false} name="Forecast" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Model comparison on the test period" subtitle="Chronological split, no future data in training" className="xl:col-span-2">
          <table className="dq-table w-full text-sm">
            <thead><tr><th>Model</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th>R²</th></tr></thead>
            <tbody>
              {MODEL_KEYS.filter((k) => f.test[0]?.[k] !== undefined).map((k) => {
                const test = f.test.map((p) => p[k])
                const actual = f.test.map((p) => p.actual)
                const mae = test.reduce((s, v, i) => s + Math.abs(actual[i] - v), 0) / test.length
                const rmse = Math.sqrt(test.reduce((s, v, i) => s + (actual[i] - v) ** 2, 0) / test.length)
                const nz = actual.map((a, i) => [a, test[i]]).filter(([a]) => a !== 0)
                const mape = nz.length ? (nz.reduce((s, [a, p]) => s + Math.abs((a - p) / a), 0) / nz.length) * 100 : null
                const mean = actual.reduce((s, v) => s + v, 0) / actual.length
                const ssTot = actual.reduce((s, v) => s + (v - mean) ** 2, 0)
                const r2 = ssTot ? 1 - test.reduce((s, v, i) => s + (actual[i] - v) ** 2, 0) / ssTot : null
                return (
                  <tr key={k} className={k === f.best_model ? '!bg-emerald-50/60' : ''}>
                    <td className="font-semibold text-ink-900">{k}{k === f.best_model && <span className="badge badge-green ml-2">Best</span>}{k.startsWith('Naive') || k.startsWith('Seasonal') ? <span className="badge badge-gray ml-2">baseline</span> : null}</td>
                    <td>{fmtNum(mae, 1)}</td>
                    <td>{fmtNum(rmse, 1)}</td>
                    <td>{fmtPct(mape)}</td>
                    <td>{r2 === null ? '—' : r2.toFixed(3)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-400">{f.validation}</p>
        </ChartCard>

        <ChartCard title="High-risk demand days" subtitle={`Forecast ≥ ${fmtNum(f.high_risk_threshold)} units (90th percentile of history)`}>
          {f.high_risk_days.length === 0 ? (
            <p className="text-xs text-ink-400">No day in the next {horizon} days exceeds the high-demand threshold.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-auto">
              {f.high_risk_days.map((d) => (
                <div key={d.date} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-amber-800"><AlertTriangle size={13} /> {d.date}</span>
                  <span className="font-bold text-ink-900">{fmtNum(d.forecast)} units</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {levelMetrics.data && (
        <ChartCard
          title="Forecast accuracy by series"
          subtitle={`${levelMetrics.data.series.filter((s) => s.beats_baseline).length} of ${levelMetrics.data.series.length} series beat the naive baseline`}
          className="mt-5"
        >
          <DataTable columns={metricColumns} rows={levelMetrics.data.series} rowKey={(r) => r.entity_id} maxHeight={380} />
        </ChartCard>
      )}

      <div className="mt-5">
        <InsightCard tone="info" title="Estimates, not actuals" text={`${f.note} Model version ${f.model_version}.`} />
      </div>
    </>
  )
}
