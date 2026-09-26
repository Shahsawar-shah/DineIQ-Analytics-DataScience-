import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import { InsightCard } from '../../components/ui/InsightCard'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

const PYTHON_MODELS = [
  { model: 'XGBoost', accuracy: '100%', f1: '1.00', status: 'Best' },
  { model: 'Random Forest', accuracy: '93.3%', f1: '0.85', status: 'OK' },
  { model: 'Decision Tree', accuracy: '100%', f1: '1.00', status: 'OK' },
]

const CLASS_TONE = {
  'Profit Driver': 'badge-green',
  'Volume Driver': 'badge-blue',
  'Hidden Opportunity': 'badge-amber',
  'Low Performer': 'badge-red',
}

export default function DualPipeline() {
  const [classifications, setClassifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.menu
      .classifications()
      .then((data) => setClassifications(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const modelColumns = [
    { key: 'model', header: 'Model', render: (r) => r.model },
    { key: 'accuracy', header: 'Accuracy', render: (r) => <span className={r.accuracy === '100%' ? 'font-bold text-emerald-600' : 'text-ink-700'}>{r.accuracy}</span> },
    { key: 'f1', header: 'F1-Score', render: (r) => <span className={r.f1 === '1.00' ? 'font-bold text-emerald-600' : 'text-ink-700'}>{r.f1}</span> },
    { key: 'status', header: 'Status', render: (r) => <span className={`badge ${r.status === 'Best' ? 'badge-green' : 'badge-gray'}`}>{r.status === 'Best' ? '✅ Best' : '✓'}</span> },
  ]

  const classColumns = [
    { key: 'name', header: 'Item Name', render: (r) => r.item_name },
    { key: 'class', header: 'Predicted Class', render: (r) => <span className={`badge ${CLASS_TONE[r.python_class] ?? 'badge-gray'}`}>{r.python_class}</span> },
    { key: 'prob', header: 'Confidence', render: (r) => `${(r.python_probability * 100).toFixed(0)}%` },
    { key: 'actual', header: 'Actual Class', render: (r) => r.actual_class },
    {
      key: 'match',
      header: 'Match',
      render: (r) => (r.actual_class === r.python_class ? <span className="text-emerald-600">✅</span> : <span className="text-rose-600">❌</span>),
    },
  ]

  const agreementPct = classifications.length
    ? Math.round((classifications.filter((r) => r.actual_class === r.python_class).length / classifications.length) * 100)
    : 0

  const resultsData = classifications.slice(0, 10)

  return (
    <>
      <PageHeader title="Dual Pipeline Comparison" subtitle="Python / XGBoost vs Spark MLlib cross-validation" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="card p-5">
          <h3 className="font-display flex items-center gap-2 text-sm font-bold text-ink-900">
            <span className="text-xl">🐍</span> Python Pipeline
          </h3>
          <p className="mt-3 text-lg font-bold text-emerald-600">✅ Complete</p>
          <p className="mt-2 text-xs text-ink-500">XGBoost F1: <span className="font-semibold text-ink-900">1.00</span></p>
          <p className="text-xs text-ink-500">Accuracy: <span className="font-semibold text-ink-900">100%</span></p>
        </div>

        <div className="card p-5">
          <h3 className="font-display flex items-center gap-2 text-sm font-bold text-ink-900">
            <span className="text-xl">⚡</span> Spark Pipeline
          </h3>
          <p className="mt-3 text-lg font-bold text-amber-600">⏳ Pending VPS</p>
          <p className="mt-2 text-xs text-ink-500">Models: <span className="font-semibold text-ink-900">RF, GBT, LogReg</span></p>
          <p className="text-xs text-ink-500">Status: <span className="font-semibold text-ink-900">Running on VPS</span></p>
        </div>

        <div className="card flex flex-col items-center justify-center p-5 text-center">
          <h3 className="font-display text-sm font-bold text-ink-900">Predicted vs Actual Agreement</h3>
          <p className="mt-2 text-4xl font-extrabold text-emerald-600">{agreementPct}%</p>
          <p className="mt-1 text-xs text-ink-400">Across {classifications.length} classified items</p>
        </div>
      </div>

      <ChartCard title="Python Model Comparison" subtitle="Trained on the same feature set" className="mt-5">
        <DataTable columns={modelColumns} rows={PYTHON_MODELS} rowKey={(r) => r.model} />
      </ChartCard>

      <ChartCard title="Classification Results" subtitle="Sample of items scored by the Python pipeline" className="mt-5">
        <DataTable columns={classColumns} rows={resultsData} rowKey={(r) => r.item_id} />
      </ChartCard>

      <div className="mt-5">
        <InsightCard
          tone="info"
          title="Spark MLlib pipeline will be run on VPS"
          text="Results will be imported and compared here once available. Expected agreement: 85%+"
        />
      </div>
    </>
  )
}
