import { Star } from 'lucide-react'
import { useState } from 'react'
import PageHeader from '../../components/layout/PageHeader'
import Stars from '../../components/ui/Stars'
import Modal from '../../components/ui/Modal'
import { MY_REVIEWS } from '../../data/mockData'

export default function CustomerRatings() {
  const [modal, setModal] = useState(false)
  const [rating, setRating] = useState(0)
  return (
    <>
      <PageHeader
        title="Ratings & Reviews"
        subtitle="Your feedback powers the intelligence for everyone"
        demo
        actions={
          <button className="btn btn-primary !px-5 !py-2.5 text-xs" onClick={() => setModal(true)}>
            <Star size={14} /> Write a review
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card anim-fade-up flex flex-col items-center justify-center p-8 text-center lg:col-span-1">
          <p className="font-display text-5xl font-extrabold text-ink-900">4.7</p>
          <div className="mt-2"><Stars value={4.7} size={18} /></div>
          <p className="mt-2 text-xs text-ink-400">Your average rating given</p>
          <div className="mt-5 w-full space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-ink-400">{s}</span>
                <Star size={11} className="fill-amber-400 text-amber-400" />
                <div className="meter flex-1">
                  <span style={{ width: `${s === 5 ? 66 : s === 4 ? 34 : 0}%`, background: 'linear-gradient(90deg,#fbbf24,#f59e0b)' }} />
                </div>
                <span className="w-8 text-right text-ink-400">{s === 5 ? '2' : s === 4 ? '1' : '0'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {MY_REVIEWS.map((r, i) => (
            <div key={r.id} className="card card-hover anim-fade-up p-5" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-bold text-ink-900">{r.item}</p>
                  <div className="mt-1"><Stars value={r.rating} /></div>
                </div>
                <span className="badge badge-gray">{r.date}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">"{r.comment}"</p>
            </div>
          ))}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Write a review">
        <div className="space-y-4">
          <div>
            <label className="label">Item</label>
            <select className="input">
              <option>Truffle Mushroom Risotto</option>
              <option>Grilled Salmon Bowl</option>
              <option>Classic Cheeseburger</option>
            </select>
          </div>
          <div>
            <label className="label">Your rating</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} stars`}>
                  <Star size={26} className={s <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-200'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Comment</label>
            <textarea className="input min-h-24" placeholder="What did you think?" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary !px-5 !py-2.5 text-xs" onClick={() => setModal(false)}>Submit review (demo)</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
