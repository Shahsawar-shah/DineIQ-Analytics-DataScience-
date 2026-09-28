import { Fragment } from 'react'

const ABBR = { 'Profit Driver': 'PD', 'Volume Driver': 'VD', 'Hidden Opportunity': 'HO', 'Low Performer': 'LP' }

/**
 * Heat-map confusion matrix. Rows = actual class, columns = predicted class.
 * Cell shade scales with the share of the row it holds; the diagonal is green,
 * off-diagonal errors are red.
 */
export default function ConfusionMatrix({ matrix, classes, title, subtitle }) {
  const abbr = classes.map((c) => ABBR[c] ?? c.slice(0, 3))
  return (
    <div>
      {title && <h4 className="mb-1 text-sm font-bold text-ink-700">{title}</h4>}
      {subtitle && <p className="mb-3 text-xs text-ink-400">{subtitle}</p>}
      <div className="flex items-start gap-2">
        <div className="pt-8 text-[0.6rem] font-bold uppercase tracking-wider text-ink-400 [writing-mode:vertical-rl] rotate-180">Actual</div>
        <div>
          <p className="mb-1 text-center text-[0.6rem] font-bold uppercase tracking-wider text-ink-400">Predicted</p>
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `48px repeat(${classes.length}, 52px)` }}>
            <div />
            {abbr.map((a, j) => (
              <div key={`h-${j}`} title={classes[j]} className="flex items-center justify-center pb-1 text-xs font-bold text-ink-500">{a}</div>
            ))}
            {matrix.map((row, i) => {
              const rowTotal = row.reduce((s, v) => s + v, 0) || 1
              return (
                <Fragment key={`row-${i}`}>
                  <div title={classes[i]} className="flex items-center justify-center text-xs font-bold text-ink-500">{abbr[i]}</div>
                  {row.map((val, j) => {
                    const share = val / rowTotal
                    const color = i === j ? '13, 148, 89' : '225, 29, 72'
                    return (
                      <div
                        key={`c-${i}-${j}`}
                        title={`Actual ${classes[i]} → predicted ${classes[j]}: ${val}`}
                        className={`flex h-11 items-center justify-center rounded-md text-sm font-bold ${val === 0 ? 'text-ink-300' : share > 0.5 ? 'text-white' : 'text-ink-900'}`}
                        style={{ background: val === 0 ? '#f4f5f9' : `rgba(${color}, ${0.15 + share * 0.75})` }}
                      >
                        {val}
                      </div>
                    )
                  })}
                </Fragment>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
