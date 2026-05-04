export default function CourtGraphic({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="courtGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#16a34a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#15803d" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#4ade80" stopOpacity="0" />
          <stop offset="50%"  stopColor="#4ade80" stopOpacity="1" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Court fill */}
      <rect x="20" y="20" width="280" height="480" rx="4" fill="url(#courtGrad)" />

      {/* Outer boundary */}
      <rect x="20" y="20" width="280" height="480" rx="4"
        stroke="#4ade80" strokeWidth="2" strokeOpacity=".5" fill="none" filter="url(#glow)" />

      {/* Singles sidelines */}
      <line x1="52" y1="20" x2="52" y2="500" stroke="#4ade80" strokeWidth="1" strokeOpacity=".3" />
      <line x1="268" y1="20" x2="268" y2="500" stroke="#4ade80" strokeWidth="1" strokeOpacity=".3" />

      {/* Net line (center) */}
      <line x1="20" y1="260" x2="300" y2="260"
        stroke="url(#lineGrad)" strokeWidth="2.5" filter="url(#glow)" />

      {/* Short service lines */}
      <line x1="20" y1="194" x2="300" y2="194" stroke="#4ade80" strokeWidth="1" strokeOpacity=".35" />
      <line x1="20" y1="326" x2="300" y2="326" stroke="#4ade80" strokeWidth="1" strokeOpacity=".35" />

      {/* Long service lines (doubles) */}
      <line x1="20" y1="88"  x2="300" y2="88"  stroke="#4ade80" strokeWidth="1" strokeOpacity=".25" />
      <line x1="20" y1="432" x2="300" y2="432" stroke="#4ade80" strokeWidth="1" strokeOpacity=".25" />

      {/* Center lines */}
      <line x1="160" y1="194" x2="160" y2="326" stroke="#4ade80" strokeWidth="1" strokeOpacity=".35" />

      {/* Net posts */}
      <circle cx="20"  cy="260" r="4" fill="#4ade80" fillOpacity=".7" filter="url(#glow)" />
      <circle cx="300" cy="260" r="4" fill="#4ade80" fillOpacity=".7" filter="url(#glow)" />

      {/* Corner marks */}
      {[[20,20],[300,20],[20,500],[300,500]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="3.5" fill="#4ade80" fillOpacity=".5" />
      ))}

      {/* Center dot */}
      <circle cx="160" cy="260" r="3" fill="#4ade80" fillOpacity=".8" filter="url(#glow)" />

      {/* Shuttlecock icon at top */}
      <g transform="translate(145,50)" opacity=".75" filter="url(#glow)">
        <circle cx="15" cy="22" r="5" fill="#4ade80" fillOpacity=".9" />
        <line x1="15" y1="17" x2="6"  y2="3"  stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="17" x2="10" y2="2"  stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="17" x2="15" y2="1"  stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="17" x2="20" y2="2"  stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="17" x2="24" y2="3"  stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 3 Q15 -1 24 3" stroke="#4ade80" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}
