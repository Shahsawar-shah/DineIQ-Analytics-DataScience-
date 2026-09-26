import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'

const SECTIONS = [
  {
    title: 'Platform preferences',
    fields: [
      { label: 'Platform name', type: 'text', value: 'DineIQ Analytics' },
      { label: 'Support email', type: 'email', value: 'support@dineiq.io' },
      { label: 'Default currency', type: 'select', options: ['USD ($)', 'EUR (€)', 'GBP (£)', 'AUD (A$)'] },
      { label: 'Fiscal week starts', type: 'select', options: ['Monday', 'Sunday'] },
    ],
  },
  {
    title: 'Analytics engine (mock)',
    fields: [
      { label: 'Primary pipeline', type: 'select', options: ['Python', 'Spark / PySpark', 'Dual (compare)'] },
      { label: 'Forecast horizon (days)', type: 'number', value: 14 },
      { label: 'Anomaly sensitivity', type: 'select', options: ['Low', 'Medium', 'High'] },
      { label: 'Model retraining', type: 'select', options: ['Daily', 'Weekly', 'Monthly'] },
    ],
  },
]

export default function AdminSettings() {
  const [saved, setSaved] = useState(false)
  return (
    <>
      <PageHeader title="Settings" subtitle="Platform-wide configuration" demo />
      <div className="grid gap-5 lg:grid-cols-2">
        {SECTIONS.map((s, si) => (
          <div key={s.title} className="card anim-fade-up p-5" style={{ animationDelay: `${si * 90}ms` }}>
            <h3 className="font-display mb-4 text-sm font-bold text-ink-900">{s.title}</h3>
            <div className="space-y-4">
              {s.fields.map((f) => (
                <div key={f.label}>
                  <label className="label">{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="input">
                      {f.options!.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="input" type={f.type} defaultValue={f.value as string | undefined} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button className="btn btn-primary !px-6 !py-2.5 text-xs" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}>
          Save settings
        </button>
        <button className="btn btn-ghost !px-6 !py-2.5 text-xs">Discard</button>
        {saved && <span className="anim-pop text-xs font-bold text-emerald-600">Settings saved (demo)</span>}
      </div>
    </>
  )
}
