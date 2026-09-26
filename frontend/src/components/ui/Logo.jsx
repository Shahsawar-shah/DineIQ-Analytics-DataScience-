/** DineIQ Analytics icon mark — orange pill, white arch, bar-chart glyph. */
export default function Logo({ size = 40, className = '' }) {
  return (
    <svg viewBox="0 0 200 260" width={size} height={size} className={className} aria-hidden="true">
      <rect x="20" y="20" width="160" height="220" rx="80" ry="80" fill="#f95d0b" />
      <path d="M44,190 L44,104 A56,56 0 0 1 156,104 L156,190 Z" fill="#ffffff" />
      <rect x="54" y="124" width="20" height="54" rx="10" fill="#121220" />
      <rect x="90" y="86" width="20" height="92" rx="10" fill="#121220" />
      <rect x="126" y="110" width="20" height="68" rx="10" fill="#121220" />
    </svg>
  )
}
