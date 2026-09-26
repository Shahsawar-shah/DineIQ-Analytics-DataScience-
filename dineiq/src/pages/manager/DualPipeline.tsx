import { GitCompareArrows, Timer, Target, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import ChartCard from '@/components/charts/ChartCard'
import { PIPELINE_COMPARISON } from '@/data/mockData'

export default function DualPipeline() {
  const { runs, summary } = PIPELINE_COMPARISON

  const chartData = runs.map((r) => ({
    run: r.run,
    Python: r.pyPred,
    Spark: r.sparkPred,
    'Python (s)': r.pyTime,
    'Spark (s)': r.sparkTime,
  }))

  return (
    <>
      <PageHeader
        title="Dual Pipeline Comparison"
        subtitle="Python pipeline vs Spark / PySpark pipeline — prediction & performance parity"
        demo
        actions={<span className="badge badge-violet"><GitCompareArrows size={11} /> DEMO / MOCK DATA</span>}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="card anim-fade-up p-5">
          <div className="flex items-center justify-between">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Python Accuracy</p>
            <span className="badge badge-blue">Python</span>
          </div>
          <p className="font-display mt-2 text-3xl font-extrabold text-ink-900">{summary.pyAccuracy}%</p>
          <p className="mt-1 text-xs text-ink-400">MAE {summary.pyMae} · {summary.pyTime}s avg run</p>
        </div>
        <div className="card anim-fade-up p-5" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center justify-between">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Spark Accuracy</p>
            <span className="badge badge-orange">PySpark</span>
          </div>
          <p className="font-display mt-2 text-3xl font-extrabold text-ink-900">{summary.sparkAccuracy}%</p>
          <p className="mt-1 text-xs text-ink-400">MAE {summary.sparkMae} · {summary.sparkTime}s avg run</p>
        </div>
        <div className="card anim-fade-up p-5" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Model Version</p>
            <Target size={15} className="text-brand-500" />
          </div>
          <p className="font-display mt-2 text-2xl font-extrabold text-ink-900">{summary.modelVersion}</p>
          <p className="mt-1 text-xs text-ink-400">Same artifact validated on both engines</p>
        </div>
        <div className="card anim-fade-up p-5" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center justify-between">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Speed Advantage</p>
            <Zap size={15} className="text-amber-500" />
          </div>
          <p className="font-display mt-2 text-3xl font-extrabold text-emerald-600">{(summary.pyTime / summary.sparkTime).toFixed(1)}×</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-400"><Timer size={12} /> Spark vs Python wall time</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Prediction Parity" subtitle="Next-week revenue forecast per run ($)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="run" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
                <RTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Python" fill="#1d4ed8" radius={[5, 5, 0, 0]} barSize={16} />
                <Bar dataKey="Spark" fill="#f95d0b" radius={[5, 5, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Processing Time" subtitle="Wall-clock seconds per run">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="run" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Python (s)" fill="#1d4ed8" radius={[5, 5, 0, 0]} barSize={16} />
                <Bar dataKey="Spark (s)" fill="#f9a825" radius={[5, 5, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <h3 className="font-display text-sm font-bold text-ink-900">Run-by-Run Comparison</h3>
          <span className="badge badge-violet">No real processing — mock output</span>
        </div>
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead>
              <tr>
                <th>Run</th><th>Model</th>
                <th className="!text-right">Python Prediction</th><th className="!text-right">Spark Prediction</th>
                <th className="!text-right">Result Δ</th>
                <th className="!text-right">Python Time</th><th className="!text-right">Spark Time</th>
                <th className="!text-right">Python Acc</th><th className="!text-right">Spark Acc</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const diff = r.sparkPred - r.pyPred
                return (
                  <tr key={r.run}>
                    <td className="font-semibold text-ink-900">{r.run}</td>
                    <td>{r.model}</td>
                    <td className="!text-right">${r.pyPred.toLocaleString()}</td>
                    <td className="!text-right">${r.sparkPred.toLocaleString()}</td>
                    <td className={`!text-right font-semibold ${diff === 0 ? 'text-ink-400' : Math.abs(diff) < 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {diff >= 0 ? '+' : ''}{diff.toLocaleString()} ({((diff / r.pyPred) * 100).toFixed(2)}%)
                    </td>
                    <td className="!text-right">{r.pyTime}s</td>
                    <td className="!text-right">{r.sparkTime}s</td>
                    <td className="!text-right">{r.pyAcc}%</td>
                    <td className="!text-right">{r.sparkAcc}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="px-2 pt-3 text-[0.68rem] leading-relaxed text-ink-300">
          The SRS requires validating that both pipelines produce equivalent predictions before promoting a
          model. This page demonstrates the comparison UI with synthetic runs — no Python or Spark execution
          happens in the browser.
        </p>
      </div>
    </>
  )
}
