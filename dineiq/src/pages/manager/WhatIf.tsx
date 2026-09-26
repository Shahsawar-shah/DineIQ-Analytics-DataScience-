import { useMemo, useState } from 'react'
import { FlaskConical, Info, Play, RotateCcw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import { LOCATIONS, MENU_ITEMS, fmtMoney, fmtNum } from '@/data/mockData'

export default function WhatIf() {
  const [item, setItem] = useState(MENU_ITEMS[0].name)
  const [location, setLocation] = useState('Downtown Flagship')
  const [priceChange, setPriceChange] = useState(5)
  const [discount, setDiscount] = useState(10)
  const [demand, setDemand] = useState(100)
  const [ran, setRan] = useState(true)

  const base = MENU_ITEMS.find((m) => m.name === item) ?? MENU_ITEMS[0]
  const locFactor = location === 'Downtown Flagship' ? 1 : 0.72

  const result = useMemo(() => {
    // Purely illustrative arithmetic — NOT a real ML model.
    const elasticity = -0.9
    const priceFactor = 1 + priceChange / 100
    const promoFactor = 1 + (discount / 100) * 0.6
    const demandFactor = demand / 100
    const volume = base.sold / 12 * locFactor * demandFactor * (1 + elasticity * (priceChange / 100)) * promoFactor
    const newPrice = base.price * priceFactor * (1 - discount / 100)
    const revenue = volume * newPrice
    const profit = volume * (newPrice - base.cost)
    const orders = volume
    const demandChange = (volume / (base.sold / 12 * locFactor) - 1) * 100
    return { volume, newPrice, revenue, profit, orders, demandChange }
  }, [base, priceChange, discount, demand, locFactor])

  const baseline = { revenue: (base.sold / 12) * base.price * locFactor, profit: (base.sold / 12) * (base.price - base.cost) * locFactor, orders: (base.sold / 12) * locFactor }

  const compare = [
    { name: 'Baseline', Revenue: Math.round(baseline.revenue), Profit: Math.round(baseline.profit), Orders: Math.round(baseline.orders) },
    { name: 'Simulated', Revenue: Math.round(result.revenue), Profit: Math.round(result.profit), Orders: Math.round(result.orders) },
  ]

  const reset = () => { setPriceChange(0); setDiscount(0); setDemand(100) }

  return (
    <>
      <PageHeader
        title="What-If Simulation"
        subtitle="Explore pricing and promotion scenarios before you commit"
        demo
        actions={<span className="badge badge-violet"><FlaskConical size={11} /> Demo / Mock Simulation</span>}
      />

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Inputs */}
        <div className="card anim-fade-up space-y-5 p-5 xl:col-span-2">
          <h3 className="font-display text-sm font-bold text-ink-900">Scenario Inputs</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Menu item</label>
              <select className="input" value={item} onChange={(e) => setItem(e.target.value)}>
                {MENU_ITEMS.map((m) => <option key={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <select className="input" value={location} onChange={(e) => setLocation(e.target.value)}>
                {LOCATIONS.map((l) => <option key={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <label className="label">Price change</label>
              <span className={`text-xs font-bold ${priceChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{priceChange >= 0 ? '+' : ''}{priceChange}%</span>
            </div>
            <input type="range" min={-20} max={20} step={1} value={priceChange} onChange={(e) => { setPriceChange(Number(e.target.value)); setRan(true) }} className="w-full accent-brand-500" />
            <div className="flex justify-between text-[0.62rem] text-ink-300"><span>−20%</span><span>0%</span><span>+20%</span></div>
          </div>

          <div>
            <div className="flex justify-between">
              <label className="label">Promotion discount</label>
              <span className="text-xs font-bold text-brand-600">{discount}%</span>
            </div>
            <input type="range" min={0} max={40} step={5} value={discount} onChange={(e) => { setDiscount(Number(e.target.value)); setRan(true) }} className="w-full accent-brand-500" />
            <div className="flex justify-between text-[0.62rem] text-ink-300"><span>0%</span><span>40%</span></div>
          </div>

          <div>
            <div className="flex justify-between">
              <label className="label">Expected demand</label>
              <span className="text-xs font-bold text-ink-700">{demand}% of baseline</span>
            </div>
            <input type="range" min={50} max={150} step={5} value={demand} onChange={(e) => { setDemand(Number(e.target.value)); setRan(true) }} className="w-full accent-brand-500" />
            <div className="flex justify-between text-[0.62rem] text-ink-300"><span>50%</span><span>100%</span><span>150%</span></div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button className="btn btn-primary !px-6 !py-2.5 text-xs"><Play size={13} /> Run simulation</button>
            <button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={reset}><RotateCcw size={13} /> Reset</button>
          </div>

          <p className="flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-[0.68rem] leading-relaxed text-violet-700">
            <Info size={14} className="mt-0.5 shrink-0" />
            Results are produced by a simple illustrative formula on mock baselines — no ML inference runs in
            this frontend demo. In production this panel calls the scoring service from the SRS.
          </p>
        </div>

        {/* Outputs */}
        <div className="space-y-5 xl:col-span-3">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Estimated Revenue', value: fmtMoney(result.revenue), delta: ((result.revenue / baseline.revenue - 1) * 100).toFixed(1) },
              { label: 'Estimated Profit', value: fmtMoney(result.profit), delta: ((result.profit / baseline.profit - 1) * 100).toFixed(1) },
              { label: 'Estimated Orders', value: fmtNum(Math.round(result.orders)), delta: ((result.orders / baseline.orders - 1) * 100).toFixed(1) },
              { label: 'Demand Change', value: `${result.demandChange >= 0 ? '+' : ''}${result.demandChange.toFixed(1)}%`, delta: result.demandChange.toFixed(1) },
            ].map((k, i) => (
              <div key={k.label} className="card card-hover anim-pop p-5" style={{ animationDelay: `${i * 60}ms` }}>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ink-400">{k.label}</p>
                <p className="font-display mt-1.5 text-2xl font-extrabold text-ink-900">{k.value}</p>
                <p className={`mt-1 text-xs font-bold ${Number(k.delta) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {Number(k.delta) >= 0 ? '▲' : '▼'} {Math.abs(Number(k.delta))}% vs baseline
                </p>
              </div>
            ))}
          </div>

          <div className="card anim-fade-up p-5">
            <h3 className="font-display mb-1 text-sm font-bold text-ink-900">Baseline vs Simulated</h3>
            <p className="mb-3 text-xs text-ink-400">
              {base.name} @ {location} · effective price {fmtMoney(result.newPrice, 2)} (was {fmtMoney(base.price, 2)})
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compare}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#686d8c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                  <RTooltip />
                  <Bar dataKey="Revenue" fill="#f95d0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Profit" fill="#0d9459" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Orders" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
