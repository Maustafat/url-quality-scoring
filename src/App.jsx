// ─── URL Quality Engine — App Shell ──────────────────────────────────────────
import { useState, useRef } from 'react'
import { runStaticAnalysis } from './lib/urlAnalysis.js'
import { runAIAnalysis }     from './lib/aiAnalysis.js'
import { checkAdsTxt, analyzePageAds, deriveMFAScore } from './lib/pageAnalysis.js'
import { scoreColor, scoreLabel } from './lib/scoreHelpers.js'
import { CircleGauge, Bar }  from './components/Charts.jsx'
import AdIntelPanel          from './components/AdIntelPanel.jsx'
import PageIntelPanel        from './components/PageIntelPanel.jsx'

// Quick-access example URLs shown on the landing screen
const EXAMPLES = [
  'https://developer.mozilla.org/en-US/docs/Web/API',
  'http://free-stuff.tk/click?fbclid=abc&utm_source=fb&utm_campaign=win',
  'https://github.com/anthropics/anthropic-sdk-python',
  'https://buzzfeed.com/article?utm_source=fb&utm_medium=social&ref=banner',
  'https://medium.com/@author/my-article-2024',
  'https://ads.doubleclick.net/ddm/trackclk/N1234.567/B8901;dc_trk_aid=123',
]

// Score cards shown below the Ad Intelligence panel (ad scores are in that panel)
const URL_SIGNAL_KEYS = ['security', 'domain', 'structure', 'cleanliness', 'path']

export default function App() {
  const [input, setInput]         = useState('')
  const [phase, setPhase]         = useState('idle') // idle | static | ai | page | done | error
  const [staticResult, setStatic] = useState(null)
  const [aiResult, setAI]         = useState(null)
  const [adsTxtResult, setAdsTxt] = useState(null)
  const [pageResult, setPage]     = useState(null)
  const [mfaData, setMFA]         = useState(null)
  const [error, setError]         = useState('')
  const inputRef = useRef()

  async function handleAnalyze() {
    if (!input.trim()) return
    setError('')
    setStatic(null); setAI(null); setAdsTxt(null); setPage(null); setMFA(null)
    setPhase('static')

    const res = runStaticAnalysis(input.trim())
    if (!res) { setError('Invalid URL — please check the format.'); setPhase('error'); return }
    setStatic(res)

    // ── Phase 2: AI analysis (URL-level, fast)
    setPhase('ai')
    let ai = null
    try { ai = await runAIAnalysis(res.url, res); setAI(ai) }
    catch (e) { console.warn('AI analysis failed:', e.message) }

    // ── Phase 3: Page-level (parallel: ads.txt fetch + pixel analysis)
    setPhase('page')
    const [adsTxt] = await Promise.all([
      checkAdsTxt(res.parsed).then(r => { setAdsTxt(r); return r }),
    ])

    // Pixel analysis takes longer — run and update when ready
    analyzePageAds(res.url, adsTxt, res, ai)
      .then(pageRes => {
        setPage(pageRes)
        setMFA({
          mfaLikelihood: pageRes.mfaLikelihood,
          mfaLabel:      pageRes.mfaLabel,
          mfaSignals:    pageRes.mfaSignals ?? [],
          confidence:    pageRes.confidence ?? 'medium',
        })
      })
      .catch(e => {
        console.warn('Page analysis failed:', e.message)
        // Fall back to heuristic MFA score
        setMFA(deriveMFAScore(res, ai, adsTxt))
      })

    setPhase('done')
  }

  const handleKey = e => { if (e.key === 'Enter') handleAnalyze() }

  const totalScore = staticResult && aiResult
    ? Math.round(staticResult.overall * 0.5 + aiResult.overallAIScore * 0.5)
    : staticResult?.overall

  const analyzing = phase === 'static' || phase === 'ai' || phase === 'page'
  const pageLoading = phase === 'page' || (phase === 'done' && !pageResult && staticResult)

  return (
    <div style={{ minHeight: '100vh', background: '#020617', fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace", color: '#cbd5e1' }}>
      <style>{globalStyles}</style>

      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '24px 40px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} className="pulse" />
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: '#f1f5f9', letterSpacing: '0.05em' }}>
          URL QUALITY ENGINE
        </span>
        <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>v3.0 · URL SIGNALS + AD INTELLIGENCE</span>
      </div>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 24px' }}>

        {/* ── Search bar ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 10 }}>TARGET URL</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '0 20px' }}>
              <span style={{ color: '#475569', fontSize: 14 }}>⌕</span>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="https://example.com/path?query=value"
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 14, padding: '16px 0', letterSpacing: '0.03em' }}
              />
              {input && (
                <button onClick={() => { setInput(''); setStatic(null); setAI(null); setAdsTxt(null); setPage(null); setMFA(null); setPhase('idle') }}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>×</button>
              )}
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                padding: '0 32px',
                background: analyzing ? '#1e293b' : '#3b82f6',
                color: analyzing ? '#475569' : '#fff',
                border: 'none', borderRadius: 10,
                cursor: analyzing ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 13, letterSpacing: '0.08em', whiteSpace: 'nowrap',
              }}>
              {phase === 'static' ? 'PARSING...' : phase === 'ai' ? 'ANALYZING...' : 'ASSESS →'}
            </button>
          </div>
          {error && <div style={{ marginTop: 10, color: '#f87171', fontSize: 12 }}>⚠ {error}</div>}
        </div>

        {/* ── Example links ── */}
        {phase === 'idle' && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 10 }}>QUICK EXAMPLES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => setInput(ex)}
                  style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: '#64748b', fontSize: 11, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading spinner ── */}
        {analyzing && (
          <div className="card fade-in" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {phase === 'static' ? 'Parsing URL structure…'
                : phase === 'ai' ? 'Running AI signal analysis…'
                : 'Fetching page — measuring ad pixels & checking ads.txt…'}
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {staticResult && (phase === 'done' || phase === 'ai') && (
          <div className="fade-in">

            {/* Hero score */}
            <div className="card" style={{ padding: 36, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 36, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <CircleGauge score={totalScore ?? staticResult.overall} size={148} stroke={11} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: scoreColor(totalScore ?? staticResult.overall), lineHeight: 1 }}>
                    {totalScore ?? staticResult.overall}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, letterSpacing: '0.1em' }}>/100</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <QualityBadge score={totalScore ?? staticResult.overall} />
                <div style={{ fontSize: 13, color: '#94a3b8', wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 12 }}>
                  {staticResult.url}
                </div>
                {aiResult?.verdict && (
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, borderLeft: '2px solid #3b82f6', paddingLeft: 12 }}>
                    {aiResult.verdict}
                  </div>
                )}
                {phase === 'ai' && <div className="scan-line" style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>AI signal analysis in progress…</div>}
                {phase === 'page' && <div className="scan-line" style={{ fontSize: 12, color: '#7c3aed', marginTop: 8 }}>Fetching page — pixel coverage &amp; ads.txt…</div>}
              </div>
            </div>

            {/* Ad Intelligence */}
            <AdIntelPanel staticResult={staticResult} aiResult={aiResult} loading={phase === 'ai'} />

            {/* Page Intelligence: pixel coverage + ads.txt + MFA */}
            <PageIntelPanel
              adsTxtResult={adsTxtResult}
              pageResult={pageResult}
              mfaData={mfaData}
              pageLoading={pageLoading}
              adsTxtLoading={!adsTxtResult && (phase === 'page' || phase === 'done')}
            />

            {/* URL signal score cards */}
            <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 12 }}>URL SIGNALS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12, marginBottom: 20 }}>
              {URL_SIGNAL_KEYS.map((key, i) => {
                const s = staticResult.scores[key]
                return (
                  <div key={key} className="card fade-in" style={{ padding: 18, animationDelay: `${i * 80}ms` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontSize: 15 }}>{s.icon}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(s.score), fontFamily: "'Syne',sans-serif" }}>{s.score}</div>
                    </div>
                    <Bar score={s.score} delay={i * 80} />
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 8, lineHeight: 1.5 }}>{s.detail}</div>
                  </div>
                )
              })}
            </div>

            {/* AI general signals */}
            {aiResult && (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 14 }}>AI SIGNALS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {aiResult.signals?.map((sig, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span className={`tag-${sig.status}`} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', flexShrink: 0, marginTop: 1 }}>
                          {sig.status.toUpperCase()}
                        </span>
                        <div>
                          <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>{sig.name}</div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{sig.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {aiResult.strengths?.length > 0 && (
                    <div className="card" style={{ padding: 20 }}>
                      <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 10 }}>STRENGTHS</div>
                      {aiResult.strengths.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
                          <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiResult.risks?.length > 0 && (
                    <div className="card" style={{ padding: 20 }}>
                      <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 10 }}>RISKS</div>
                      {aiResult.risks.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
                          <span style={{ color: '#f87171', flexShrink: 0 }}>⚠</span>
                          <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiResult.recommendation && (
                    <div className="card" style={{ padding: 20, borderColor: '#1e3a5f' }}>
                      <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.12em', marginBottom: 8 }}>RECOMMENDATION</div>
                      <div style={{ fontSize: 13, color: '#93c5fd', lineHeight: 1.6 }}>{aiResult.recommendation}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, justifyContent: 'flex-end', paddingTop: 4 }}>
              {[['80–100', 'GOOD', '#4ade80'], ['60–79', 'FAIR', '#facc15'], ['40–59', 'POOR', '#fb923c'], ['0–39', 'BAD', '#f87171']].map(([r, l, c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ color: '#475569' }}>{r}</span>
                  <span style={{ color: c }}>{l}</span>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function QualityBadge({ score }) {
  const styles = {
    80: { background: 'rgba(74,222,128,0.12)',  color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
    60: { background: 'rgba(250,204,21,0.12)',  color: '#facc15', border: '1px solid rgba(250,204,21,0.3)' },
    40: { background: 'rgba(251,146,60,0.12)',  color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' },
    0:  { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' },
  }
  const key = score >= 80 ? 80 : score >= 60 ? 60 : score >= 40 ? 40 : 0
  return (
    <div style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 10, ...styles[key] }}>
      {scoreLabel(score)} QUALITY
    </div>
  )
}

// ── Global styles ─────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0f172a; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  .scan-line { animation: scan 2s linear infinite; }
  @keyframes scan { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
  .pulse { animation: pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  .fade-in { animation: fadeIn 0.5s ease forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; }
  input:focus { outline: none; }
  .tag-good { background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
  .tag-warn { background: rgba(250,204,21,0.1);  color: #facc15; border: 1px solid rgba(250,204,21,0.3); }
  .tag-bad  { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
`
