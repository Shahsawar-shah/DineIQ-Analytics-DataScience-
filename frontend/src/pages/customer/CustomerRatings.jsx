import { Pencil, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader'
import Stars from '../../components/ui/Stars'
import Modal from '../../components/ui/Modal'
import { useCustomer } from '../../context/CustomerContext'
import { MENU_ITEMS } from '../../data/mockData'
import { menuItem } from './shared'

const MAX_COMMENT = 500
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

function ReviewForm({ items, initial, reviews, onSubmit, onCancel }) {
  const [itemId, setItemId] = useState(initial.itemId)
  const [rating, setRating] = useState(initial.rating)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(initial.comment)
  const [errors, setErrors] = useState({})
  const existing = reviews.find((r) => r.itemId === itemId)

  const pickItem = (id) => {
    setItemId(id)
    setErrors((e) => ({ ...e, itemId: null }))
    // Editing an earlier review of that dish starts from what was written
    const prev = reviews.find((r) => r.itemId === id)
    if (prev && !comment.trim() && !rating) {
      setRating(prev.rating)
      setComment(prev.comment)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = {
      itemId: itemId ? null : 'Choose the dish you are reviewing',
      rating: rating ? null : 'Pick a star rating',
    }
    setErrors(errs)
    if (errs.itemId || errs.rating) return
    onSubmit({ itemId, rating, comment })
  }

  const shown = hover || rating
  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div>
        <label className="label" htmlFor="review-item">Dish</label>
        <select id="review-item" className={`input ${errors.itemId ? 'input-error' : ''}`} value={itemId} onChange={(e) => pickItem(e.target.value)}>
          <option value="">Choose a dish…</option>
          {items.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {errors.itemId && <p className="mt-1 text-[0.7rem] font-semibold text-rose-600">{errors.itemId}</p>}
        {existing && existing.id !== initial.id && (
          <p className="mt-1 text-[0.7rem] text-ink-400">You reviewed this dish on {existing.date}. Submitting replaces that review.</p>
        )}
      </div>
      <div>
        <p className="label">Your rating</p>
        <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setRating(s)
                setErrors((e) => ({ ...e, rating: null }))
              }}
              onMouseEnter={() => setHover(s)}
              aria-label={`${s} star${s === 1 ? '' : 's'}`}
              aria-pressed={rating === s}
            >
              <Star size={26} className={s <= shown ? 'fill-amber-400 text-amber-400' : 'text-ink-200'} />
            </button>
          ))}
          {shown > 0 && <span className="ml-2 text-xs font-semibold text-ink-500">{RATING_LABELS[shown]}</span>}
        </div>
        {errors.rating && <p className="mt-1 text-[0.7rem] font-semibold text-rose-600">{errors.rating}</p>}
      </div>
      <div>
        <label className="label" htmlFor="review-comment">Comment <span className="font-normal text-ink-400">(optional)</span></label>
        <textarea
          id="review-comment"
          className="input min-h-24"
          placeholder="What did you think?"
          maxLength={MAX_COMMENT}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className="mt-1 text-right text-[0.65rem] text-ink-300">{comment.length}/{MAX_COMMENT}</p>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary !px-5 !py-2.5 text-xs">{initial.id ? 'Save review' : 'Submit review'}</button>
      </div>
    </form>
  )
}

export default function CustomerRatings() {
  const { reviews, orders, saveReview, deleteReview } = useCustomer()
  const [searchParams, setSearchParams] = useSearchParams()

  // ?item=M01 (from "Rate this order") opens the form for that dish
  const linkedItem = menuItem(searchParams.get('item'))
  const [form, setForm] = useState(() => (linkedItem ? { itemId: linkedItem.id } : null))

  // Dishes the customer has actually received; the full menu if nothing yet
  const reviewable = useMemo(() => {
    const ids = new Set()
    for (const o of orders) if (o.status === 'Completed' || o.status === 'Delivered') o.lines.forEach((l) => ids.add(l.itemId))
    for (const r of reviews) ids.add(r.itemId)
    const list = [...ids].map(menuItem).filter(Boolean)
    return (list.length ? list : MENU_ITEMS).slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [orders, reviews])

  const sorted = useMemo(() => [...reviews].sort((a, b) => b.date.localeCompare(a.date)), [reviews])
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }))

  const openForm = (initial = {}) => setForm(initial)
  const closeForm = () => {
    setForm(null)
    if (searchParams.has('item')) setSearchParams({}, { replace: true })
  }

  const initial = form
    ? (() => {
        const prev = reviews.find((r) => r.id === form.id) ?? (form.itemId ? reviews.find((r) => r.itemId === form.itemId) : null)
        return { id: prev?.id ?? null, itemId: form.itemId ?? prev?.itemId ?? '', rating: prev?.rating ?? 0, comment: prev?.comment ?? '' }
      })()
    : null

  return (
    <>
      <PageHeader
        title="Ratings & Reviews"
        subtitle="Your reviews help other guests and the kitchen team"
        actions={
          <button className="btn btn-primary !px-5 !py-2.5 text-xs" onClick={() => openForm()}>
            <Star size={14} /> Write a review
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card anim-fade-up flex flex-col items-center justify-center p-8 text-center lg:col-span-1">
          <p className="font-display text-5xl font-extrabold text-ink-900">{reviews.length ? avg.toFixed(1) : '–'}</p>
          {reviews.length > 0 && <div className="mt-2"><Stars value={avg} size={18} /></div>}
          <p className="mt-2 text-xs text-ink-400">
            Your average rating across {reviews.length} review{reviews.length === 1 ? '' : 's'}
          </p>
          <div className="mt-5 w-full space-y-1.5">
            {dist.map(({ s, n }) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-ink-400">{s}</span>
                <Star size={11} className="fill-amber-400 text-amber-400" />
                <div className="meter flex-1">
                  <span style={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%`, background: '#f59e0b' }} />
                </div>
                <span className="w-8 text-right text-ink-400">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {sorted.length === 0 && (
            <div className="card flex flex-col items-center p-10 text-center">
              <Star size={26} className="text-ink-300" />
              <p className="mt-3 text-sm font-bold text-ink-900">No reviews yet</p>
              <p className="mt-1 text-xs text-ink-400">Tell the kitchen what you thought of your last meal.</p>
            </div>
          )}
          {sorted.map((r, i) => (
            <div key={r.id} className="card card-hover anim-fade-up p-5" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display truncate text-sm font-bold text-ink-900">{menuItem(r.itemId)?.name}</p>
                  <div className="mt-1"><Stars value={r.rating} /></div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="badge badge-gray">{r.date}</span>
                  <button className="topbar-icon-btn !h-7 !w-7 !rounded-lg" onClick={() => openForm({ id: r.id, itemId: r.itemId })} aria-label="Edit review" title="Edit">
                    <Pencil size={12} />
                  </button>
                  <button className="topbar-icon-btn !h-7 !w-7 !rounded-lg hover:!text-rose-600" onClick={() => deleteReview(r.id)} aria-label="Delete review" title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {r.comment ? (
                <p className="mt-3 text-sm leading-relaxed text-ink-600">&ldquo;{r.comment}&rdquo;</p>
              ) : (
                <p className="mt-3 text-xs italic text-ink-300">No comment</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!form} onClose={closeForm} title={initial?.id ? 'Edit your review' : 'Write a review'}>
        {initial && (
          <ReviewForm
            key={`${initial.id}-${initial.itemId}`}
            items={reviewable}
            initial={initial}
            reviews={reviews}
            onCancel={closeForm}
            onSubmit={(data) => {
              if (saveReview(data)) closeForm()
            }}
          />
        )}
      </Modal>
    </>
  )
}
