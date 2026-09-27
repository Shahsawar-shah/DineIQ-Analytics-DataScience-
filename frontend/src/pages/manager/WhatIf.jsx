import { useEffect, useState } from 'react'
import { FlaskConical, Info, Play, RotateCcw } from 'lucide-react'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

export default function WhatIf() {
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [error, setError] = useState(null)

  const [itemId, setItemId] = useState(null)
  const [priceChange, setPriceChange] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [prepChange, setPrepChange] = useState(0)

  const [result, setResult] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [simError, setSimError] = useState(null)

  useEffect(() => {
    api.whatif
      .items()
      .then((data) => {
        setItems(data)
        if (data.length) setItemId(data[0].item_id)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingItems(false))
  }, [])

  const runSimulation = async () => {
    setSimulating(true)
    setSimError(null)
    try {
      const res = await api.whatif.simulate({
        item_id: itemId,
        price_change_pct: priceChange,
        discount_pct: discount,
        prep_quantity_change_pct: prepChange,
      })
      if (res.error) throw new Error(res.error)
      setResult(res)
    } catch (err) {
      setSimError(err.message)
    } finally {
      setSimulating(false)
    }
  }

  const reset = () => {
    setPriceChange(0)
    setDiscount(0)
    setPrepChange(0)
    setResult(null)
  }

  if (loadingItems) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const selectedItem = items.find((i) => i.item_id === itemId)

  return (
    <>
      <PageHeader
        title="What-If Simulation"
        subtitle="Simulate price, discount and prep quantity changes on real menu data"
        actions={<span className="badge badge-green"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data feed</span>}
      />

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Inputs */}
        <div className="card anim-fade-up space-y-5 p-5 xl:col-span-2">
          <h3 className="font-display text-sm font-bold text-ink-900">Scenario Inputs</h3>

          <div>
            <label className="label">Menu item</label>
            <select className="input" value={itemId ?? ''} onChange={(e) => { setItemId(Number(e.target.value)); setResult(null) }}>
              {items.map((i) => (
                <option key={i.item_id} value={i.item_id}>
                  {i.item_name} — ${i.avg_unit_price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between">
              <label className="label">Price change</label>
              <span className={`text-xs font-bold ${priceChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{priceChange >= 0 ? '+' : ''}{priceChange}%</span>
            </div>
            <input type="range" min={-50} max={50} step={1} value={priceChange} onChange={(e) => setPriceChange(Number(e.target.value))} className="w-full accent-brand-500" />
            <div className="flex justify-between text-[0.62rem] text-ink-300"><span>−50%</span><span>0%</span><span>+50%</span></div>
          </div>

          <div>
            <div className="flex justify-between">
              <label className="label">Discount</label>
              <span className="text-xs font-bold text-brand-600">{discount}%</span>
            </div>
            <input type="range" min={0} max={50} step={5} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full accent-brand-500" />
            <div className="flex justify-between text-[0.62rem] text-ink-300"><span>0%</span><span>50%</span></div>
          </div>

          <div>
            <div className="flex justify-between">
              <label className="label">Prep quantity change</label>
              <span className={`text-xs font-bold ${prepChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{prepChange >= 0 ? '+' : ''}{prepChange}%</span>
            </div>
            <input type="range" min={-50} max={50} step={5} value={prepChange} onChange={(e) => setPrepChange(Number(e.target.value))} className="w-full accent-brand-500" />
            <div className="flex justify-between text-[0.62rem] text-ink-300"><span>−50%</span><span>0%</span><span>+50%</span></div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button disabled={simulating || !itemId} onClick={runSimulation} className="btn btn-primary !px-6 !py-2.5 text-xs disabled:opacity-70">
              <Play size={13} /> {simulating ? 'Simulating…' : 'Simulate'}
            </button>
            <button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={reset}><RotateCcw size={13} /> Reset</button>
          </div>

          {simError && <p className="text-xs font-semibold text-rose-600">{simError}</p>}

          <p className="flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-[0.68rem] leading-relaxed text-violet-700">
            <Info size={14} className="mt-0.5 shrink-0" />
            These are simulated estimates only — not actual results.
          </p>
        </div>

        {/* Outputs */}
        <div className="space-y-5 xl:col-span-3">
          {!result ? (
            <div className="card flex h-full min-h-[280px] flex-col items-center justify-center p-8 text-center">
              <FlaskConical size={28} className="text-ink-300" />
              <p className="mt-3 text-sm font-semibold text-ink-500">
                {selectedItem ? `Select scenario values for ${selectedItem.item_name} and run the simulation.` : 'Choose a menu item to begin.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="card anim-fade-up p-5">
                  <h4 className="font-display mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">Current</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-ink-500">Price</dt><dd className="font-bold text-ink-900">${result.current.price.toFixed(2)}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-500">Revenue</dt><dd className="font-bold text-ink-900">${result.current.revenue.toLocaleString()}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-500">Margin %</dt><dd className="font-bold text-ink-900">{result.current.margin_pct.toFixed(1)}%</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-500">Quantity</dt><dd className="font-bold text-ink-900">{result.current.quantity.toLocaleString()}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-500">Wastage %</dt><dd className="font-bold text-ink-900">{result.current.wastage_pct.toFixed(1)}%</dd></div>
                  </dl>
                </div>

                <div className="card anim-fade-up p-5" style={{ animationDelay: '60ms' }}>
                  <h4 className="font-display mb-3 text-xs font-bold uppercase tracking-wide text-brand-600">Simulated</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-ink-500">Price</dt><dd className="font-bold text-ink-900">${result.simulated.price.toFixed(2)} <span className="text-xs font-normal text-ink-400">(eff. ${result.simulated.effective_price.toFixed(2)})</span></dd></div>
                    <div className="flex justify-between"><dt className="text-ink-500">Revenue</dt><dd className="font-bold text-ink-900">${result.simulated.revenue.toLocaleString()}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-500">Margin %</dt><dd className="font-bold text-ink-900">{result.simulated.margin_pct.toFixed(1)}%</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-500">Quantity</dt><dd className="font-bold text-ink-900">{result.simulated.quantity.toLocaleString()}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-500">Wastage %</dt><dd className="font-bold text-ink-900">{result.simulated.wastage_pct.toFixed(1)}%</dd></div>
                  </dl>
                </div>
              </div>

              <div className="card anim-fade-up p-5">
                <h4 className="font-display mb-3 text-sm font-bold text-ink-900">Impact</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className={`font-display text-xl font-extrabold ${result.impact.revenue_change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {result.impact.revenue_change >= 0 ? '+' : ''}${result.impact.revenue_change.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-ink-400">Revenue change ({result.impact.revenue_change_pct}%)</p>
                  </div>
                  <div>
                    <p className={`font-display text-xl font-extrabold ${result.impact.margin_change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {result.impact.margin_change >= 0 ? '+' : ''}{result.impact.margin_change}pp
                    </p>
                    <p className="mt-1 text-xs text-ink-400">Margin change</p>
                  </div>
                  <div>
                    <p className={`font-display text-xl font-extrabold ${result.impact.quantity_change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {result.impact.quantity_change >= 0 ? '+' : ''}{result.impact.quantity_change.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-ink-400">Quantity change</p>
                  </div>
                </div>
              </div>

              <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-700">
                {result.note}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
