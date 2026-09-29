import { Check, Heart, MapPin, ShieldCheck, User as UserIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { useCustomer } from '../../context/CustomerContext'
import { DIETARY_OPTIONS, ORDER_LOCATIONS, fmtMonthYear, loyaltyFor, menuItem } from './shared'

const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/

const sameProfile = (a, b) =>
  a.phone === b.phone && a.preferredLocation === b.preferredLocation &&
  a.dietary.length === b.dietary.length && a.dietary.every((d) => b.dietary.includes(d))

export default function CustomerProfile() {
  const { user } = useAuth()
  const { profile, orders, favorites, saveProfile, notify } = useCustomer()
  const [draft, setDraft] = useState(profile)
  const [phoneError, setPhoneError] = useState(null)

  const dirty = !sameProfile(draft, profile)
  const loyalty = useMemo(() => loyaltyFor(orders), [orders])

  const favoriteCategory = useMemo(() => {
    const counts = {}
    for (const id of favorites) {
      const c = menuItem(id)?.category
      if (c) counts[c] = (counts[c] ?? 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  }, [favorites])

  const firstOrder = orders.length ? orders[orders.length - 1].placedAt : null

  const toggleDiet = (d) =>
    setDraft((p) => ({ ...p, dietary: p.dietary.includes(d) ? p.dietary.filter((x) => x !== d) : [...p.dietary, d] }))

  const submit = (e) => {
    e.preventDefault()
    const phone = draft.phone.trim()
    if (phone && !PHONE_RE.test(phone)) {
      setPhoneError('Enter a valid phone number, e.g. +1 555 000 0000')
      return
    }
    const next = { ...draft, phone }
    saveProfile(next)
    setDraft(next)
    notify('Profile saved')
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account and dining preferences" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card anim-fade-up p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-500 font-display text-2xl font-extrabold text-white">
            {user?.name?.slice(0, 1) ?? 'A'}
          </div>
          <h2 className="font-display mt-4 text-lg font-extrabold text-ink-900">{user?.name}</h2>
          <p className="text-sm text-ink-400">{user?.email}</p>
          <span className="badge badge-orange mt-3">Customer · {loyalty.tier} tier</span>
          <p className="mt-2 text-[0.7rem] text-ink-400">
            {loyalty.points.toLocaleString('en-US')} points{loyalty.next ? ` · ${loyalty.toNext.toLocaleString('en-US')} to ${loyalty.next}` : ''}
          </p>
          <div className="mt-6 space-y-2.5 text-left">
            {[
              { icon: UserIcon, label: 'First order', value: firstOrder ? fmtMonthYear(firstOrder) : 'Not yet' },
              { icon: MapPin, label: 'Home location', value: profile.preferredLocation },
              { icon: Heart, label: 'Favorite category', value: favoriteCategory },
              { icon: ShieldCheck, label: 'Account', value: 'Signed in' },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3 rounded-xl bg-ink-50/70 px-3.5 py-2.5">
                <r.icon size={15} className="shrink-0 text-brand-500" />
                <span className="text-xs text-ink-400">{r.label}:</span>
                <span className="ml-auto truncate text-xs font-bold text-ink-900">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} noValidate className="card anim-fade-up space-y-4 p-6 lg:col-span-2" style={{ animationDelay: '90ms' }}>
          <h3 className="font-display text-sm font-bold text-ink-900">Personal details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="profile-name">Full name</label>
              <input id="profile-name" className="input !bg-ink-50 text-ink-500" value={user?.name ?? ''} readOnly />
            </div>
            <div>
              <label className="label" htmlFor="profile-email">Email</label>
              <input id="profile-email" className="input !bg-ink-50 text-ink-500" value={user?.email ?? ''} readOnly />
            </div>
            <p className="-mt-2 text-[0.7rem] text-ink-400 sm:col-span-2">Name and email belong to your sign-in account and can be changed by an administrator.</p>
            <div>
              <label className="label" htmlFor="profile-phone">Phone</label>
              <input
                id="profile-phone"
                type="tel"
                className={`input ${phoneError ? 'input-error' : ''}`}
                placeholder="+1 555 000 0000"
                value={draft.phone}
                aria-invalid={!!phoneError}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, phone: e.target.value }))
                  setPhoneError(null)
                }}
              />
              {phoneError && <p className="mt-1 text-[0.7rem] font-semibold text-rose-600">{phoneError}</p>}
            </div>
            <div>
              <label className="label" htmlFor="profile-location">Preferred location</label>
              <select
                id="profile-location"
                className="input"
                value={draft.preferredLocation}
                onChange={(e) => setDraft((p) => ({ ...p, preferredLocation: e.target.value }))}
              >
                {ORDER_LOCATIONS.map((l) => (
                  <option key={l.name} value={l.name} disabled={!l.open}>
                    {l.name}{l.open ? '' : ' (temporarily closed)'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[0.7rem] text-ink-400">New baskets start at this location.</p>
            </div>
          </div>
          <h3 className="font-display pt-2 text-sm font-bold text-ink-900">Dietary preferences</h3>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((d) => {
              const on = draft.dietary.includes(d)
              return (
                <button key={d} type="button" aria-pressed={on} className={`chip ${on ? 'chip-active' : ''}`} onClick={() => toggleDiet(d)}>
                  {on && <Check size={12} />}
                  {d}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn btn-primary !px-6 !py-2.5 text-xs" disabled={!dirty}>Save changes</button>
            {dirty && (
              <button type="button" className="text-xs font-semibold text-ink-400 hover:text-ink-700" onClick={() => { setDraft(profile); setPhoneError(null) }}>
                Discard
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
