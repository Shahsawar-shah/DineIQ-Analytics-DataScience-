import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'

const TINTS = {
  'Main Course': ['#ffefe4', '#e04a05'],
  Starters: ['#fef4e0', '#b54708'],
  Desserts: ['#fdecef', '#d92d20'],
  Beverages: ['#e9f1fe', '#1d4ed8'],
  Sides: ['#e7f8ef', '#0d9459'],
}

/** Dish photo, or a category-tinted placeholder when the dish has no photo or it fails to load. */
export default function DishImage({ item, className = '', iconSize = 28 }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (item.image && item.image !== failedSrc) {
    return (
      <img
        src={item.image}
        alt={item.name}
        loading="lazy"
        onError={() => setFailedSrc(item.image)}
        className={`object-cover ${className}`}
      />
    )
  }
  const [bg, fg] = TINTS[item.category] ?? ['#f1f2f7', '#5d6172']
  return (
    <div role="img" aria-label={item.name} className={`grid place-items-center ${className}`} style={{ background: bg, color: fg }}>
      <UtensilsCrossed size={iconSize} />
    </div>
  )
}
