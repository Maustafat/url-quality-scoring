// ─── Ad Intelligence Panel ────────────────────────────────────────────────────
import { MiniDonut, DensityBar, QualityBar } from './Charts.jsx'
import { densityMeta, QUALITY_COLORS, qualityLabelFromScore } from '../lib/scoreHelpers.js'

export default function AdIntelPanel({ staticResult, aiResult, loading }) {
  const adS  = staticResult.scores.adDensity
  const adQ  = staticResult.scores.adQuality
  const aiAd = aiResult?.adAnalysis

  const densityRaw   = aiAd?.densityRaw   ?? adS.rawDensity
  const qualityScore = aiAd?.qualityScore ?? adQ.score
  const densityLbl   = aiAd?.densityLabel ?? densityMeta(densityRaw).text
  const qualityLbl   = aiAd?.qualityLabel ?? qualityLabelFromScore(qualityScore)
  const dMeta  = densityMeta(densityRaw)
  const qColor = QUALITY_COLORS[qualityLbl] ?? '#64748b'

  return (
    <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 12, padding: 28, marginBottom: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 6px #60a5fa' }} />
        <span style={{ fontSize: 11, color: '#60a5fa', letterSpacing: '0.14em', fontWeight: 600 }}>AD INTELLIGENCE</span>
        {loading && <span style={{ fontSize: 11, color: '#3b82f6', marginLeft: 'auto' }} className="scan-line">AI ANALYZING...</span>}
        {!loading && aiAd && <span style={{ fontSize: 11, color: '#4ade80', marginLeft: 'auto' }}>✓ AI ENHANCED</span>}
      </div>

      {/* Two metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: aiAd?.adSignals?.length > 0 ? 20 : 0 }}>

        {/* AD DENSITY */}
        <div style={{ background: '#06101e', borderRadius: 10, padding: 22, border: '1px solid #1e3050' }}>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 16 }}>AD DENSITY</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <MiniDonut value={densityRaw} maxIsGood={false} size={82} stroke={8} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: dMeta.color }}>{densityRaw}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: dMeta.color, lineHeight: 1 }}>{densityLbl}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>{densityRaw}% saturation</div>
            </div>
          </div>
          <DensityBar rawDensity={densityRaw} />
          <div style={{ fontSize: 11, color: '#475569', marginTop: 12, lineHeight: 1.6 }}>{adS.detail}</div>
          {aiAd?.estimatedAdSlots && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#0f172a', borderRadius: 6, fontSize: 11, color: '#94a3b8' }}>
              Est. slots: <span style={{ color: dMeta.color }}>{aiAd.estimatedAdSlots}</span>
            </div>
          )}
        </div>

        {/* AD QUALITY */}
        <div style={{ background: '#06101e', borderRadius: 10, padding: 22, border: '1px solid #1e3050' }}>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 16 }}>AD QUALITY</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <MiniDonut value={qualityScore} maxIsGood={true} size={82} stroke={8} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: qColor }}>{qualityScore}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: qColor, lineHeight: 1 }}>{qualityLbl}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>score {qualityScore}/100</div>
            </div>
          </div>
          <QualityBar score={qualityScore} color={qColor} />
          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{adQ.detail}</div>
          {aiAd?.adNetworks?.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {aiAd.adNetworks.map(n => (
                <span key={n} style={{ padding: '2px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, fontSize: 10, color: '#64748b' }}>{n}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI ad signals */}
      {aiAd?.adSignals?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 12 }}>AD-SPECIFIC SIGNALS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 8 }}>
            {aiAd.adSignals.map((sig, i) => {
              const c  = sig.impact === 'positive' ? '#4ade80' : sig.impact === 'negative' ? '#f87171' : '#94a3b8'
              const bg = sig.impact === 'positive' ? 'rgba(74,222,128,0.06)' : sig.impact === 'negative' ? 'rgba(248,113,113,0.06)' : 'rgba(148,163,184,0.05)'
              return (
                <div key={i} style={{ background: bg, border: `1px solid ${c}22`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: c, fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                    {sig.impact === 'positive' ? '↑' : sig.impact === 'negative' ? '↓' : '→'}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>{sig.signal}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{sig.note}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
