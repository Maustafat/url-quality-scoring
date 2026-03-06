// ─── Page Intelligence Panel ──────────────────────────────────────────────────
// Shows: pixel-based ad surface coverage, ads.txt status, MFA likelihood
import { MiniDonut } from './Charts.jsx'

const VIEWPORT_PIXELS = 1440 * 900

// ── MFA colour / label helpers ────────────────────────────────────────────────
const MFA_META = {
  'UNLIKELY':   { color: '#4ade80', bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.25)' },
  'POSSIBLE':   { color: '#facc15', bg: 'rgba(250,204,21,0.08)',   border: 'rgba(250,204,21,0.25)' },
  'LIKELY':     { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.25)' },
  'VERY LIKELY':{ color: '#f87171', bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.25)' },
}

function mfaMeta(label) {
  return MFA_META[label] ?? MFA_META['UNLIKELY']
}

// ── Pixel coverage helpers ────────────────────────────────────────────────────
function coverageColor(pct) {
  if (pct <= 5)  return '#4ade80'
  if (pct <= 15) return '#a3e635'
  if (pct <= 25) return '#facc15'
  if (pct <= 40) return '#fb923c'
  return '#f87171'
}
function coverageLabel(pct) {
  if (pct <= 5)  return 'MINIMAL'
  if (pct <= 15) return 'LOW'
  if (pct <= 25) return 'MODERATE'
  if (pct <= 40) return 'HIGH'
  return 'EXCESSIVE'
}

// ── ads.txt badge ─────────────────────────────────────────────────────────────
function AdsTxtBadge({ result }) {
  if (!result) return null

  let color, icon, label, sublabel
  if (result.corsBlocked) {
    color = '#64748b'; icon = '?'; label = 'UNKNOWN'
    sublabel = 'CORS blocked — could not fetch'
  } else if (result.present === true) {
    color = '#4ade80'; icon = '✓'; label = 'PRESENT'
    sublabel = `${result.entries} authorised seller${result.entries !== 1 ? 's' : ''}`
  } else {
    color = '#f87171'; icon = '✗'; label = 'MISSING'
    sublabel = `HTTP ${result.status ?? 'N/A'} — no ads.txt found`
  }

  return (
    <div style={{
      background: '#06101e', borderRadius: 10, padding: 20, border: '1px solid #1e3050',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em' }}>ADS.TXT</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10, flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color,
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Syne',sans-serif", color, lineHeight: 1 }}>{label}</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>{sublabel}</div>
        </div>
      </div>

      {result.present === true && result.lines?.length > 0 && (
        <div style={{ background: '#020617', borderRadius: 6, padding: '10px 12px', maxHeight: 90, overflow: 'auto' }}>
          {result.lines.slice(0, 5).map((l, i) => (
            <div key={i} style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', lineHeight: 1.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l}</div>
          ))}
          {result.lines.length > 5 && <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>+{result.lines.length - 5} more…</div>}
        </div>
      )}

      {result.present === false && (
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6, paddingTop: 4, borderTop: '1px solid #1e293b' }}>
          Missing ads.txt is a weak MFA signal — legitimate publishers typically publish one to declare authorised sellers.
        </div>
      )}
    </div>
  )
}

// ── Pixel coverage card ───────────────────────────────────────────────────────
function PixelCoverageCard({ pageResult, loading }) {
  const pct   = pageResult?.adPixelCoverage ?? null
  const slots = pageResult?.adSlots ?? []
  const color = pct !== null ? coverageColor(pct) : '#475569'
  const label = pct !== null ? coverageLabel(pct) : '—'
  const totalAdPx = pageResult?.totalAdPixels ?? null

  return (
    <div style={{ background: '#06101e', borderRadius: 10, padding: 20, border: '1px solid #1e3050' }}>
      <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 14 }}>AD PIXEL COVERAGE</div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#475569', fontSize: 12 }}>
          <span className="scan-line">Fetching page + measuring ad surface…</span>
        </div>
      )}

      {!loading && pct === null && (
        <div style={{ fontSize: 12, color: '#475569' }}>Could not measure (fetch failed or page inaccessible)</div>
      )}

      {pct !== null && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <MiniDonut value={pct} maxIsGood={false} size={82} stroke={8} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Syne',sans-serif", color }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne',sans-serif", color, lineHeight: 1 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
                {totalAdPx !== null ? `~${totalAdPx.toLocaleString()} ad px` : ''} / {VIEWPORT_PIXELS.toLocaleString()} viewport px
              </div>
            </div>
          </div>

          {/* Coverage bar */}
          <div style={{ height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
            {/* threshold markers */}
            {[5, 15, 25, 40].map(t => (
              <div key={t} style={{ position: 'absolute', left: `${t}%`, top: 0, bottom: 0, width: 1, background: '#1e293b', zIndex: 1 }} />
            ))}
            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            {['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'EXCESSIVE'].map(l => (
              <span key={l} style={{ fontSize: 9, color: l === label ? color : '#334155', fontWeight: l === label ? 700 : 400 }}>{l}</span>
            ))}
          </div>

          {/* Slot breakdown */}
          {slots.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: '#334155', letterSpacing: '0.1em', marginBottom: 8 }}>DETECTED SLOTS ({slots.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 160, overflow: 'auto' }}>
                {slots.map((slot, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#020617', borderRadius: 5, padding: '5px 10px' }}>
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 3, fontWeight: 600, letterSpacing: '0.06em',
                      background: slot.position === 'above-fold' ? 'rgba(251,146,60,0.15)' : 'rgba(148,163,184,0.1)',
                      color: slot.position === 'above-fold' ? '#fb923c' : '#64748b',
                    }}>{slot.position === 'above-fold' ? 'ATF' : 'BTF'}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                      {slot.width}×{slot.height}
                    </span>
                    <span style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>{slot.network !== 'unknown' ? slot.network : slot.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pageResult?.confidence && (
            <div style={{ marginTop: 10, fontSize: 10, color: '#334155' }}>
              Confidence: <span style={{ color: pageResult.confidence === 'high' ? '#4ade80' : pageResult.confidence === 'medium' ? '#facc15' : '#fb923c' }}>
                {pageResult.confidence.toUpperCase()}
              </span>
              {pageResult.pageNotes && <span style={{ color: '#334155' }}> · {pageResult.pageNotes}</span>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── MFA card ──────────────────────────────────────────────────────────────────
function MFACard({ mfaData, loading }) {
  if (!mfaData) {
    return (
      <div style={{ background: '#06101e', borderRadius: 10, padding: 20, border: '1px solid #1e3050' }}>
        <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 10 }}>MFA LIKELIHOOD</div>
        {loading
          ? <div style={{ fontSize: 12, color: '#475569' }} className="scan-line">Calculating…</div>
          : <div style={{ fontSize: 12, color: '#475569' }}>Awaiting page analysis…</div>}
      </div>
    )
  }

  const { mfaLikelihood, mfaLabel, mfaSignals, confidence } = mfaData
  const meta = mfaMeta(mfaLabel)

  return (
    <div style={{ background: '#06101e', borderRadius: 10, padding: 20, border: `1px solid ${meta.border}`, background: meta.bg }}>
      <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 14 }}>MFA LIKELIHOOD</div>

      {/* Score row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={82} height={82} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={41} cy={41} r={35} fill="none" stroke="#1e293b" strokeWidth={8} />
            <circle cx={41} cy={41} r={35} fill="none" stroke={meta.color}
              strokeWidth={8} strokeDasharray={`${(mfaLikelihood / 100) * 2 * Math.PI * 35} ${2 * Math.PI * 35}`}
              strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: meta.color }}>{mfaLikelihood}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: meta.color, lineHeight: 1 }}>{mfaLabel}</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Made For Advertising</div>
          {confidence && (
            <div style={{ fontSize: 10, color: '#334155', marginTop: 4 }}>
              Confidence: <span style={{ color: confidence === 'high' ? '#4ade80' : confidence === 'medium' ? '#facc15' : '#fb923c' }}>{confidence.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* MFA signals list */}
      {mfaSignals?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {mfaSignals.map((sig, i) => {
            const isRed   = sig.found && sig.weight === 'high'
            const isOrange = sig.found && sig.weight === 'medium'
            const dotColor = !sig.found ? '#334155' : isRed ? '#f87171' : isOrange ? '#fb923c' : '#facc15'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
                <div>
                  <span style={{ fontSize: 11, color: sig.found ? '#cbd5e1' : '#475569', fontWeight: sig.found ? 500 : 400 }}>
                    {sig.signal}
                  </span>
                  {sig.note && <span style={{ fontSize: 10, color: '#475569' }}> — {sig.note}</span>}
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#334155', letterSpacing: '0.06em', flexShrink: 0 }}>
                  {sig.weight?.toUpperCase()}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Explanation blurb */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #1e2d40', fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
        MFA sites are built primarily to show ads rather than serve readers. High ad pixel coverage, missing ads.txt, low-quality ad networks, and thin content are the strongest signals.
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PageIntelPanel({ adsTxtResult, pageResult, mfaData, pageLoading, adsTxtLoading }) {
  return (
    <div style={{ background: '#080e1a', border: '1px solid #1a2942', borderRadius: 12, padding: 28, marginBottom: 20 }}>

      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }} />
        <span style={{ fontSize: 11, color: '#a78bfa', letterSpacing: '0.14em', fontWeight: 600 }}>PAGE INTELLIGENCE</span>
        {(pageLoading || adsTxtLoading) && (
          <span style={{ fontSize: 11, color: '#7c3aed', marginLeft: 'auto' }} className="scan-line">FETCHING PAGE…</span>
        )}
        {!pageLoading && !adsTxtLoading && pageResult && (
          <span style={{ fontSize: 11, color: '#4ade80', marginLeft: 'auto' }}>✓ LIVE DATA</span>
        )}
      </div>

      {/* Three-column grid: Pixel Coverage | ads.txt | MFA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14 }}>
        <PixelCoverageCard pageResult={pageResult} loading={pageLoading} />
        <AdsTxtBadge result={adsTxtResult} />
        <MFACard mfaData={mfaData} loading={pageLoading} />
      </div>
    </div>
  )
}
