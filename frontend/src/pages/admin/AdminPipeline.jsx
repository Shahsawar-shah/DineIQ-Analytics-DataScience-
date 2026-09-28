import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, CircleDashed, Loader2, MinusCircle, Play, Square, XCircle, Zap, Cpu } from 'lucide-react'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import ConfusionMatrix from '../../components/charts/ConfusionMatrix'
import { ErrorState } from '../../components/ui/LoadingState'

const POLL_MS = 2000
const ACTIVE = new Set(['queued', 'running'])
const PRESETS = [
  { key: 'core', label: 'Core', note: 'Ingestion, data quality, cleaning, features, Spark + Python models, comparison' },
  { key: 'full', label: 'Full', note: 'Core plus Spark SQL, both K-Means pipelines, forecasting, basket, pricing, promotions' },
]
const PRESET_NAMES = {
  core: 'Core pipeline',
  full: 'Full pipeline',
  spark: 'Spark MLlib pipeline',
  python: 'Python + scikit-learn pipeline',
}
const STATUS = {
  pending: { icon: CircleDashed, className: 'text-ink-300', badge: 'badge-gray', label: 'Pending' },
  running: { icon: Loader2, className: 'animate-spin text-sky-600', badge: 'badge-blue', label: 'Running' },
  success: { icon: CheckCircle2, className: 'text-emerald-600', badge: 'badge-green', label: 'Done' },
  failed: { icon: XCircle, className: 'text-rose-600', badge: 'badge-red', label: 'Failed' },
  skipped: { icon: MinusCircle, className: 'text-ink-300', badge: 'badge-gray', label: 'Skipped' },
  cancelled: { icon: MinusCircle, className: 'text-amber-600', badge: 'badge-amber', label: 'Cancelled' },
}
const RUN_BADGE = { running: 'badge-blue', queued: 'badge-blue', success: 'badge-green', failed: 'badge-red', cancelled: 'badge-amber' }

const fmtSeconds = (s) => {
  if (s === null || s === undefined) return '—'
  if (s < 60) return `${s.toFixed(1)} s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

function ModelCard({ title, icon: Icon, accent, pipeline, buttonLabel, onExecute, running, disabled }) {
  const m = pipeline.models[pipeline.best_model]
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${accent}1a`, color: accent }}><Icon size={18} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
          <p className="font-mono text-[0.68rem] text-ink-400">{pipeline.best_model} · {pipeline.model_version}</p>
        </div>
        <button
          className="btn !px-4 !py-2 text-xs font-bold text-white disabled:opacity-60"
          style={{ background: accent }}
          disabled={disabled}
          onClick={onExecute}
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {running ? 'Running…' : buttonLabel}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <p className="text-ink-500">Accuracy <span className="float-right font-bold text-ink-900">{(m.accuracy * 100).toFixed(2)}%</span></p>
        <p className="text-ink-500">Macro F1 <span className="float-right font-bold text-ink-900">{m.f1_score.toFixed(4)}</span></p>
        <p className="text-ink-500">Precision <span className="float-right font-bold text-ink-900">{m.precision.toFixed(4)}</span></p>
        <p className="text-ink-500">Recall <span className="float-right font-bold text-ink-900">{m.recall.toFixed(4)}</span></p>
        <p className="text-ink-500">Latency <span className="float-right font-bold text-sky-700">{m.prediction_latency_ms.toFixed(2)} ms</span></p>
        <p className="text-ink-500">Per record <span className="float-right font-bold text-sky-700">{m.latency_per_record_ms} ms</span></p>
      </div>
      <p className="mt-3 text-xs text-ink-400">Trained {pipeline.trained_at.replace('T', ' ')} on {pipeline.train_size} items, tested on {pipeline.test_size} unseen items</p>
      <div className="mt-4 overflow-x-auto">
        <ConfusionMatrix matrix={m.confusion_matrix} classes={pipeline.classes} title="Confusion matrix (test set)" />
      </div>
    </div>
  )
}

export default function AdminPipeline() {
  const [preset, setPreset] = useState('core')
  const [run, setRun] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const logRef = useRef(null)
  const lastStatus = useRef(null)

  const loadMetrics = useCallback(() => {
    api.dashboard.mlMetrics().then(setMetrics).catch(() => setMetrics(null))
  }, [])

  const poll = useCallback(() => {
    api.admin.pipelineStatus()
      .then((data) => {
        setError(null)
        setRun(data.status === 'idle' ? null : data)
        // reload the model results when a run finishes successfully
        if (lastStatus.current && ACTIVE.has(lastStatus.current) && data.status === 'success') loadMetrics()
        lastStatus.current = data.status
      })
      .catch((err) => setError(err.message))
  }, [loadMetrics])

  useEffect(() => { poll(); loadMetrics() }, [poll, loadMetrics])

  const active = run && ACTIVE.has(run.status)
  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [active, poll])

  // follow the running step unless the user picked one
  const runningStep = run?.steps.find((s) => s.status === 'running')
  const shownStep = run?.steps.find((s) => s.script === selected) ?? runningStep ?? run?.steps.filter((s) => s.log.length).at(-1)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [shownStep?.log.length, shownStep?.script])

  const start = async (presetToRun = preset) => {
    setBusy(true)
    setSelected(null)
    try {
      const data = await api.admin.runPipeline(presetToRun)
      setRun(data)
      lastStatus.current = data.status
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    try { setRun(await api.admin.cancelPipeline()) } catch (err) { setError(err.message) }
  }

  const done = run?.steps.filter((s) => s.status === 'success').length ?? 0

  return (
    <>
      <PageHeader
        title="Pipeline Runner"
        subtitle="Run the Spark and Python pipelines on the server and follow each script live"
        actions={
          <div className="flex items-center gap-2">
            {PRESETS.map((p) => (
              <button key={p.key} disabled={active} className={`chip ${preset === p.key ? 'chip-active' : ''}`} onClick={() => setPreset(p.key)} title={p.note}>
                {p.label}
              </button>
            ))}
            {active ? (
              <button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={cancel}><Square size={14} /> Cancel</button>
            ) : (
              <button className="btn btn-primary !px-5 !py-2.5 text-xs" disabled={busy} onClick={() => start()}><Play size={14} /> Run Pipeline</button>
            )}
          </div>
        }
      />

      <p className="-mt-2 mb-4 text-xs text-ink-500">{PRESETS.find((p) => p.key === preset).note}.</p>
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {!run ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-semibold text-ink-700">No pipeline run yet</p>
          <p className="mt-1 text-xs text-ink-400">Pick a preset and press Run Pipeline. Each script runs on the server in order; a failed step stops the run.</p>
        </div>
      ) : (
        <>
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink-900">
                  Run <span className="font-mono">{run.run_id}</span> · {PRESET_NAMES[run.preset] ?? run.preset}
                  <span className={`badge ml-2 ${RUN_BADGE[run.status] ?? 'badge-gray'}`}>{run.status}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-400">Started {run.started_at.replace('T', ' ')} by {run.started_by} · elapsed {fmtSeconds(run.duration_seconds)}</p>
              </div>
              <p className="text-sm font-bold text-ink-900">{done} / {run.steps.length} scripts done</p>
            </div>
            <div className="meter mt-3 !h-2.5">
              <span style={{ width: `${run.progress_pct}%`, background: run.status === 'failed' ? '#e11d48' : '#0d9459' }} />
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-5">
            <ChartCard title="Scripts" subtitle="Click a script to see its output" className="xl:col-span-2" actions={null}>
              <div className="space-y-1.5">
                {run.steps.map((s, i) => {
                  const st = STATUS[s.status] ?? STATUS.pending
                  const Icon = st.icon
                  return (
                    <button
                      key={s.script}
                      onClick={() => setSelected(s.script)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:bg-ink-50 ${shownStep?.script === s.script ? 'border-brand-300 bg-brand-50/50' : 'border-ink-100'}`}
                    >
                      <span className="w-5 text-xs font-bold text-ink-400">{i + 1}</span>
                      <Icon size={17} className={st.className} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-xs font-semibold text-ink-900">{s.script}</span>
                        <span className="text-[0.65rem] text-ink-400">{s.engine}{s.exit_code !== null && s.exit_code !== 0 ? ` · exit code ${s.exit_code}` : ''}</span>
                      </span>
                      <span className="text-xs font-semibold text-ink-600">{fmtSeconds(s.duration_seconds)}</span>
                      <span className={`badge ${st.badge}`}>{st.label}</span>
                    </button>
                  )
                })}
              </div>
            </ChartCard>

            <ChartCard
              title={shownStep ? `Output: ${shownStep.script}` : 'Output'}
              subtitle={shownStep ? `${STATUS[shownStep.status]?.label ?? shownStep.status} · last ${shownStep.log.length} lines (full log in reports/pipeline_runs/${run.run_id}.log)` : ''}
              className="xl:col-span-3" actions={null}
            >
              <pre ref={logRef} className="h-[460px] overflow-auto rounded-xl bg-ink-900 p-4 font-mono text-[0.7rem] leading-relaxed text-emerald-100">
                {shownStep?.log.length ? shownStep.log.join('\n') : 'Waiting for output…'}
              </pre>
            </ChartCard>
          </div>
        </>
      )}

      {metrics && (
        <>
          <h2 className="font-display mt-6 text-base font-bold text-ink-900">Latest model results</h2>
          <p className="mb-3 text-xs text-ink-500">Execute Spark / Execute Python + scikit-learn retrain that pipeline's models on the prepared features, then refresh the Spark vs Python comparison. Use Run Pipeline (Core/Full) first after new data.</p>
          <div className="grid gap-5 xl:grid-cols-2">
            <ModelCard title="Spark MLlib model" icon={Zap} accent="#d97706" pipeline={metrics.spark_pipeline}
              buttonLabel="Execute Spark" onExecute={() => start('spark')}
              running={active && run.preset === 'spark'} disabled={busy || active} />
            <ModelCard title="Python + scikit-learn model" icon={Cpu} accent="#1d4ed8" pipeline={metrics.python_pipeline}
              buttonLabel="Execute Python + scikit-learn" onExecute={() => start('python')}
              running={active && run.preset === 'python'} disabled={busy || active} />
          </div>
          <div className="mt-4 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-600">
            Spark and Python agree on <span className="font-bold text-ink-900">{metrics.comparison.agreement_pct}%</span> of {metrics.comparison.total_items} menu items
            ({metrics.comparison.test_agreement_pct}% on the {metrics.comparison.test_items} unseen items)
            and <span className="font-bold text-ink-900">{metrics.customer_comparison.agreement_pct}%</span> of {metrics.customer_comparison.test_records.toLocaleString()} unseen customers.
          </div>
        </>
      )}
    </>
  )
}
