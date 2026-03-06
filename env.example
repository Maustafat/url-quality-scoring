// ─── Page-Level Analysis ──────────────────────────────────────────────────────
// Fetches actual page content via the Anthropic API to derive:
//   1. Pixel-based ad surface coverage (% of above-the-fold viewport used by ads)
//   2. ads.txt presence and entry count
//   3. MFA (Made For Advertising) likelihood score
//
// All three require live network access, so they run as a separate phase after
// the fast static + AI analysis phases.

const API_URL    = 'https://api.anthropic.com/v1/messages'
const MODEL      = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2000

// Standard desktop viewport used as the denominator for pixel coverage
const VIEWPORT_W = 1440
const VIEWPORT_H = 900
const VIEWPORT_PIXELS = VIEWPORT_W * VIEWPORT_H  // 1,296,000 px

// ── ads.txt ───────────────────────────────────────────────────────────────────
// Try to fetch ads.txt directly (works when the server allows CORS).
// Falls back to a "unknown" result so the rest of analysis still proceeds.
export async function checkAdsTxt(parsedUrl) {
  const origin = `${parsedUrl.protocol}//${parsedUrl.hostname}`
  const adsTxtUrl = `${origin}/ads.txt`

  try {
    const res = await fetch(adsTxtUrl, { method: 'GET', mode: 'cors', signal: AbortSignal.timeout(6000) })
    if (!res.ok) return { present: false, status: res.status, entries: 0, lines: [] }

    const text = await res.text()
    // Parse valid lines: variable=value or domain, pub-id, relationship[, cert-authority]
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))

    const entries = lines.filter(l => /,/.test(l)) // proper ads.txt records have commas
    return { present: true, status: 200, entries: entries.length, lines: lines.slice(0, 10) }
  } catch {
    // CORS blocked or network error — treat as unknown, not absent
    return { present: null, status: null, entries: null, lines: [], corsBlocked: true }
  }
}

// ── Pixel-based ad surface + MFA via AI ───────────────────────────────────────
// The AI fetches the page with web_search, reads the HTML/DOM structure,
// identifies ad slots by size/class/id/network tags, sums their pixel areas,
// and estimates coverage against the viewport.
const PAGE_SYSTEM_PROMPT = `You are an expert ad-tech auditor. Your job is to analyze web pages for advertising surface coverage and MFA (Made For Advertising) signals.

You will be given a URL. Use the web_search tool to retrieve the page, then analyze it for:

1. AD PIXEL COVERAGE — Identify every ad slot on the page:
   - <iframe> or <div> elements with ad network src/class/id (e.g. googletag, adsbygoogle, prebid, etc.)
   - Elements with common ad sizes: 728×90, 970×90, 300×250, 160×600, 320×50, 300×600, 970×250, 468×60, etc.
   - Sticky/fixed ad bars, interstitials, pop-unders (estimate their pixel size)
   - Count DISTINCT ad slots; do not double-count wrappers
   For each slot estimate width × height in pixels. Sum all slot areas.
   Express coverage as: (sum_ad_pixels / ${VIEWPORT_PIXELS}) × 100, capped at 100.
   Viewport assumption: ${VIEWPORT_W}×${VIEWPORT_H}px desktop.

2. MFA SIGNALS — Look for:
   - Excessive ads relative to content (>30% coverage is a strong MFA signal)
   - Auto-refresh ad slots
   - Misleading navigation / clickbait internal links
   - Thin or auto-generated content surrounding ads
   - Known MFA network fingerprints (Ezoic, AdThrive alone is NOT MFA, but combined with thin content it can be)
   - Low-quality outbound ad networks
   - "Chumbox" widgets (Taboola, Outbrain in excessive quantities)

Return ONLY valid JSON (no markdown, no backticks):
{
  "adPixelCoverage": <0-100 float, percent of viewport covered by ads>,
  "adSlots": [
    { "type": "<banner|native|video|interstitial|sticky>", "width": <px>, "height": <px>, "network": "<name or unknown>", "position": "<above-fold|below-fold|unknown>" }
  ],
  "totalAdPixels": <integer>,
  "viewportPixels": ${VIEWPORT_PIXELS},
  "mfaLikelihood": <0-100, 0=definitely not MFA, 100=definitely MFA>,
  "mfaLabel": "<UNLIKELY|POSSIBLE|LIKELY|VERY LIKELY>",
  "mfaSignals": [
    { "signal": "<signal name>", "weight": "high|medium|low", "found": true|false, "note": "<brief>" }
  ],
  "pageNotes": "<1-2 sentences about ad layout observations>",
  "confidence": "<high|medium|low — how confident are you in this estimate>"
}`

export async function analyzePageAds(url, adsTxtResult, staticResult, aiResult) {
  const apiKey = import.meta.env?.VITE_ANTHROPIC_API_KEY
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['x-api-key'] = apiKey

  const adContext = aiResult?.adAnalysis
    ? `AI ad analysis: density=${aiResult.adAnalysis.densityLabel}, quality=${aiResult.adAnalysis.qualityLabel}, est. slots=${aiResult.adAnalysis.estimatedAdSlots}`
    : `Static ad density score: ${staticResult.scores.adDensity.score}/100`

  const adsTxtContext = adsTxtResult.corsBlocked
    ? 'ads.txt: could not fetch (CORS blocked)'
    : adsTxtResult.present === false
      ? `ads.txt: NOT present (HTTP ${adsTxtResult.status})`
      : `ads.txt: present with ${adsTxtResult.entries} entries`

  const userPrompt = `Analyze this URL for pixel-based ad coverage and MFA likelihood:

URL: ${url}
Domain: ${staticResult.parsed.hostname}

Context from earlier analysis:
- ${adContext}
- ${adsTxtContext}
- Domain quality score: ${staticResult.scores.domain.score}/100
- Overall URL quality: ${staticResult.overall}/100

Fetch the page and calculate the actual ad pixel coverage and MFA signals.`

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: PAGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${response.status}`)
  }

  const data  = await response.json()
  const text  = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
  const clean = text.replace(/```json|```/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in page analysis response')
  return JSON.parse(match[0])
}

// ── MFA score derivation (static fallback if AI page fetch fails) ─────────────
// Used when the AI page analysis is unavailable; uses proxy signals only.
export function deriveMFAScore(staticResult, aiResult, adsTxtResult) {
  const adDensityScore  = staticResult.scores.adDensity.score    // 100=clean
  const adQualityScore  = staticResult.scores.adQuality.score    // 100=premium
  const domainScore     = staticResult.scores.domain.score
  const { adDensityRaw } = staticResult.adSignals               // 0=clean, 100=saturated

  let mfa = 0

  // High ad density is the primary MFA signal
  if (adDensityRaw > 70) mfa += 40
  else if (adDensityRaw > 45) mfa += 25
  else if (adDensityRaw > 20) mfa += 10

  // Low ad quality amplifies the signal
  if (adQualityScore < 40) mfa += 25
  else if (adQualityScore < 60) mfa += 12

  // Domain trust dampens or amplifies
  if (domainScore < 40) mfa += 15
  if (domainScore > 75) mfa -= 15

  // No ads.txt is a mild MFA signal
  if (adsTxtResult?.present === false) mfa += 10
  if (adsTxtResult?.present === true)  mfa -= 5

  // Many tracking params = ad-first orientation
  const { adParamCount } = staticResult.adSignals
  if (adParamCount > 4) mfa += 10

  const score = Math.min(100, Math.max(0, mfa))
  return {
    mfaLikelihood: score,
    mfaLabel: score >= 75 ? 'VERY LIKELY' : score >= 50 ? 'LIKELY' : score >= 25 ? 'POSSIBLE' : 'UNLIKELY',
    confidence: 'low',   // proxy only
    mfaSignals: [],
  }
}
