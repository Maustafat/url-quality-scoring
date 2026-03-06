// ─── AI Analysis via Anthropic API ───────────────────────────────────────────
// Edit the system prompt or JSON schema here to change what the AI assesses.
// The API key is injected by the claude.ai artifact runtime; for standalone
// deployment set VITE_ANTHROPIC_API_KEY in your .env file.

const API_URL  = 'https://api.anthropic.com/v1/messages'
const MODEL    = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1400

// ── Prompts ───────────────────────────────────────────────────────────────────
// Edit these to change the AI's focus or add new assessment dimensions.

const SYSTEM_PROMPT = `You are a URL quality assessment engine. Analyze URLs for non-content quality factors, with special focus on AD DENSITY and AD QUALITY.

AD DENSITY: How heavily ad-loaded is a page at this URL likely to be? Consider domain type, ad network signals, affiliate chains, publisher category, monetization patterns.
AD QUALITY: Are ads likely contextual/premium vs intrusive/malware-adjacent/clickbait? Consider domain trust, ad network, affiliate chain depth, URL patterns.

Return ONLY valid JSON (no markdown, no backticks):
{
  "overallAIScore": <0-100>,
  "verdict": "<1 sentence overall verdict>",
  "adAnalysis": {
    "densityScore": <0-100, 100=completely clean, 0=saturated>,
    "densityRaw": <0-100, 0=no ads, 100=saturated>,
    "densityLabel": "<CLEAN|LIGHT|MODERATE|HEAVY|SATURATED>",
    "qualityScore": <0-100, 100=premium, 0=harmful>,
    "qualityLabel": "<PREMIUM|STANDARD|MIXED|LOW|HARMFUL>",
    "estimatedAdSlots": "<e.g. '2-4 display banners' or 'heavy interstitials + popups' or 'minimal/none'>",
    "adNetworks": ["<likely network name>"],
    "adSignals": [
      { "signal": "<signal name>", "impact": "positive|neutral|negative", "note": "<brief explanation>" }
    ]
  },
  "signals": [
    { "name": "<signal>", "status": "good|warn|bad", "note": "<brief>" }
  ],
  "risks": ["<risk>"],
  "strengths": ["<strength>"],
  "recommendation": "<1-2 sentences>"
}
Provide 5-8 general signals and 4-6 ad-specific signals. Use domain knowledge when available.`

function buildUserPrompt(url, staticResult) {
  const { adSignals } = staticResult
  return `Assess this URL:

URL: ${url}
Domain: ${staticResult.parsed.hostname}
Protocol: ${staticResult.parsed.protocol}
Path: ${staticResult.parsed.pathname}
Query: ${staticResult.parsed.search}

Static scores:
- Security: ${staticResult.scores.security.score}/100
- Domain Quality: ${staticResult.scores.domain.score}/100
- URL Structure: ${staticResult.scores.structure.score}/100
- Ad Density (static): ${staticResult.scores.adDensity.score}/100 (raw density: ${adSignals.adDensityRaw}%)
- Ad Quality (static): ${staticResult.scores.adQuality.score}/100
- Overall: ${staticResult.overall}/100

URL-level ad signals:
- Tracking/ad params found: ${adSignals.adParamCount} (${[...adSignals.trackingFound.map(([k]) => k), ...adSignals.affiliateFound.map(([k]) => k)].join(', ') || 'none'})
- Ad path keywords: ${adSignals.adPathFound.join(', ') || 'none'}
- Is ad-network domain: ${adSignals.isAdNetworkDomain}

Use your knowledge of this domain/publisher type to refine the ad density and quality estimates.`
}

// ── Runner ────────────────────────────────────────────────────────────────────
export async function runAIAnalysis(url, staticResult) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  const headers = { 'Content-Type': 'application/json' }
  // API key only needed for standalone deployment; claude.ai artifact runtime handles auth automatically
  if (apiKey) headers['x-api-key'] = apiKey

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(url, staticResult) }],
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
  if (!match) throw new Error('No JSON in AI response')
  return JSON.parse(match[0])
}
