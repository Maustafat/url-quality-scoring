// ─── Chart Primitives ─────────────────────────────────────────────────────────
import { scoreColor, densityMeta } from '../lib/scoreHelpers.js'

/** Full circular gauge (used for overall score) */
export function CircleGauge({ score, size = 140, stroke = 10 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)}
        strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

/**
 * Small donut gauge.
 * maxIsGood=true  → high value = green (quality)
 * maxIsGood=false → low value = green (density: value is raw 0-100 saturation)
 */
export function MiniDonut({ value, maxIsGood = true, size = 82, stroke = 8 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const displayVal = maxIsGood ? value : 100 - value
  const color = maxIsGood ? scoreColor(value) : densityMeta(value).color
  const dash = (displayVal / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

/** Thin animated progress bar */
export function Bar({ score, delay = 0 }) {
  return (
    <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${score}%`, background: scoreColor(score),
        borderRadius: 3, transition: `width 0.9s ${delay}ms cubic-bezier(.4,0,.2,1)`,
      }} />
    </div>
  )
}

/** Segmented density bar: CLEAN → LIGHT → MODERATE → HEAVY → SATURATED */
export function DensityBar({ rawDensity }) {
  const segs = [
    { t: 10, c: '#4ade80' },
    { t: 30, c: '#a3e635' },
    { t: 55, c: '#facc15' },
    { t: 75, c: '#fb923c' },
    { t: 100, c: '#f87171' },
  ]
  const labels = ['CLEAN', 'LIGHT', 'MODERATE', 'HEAVY', 'SATURATED']
  return (
    <div>
      <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
        {segs.map((seg, i) => {
          const prev = i === 0 ? 0 : segs[i - 1].t
          const w    = seg.t - prev
          const filled = rawDensity >= seg.t ? 100 : rawDensity > prev ? ((rawDensity - prev) / w) * 100 : 0
          return (
            <div key={i} style={{ flex: w, background: '#1e293b', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${filled}%`, background: seg.c, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {labels.map(l => <span key={l} style={{ fontSize: 9, color: '#334155' }}>{l}</span>)}
      </div>
    </div>
  )
}

/** Gradient quality spectrum bar with sliding dot */
export function QualityBar({ score, color }) {
  return (
    <>
      <div style={{
        height: 8, background: 'linear-gradient(to right,#f87171,#fb923c,#facc15,#a3e635,#4ade80)',
        borderRadius: 4, position: 'relative', marginBottom: 6,
      }}>
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
          left: `${score}%`, width: 14, height: 14, borderRadius: '50%',
          background: '#fff', border: `2px solid ${color}`, boxShadow: `0 0 6px ${color}`,
          transition: 'left 1s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        {['HARMFUL', 'LOW', 'MIXED', 'STANDARD', 'PREMIUM'].map(l => (
          <span key={l} style={{ fontSize: 9, color: '#334155' }}>{l}</span>
        ))}
      </div>
    </>
  )
}
