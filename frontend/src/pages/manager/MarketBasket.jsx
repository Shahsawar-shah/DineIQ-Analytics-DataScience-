import { useState } from 'react'
import { ArrowRight, Network, ShoppingBasket } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import FilterBar from '../../components/ui/FilterBar'
import { ASSOCIATIONS } from '../../data/mockData'

export default function MarketBasket() {
  const [minLift, setMinLift] = useState('all')
  const rows = ASSOCIATIONS.filter((a) => minLift === 'all' || a.lift >= Number(minLift))

  const columns = [
    {
      key: 'pair',
      header: 'Item A → Item B',
      render: (r) => (
        <span className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-ink-900">{r.a}</span>
          <ArrowRight size={13} className="shrink-0 text-brand-500" />
          <span className="font-semibold text-ink-900">{r.b}</span>
        </span>
      ),
    },
    { key: 'support', header: 'Support', align: 'right', render: (r) => `${(r.support * 100).toFixed(1)}%` },
    {
      key: 'confidence',
      header: 'Confidence',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="meter w-20"><span style={{ width: `${r.confidence * 100}%`, background: 'linear-gradient(90deg,#fb7f38,#f95d0b)' }} /></div>
          <span className="w-9 text-right text-xs font-semibold">{(r.confidence * 100).toFixed(0)}%</span>
        </div>
      ),
    },
    {
      key: 'lift',
      header: 'Lift',
      align: 'right',
      render: (r) => (
        <span className={`badge ${r.lift >= 2 ? 'badge-green' : r.lift >= 1.5 ? 'badge-amber' : 'badge-gray'}`}>
          {r.lift.toFixed(1)}× {r.lift >= 2 ? 'strong' : r.lift >= 1.5 ? 'moderate' : 'weak'}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Market Basket Analysis" subtitle="Association rules mined from order baskets (Apriori-style, mock)" demo />

      <div className="mb-4">
        <FilterBar
          filters={[{ key: 'lift', label: 'Min Lift', options: ['1.5', '2.0'].map((v) => ({ label: `${v}×`, value: v })) }]}
          values={{ lift: minLift }}
          onChange={(_, v) => setMinLift(v === 'all' ? 'all' : v)}
          onReset={() => setMinLift('all')}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard title="Lift by Item Pair" subtitle="Lift > 1 means items are bought together more than chance" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="b"
                  tick={{ fontSize: 9, fill: '#686d8c' }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <RTooltip />
                <Bar dataKey="lift" radius={[0, 6, 6, 0]} name="Lift" barSize={14}>
                  {rows.map((r, i) => <Cell key={i} fill={r.lift >= 2 ? '#0d9459' : r.lift >= 1.5 ? '#f9a825' : '#878ba7'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="space-y-3 xl:col-span-2">
          <div className="card anim-fade-up flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500"><ShoppingBasket size={18} /></div>
            <div>
              <p className="font-display text-lg font-extrabold text-ink-900">{ASSOCIATIONS.length}</p>
              <p className="text-xs text-ink-400">Significant rules found (mock)</p>
            </div>
          </div>
          {ASSOCIATIONS.slice(0, 3).map((a, i) => (
            <div key={i} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${(i + 1) * 70}ms` }}>
              <div className="flex items-center gap-2 text-xs font-bold text-ink-900">
                <Network size={14} className="text-brand-500" />
                {a.a} <ArrowRight size={12} className="text-brand-400" /> {a.b}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-ink-50 py-1.5">
                  <p className="text-[0.6rem] font-bold uppercase text-ink-400">Support</p>
                  <p className="text-xs font-extrabold text-ink-900">{(a.support * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-lg bg-ink-50 py-1.5">
                  <p className="text-[0.6rem] font-bold uppercase text-ink-400">Confidence</p>
                  <p className="text-xs font-extrabold text-ink-900">{(a.confidence * 100).toFixed(0)}%</p>
                </div>
                <div className="rounded-lg bg-brand-50 py-1.5">
                  <p className="text-[0.6rem] font-bold uppercase text-brand-400">Lift</p>
                  <p className="text-xs font-extrabold text-brand-600">{a.lift}×</p>
                </div>
              </div>
              <p className="mt-2 text-[0.68rem] leading-snug text-ink-400">
                Guests ordering <strong>{a.a}</strong> order <strong>{a.b}</strong> {(a.confidence * 100).toFixed(0)}% of the time — {a.lift}× more than random.
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <h3 className="font-display text-sm font-bold text-ink-900">Association Rules Table</h3>
          <span className="badge badge-violet">Demo / Mock Data</span>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => `${r.a}-${r.b}`} />
      </div>
    </>
  )
}
