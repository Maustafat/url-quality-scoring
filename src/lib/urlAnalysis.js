// ─── Static URL Analysis Engine ──────────────────────────────────────────────
// All heuristic scoring logic lives here so it can be tweaked independently
// of the UI. Each scorer returns a value 0–100 where 100 = best quality.

export function parseURL(raw) {
  try { return new URL(raw.startsWith('http') ? raw : 'https://' + raw) }
  catch { return null }
}

export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)) }

// ── Lookup sets ───────────────────────────────────────────────────────────────
export const TRUSTED_TLDS = new Set([
  'com','org','net','edu','gov','io','co','uk','de','fr','jp','ca','au',
  'nl','se','no','fi','ch','be','at','nz','ie','sg','hk','info','biz',
])
export const SPAMMY_TLDS = new Set([
  'tk','ml','ga','cf','gq','xyz','top','club','work','click','loan','win',
  'download','stream','racing','bid','trade','party','review','date',
  'faith','cricket','science','ninja',
])
export const TRACKING_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'fbclid','gclid','msclkid','yclid','ref','affiliate','aff','clickid',
  'source','mc_eid','_ga',
])
export const AD_NETWORK_DOMAINS = [
  'doubleclick','googlesyndication','adnxs','criteo','outbrain','taboola',
  'revcontent','mgid','adroll','media.net','rubiconproject','pubmatic',
  'openx','appnexus','amazon-adsystem','adform','smartadserver','33across',
  'sovrn','sharethrough','triplelift','indexexchange','adsrvr','adtechus',
  'bidswitch','contextweb','conversantmedia',
]
export const AFFILIATE_PARAMS = new Set([
  'aff_id','affiliate_id','partner','referral','promo','coupon','tracking',
  'cid','pid','aid','sid','offer_id','campaign_id','publisher_id',
  'sub1','sub2','sub3','clickref','affid','afftrack',
])
export const AD_PATH_KEYWORDS = [
  'sponsored','advertise','promo','banner','advert','ad-','ads/',
  'affiliat','click-','partner','referral',
]

// ── Individual scorers ────────────────────────────────────────────────────────
export function scoreProtocolSecurity(parsed) {
  const isHTTPS = parsed.protocol === 'https:'
  const hasWWW  = parsed.hostname.startsWith('www.')
  return clamp((isHTTPS ? 70 : 0) + (hasWWW ? 15 : 10), 0, 100)
}

export function scoreDomainQuality(parsed) {
  const parts = parsed.hostname.split('.')
  const tld   = parts[parts.length - 1]
  const sld   = parts[parts.length - 2] || ''
  const subdomainCount = Math.max(0, parts.length - 2)
  let score = 55
  if (TRUSTED_TLDS.has(tld))              score += 20
  if (SPAMMY_TLDS.has(tld))               score -= 45
  if (sld.includes('-'))                   score -= 15
  if (sld.length >= 3 && sld.length <= 18) score += 15
  else if (sld.length > 25)               score -= 15
  if (subdomainCount > 2)                  score -= 20
  if (/\d{4,}/.test(sld))                 score -= 10
  return clamp(score, 0, 100)
}

export function scoreURLStructure(parsed, urlLen) {
  const pathSegments = parsed.pathname.split('/').filter(Boolean)
  let score = 85
  if (urlLen > 75)  score -= 10
  if (urlLen > 120) score -= 15
  if (urlLen > 180) score -= 20
  if (pathSegments.length > 6) score -= 15
  const hasReadable = pathSegments.every(s => /^[a-z0-9\-]+$/i.test(s))
  if (!hasReadable) score -= 15
  if (parsed.pathname.includes('_')) score -= 8
  return clamp(score, 0, 100)
}

export function scoreURLCleanliness(parsed, params) {
  const trackingCount = params.filter(([k]) => TRACKING_PARAMS.has(k.toLowerCase())).length
  let score = 100
  if (params.length > 6)      score -= 30
  else if (params.length > 3) score -= 15
  score -= trackingCount * 12
  if (parsed.hash) score -= 5
  return clamp(score, 0, 100)
}

export function scorePathQuality(parsed) {
  const segs = parsed.pathname.split('/').filter(Boolean)
  if (segs.length === 0) return 72
  let score = 75
  const hasGibberish  = segs.some(s => /[0-9a-f]{20,}/i.test(s) || s.length > 40)
  const numericOnly   = segs.filter(s => /^\d+$/.test(s)).length
  const hasGoodSlug   = segs.some(s => s.length > 3 && s.length < 60 && /[a-z]/i.test(s))
  if (hasGibberish)   score -= 30
  if (numericOnly > 0) score -= 10
  if (hasGoodSlug)    score += 15
  return clamp(score, 0, 100)
}

export function scoreAdDensity(adParamCount, adPathFound, isAdNetworkDomain, trackingCount) {
  let score = 100
  score -= adParamCount * 14
  score -= adPathFound.length * 18
  if (isAdNetworkDomain) score -= 50
  if (trackingCount >= 3) score -= 10
  return clamp(score, 0, 100)
}

export function scoreAdQuality(parsed, isAdNetworkDomain, affiliateCount, adPathFound, adParamCount) {
  const tld = parsed.hostname.split('.').pop()
  const isHTTPS = parsed.protocol === 'https:'
  let score = 70
  if (isAdNetworkDomain) score -= 40
  if (SPAMMY_TLDS.has(tld)) score -= 30
  if (adPathFound.some(k => k.includes('click') || k.includes('banner'))) score -= 20
  if (affiliateCount > 0 && isHTTPS) score += 5
  if (TRUSTED_TLDS.has(tld) && adParamCount === 0) score += 20
  return clamp(score, 0, 100)
}

// ── Master runner ─────────────────────────────────────────────────────────────
export function runStaticAnalysis(rawUrl) {
  const url    = rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl
  const parsed = parseURL(url)
  if (!parsed) return null

  const parts    = parsed.hostname.split('.')
  const tld      = parts[parts.length - 1]
  const sld      = parts[parts.length - 2] || ''
  const subdomainCount  = Math.max(0, parts.length - 2)
  const pathSegments    = parsed.pathname.split('/').filter(Boolean)
  const params          = [...parsed.searchParams.entries()]
  const trackingFound   = params.filter(([k]) => TRACKING_PARAMS.has(k.toLowerCase()))
  const affiliateFound  = params.filter(([k]) => AFFILIATE_PARAMS.has(k.toLowerCase()))
  const urlLen          = url.length
  const isAdNetworkDomain = AD_NETWORK_DOMAINS.some(n => parsed.hostname.includes(n))
  const adPathFound       = AD_PATH_KEYWORDS.filter(kw => parsed.pathname.toLowerCase().includes(kw))
  const adParamCount      = affiliateFound.length + trackingFound.length
  const isHTTPS           = parsed.protocol === 'https:'
  const hasWWW            = parsed.hostname.startsWith('www.')
  const hasGibberish      = pathSegments.some(s => /[0-9a-f]{20,}/i.test(s) || s.length > 40)
  const numericOnly       = pathSegments.filter(s => /^\d+$/.test(s)).length
  const hasReadable       = pathSegments.every(s => /^[a-z0-9\-]+$/i.test(s))

  const secScore        = scoreProtocolSecurity(parsed)
  const domainScore     = scoreDomainQuality(parsed)
  const structureScore  = scoreURLStructure(parsed, urlLen)
  const cleanScore      = scoreURLCleanliness(parsed, params)
  const pathScore       = scorePathQuality(parsed)
  const adDensityScore  = scoreAdDensity(adParamCount, adPathFound, isAdNetworkDomain, trackingFound.length)
  const adQualityScore  = scoreAdQuality(parsed, isAdNetworkDomain, affiliateFound.length, adPathFound, adParamCount)
  const adDensityRaw    = clamp(100 - adDensityScore, 0, 100)

  // Weights must sum to 1.0
  const WEIGHTS = { security: 0.15, domain: 0.20, structure: 0.15, cleanliness: 0.12, path: 0.15, adDensity: 0.12, adQuality: 0.11 }

  const scores = {
    security:    { score: secScore,       label: 'Protocol Security', icon: '🔒',
      detail: `${isHTTPS ? 'HTTPS ✓' : 'HTTP — insecure'}  ·  ${hasWWW ? 'www prefix' : 'no www'}` },
    domain:      { score: domainScore,    label: 'Domain Quality',    icon: '🌐',
      detail: `.${tld} TLD  ·  ${sld.length} char SLD  ·  ${subdomainCount} subdomain level${subdomainCount !== 1 ? 's' : ''}` },
    structure:   { score: structureScore, label: 'URL Structure',     icon: '🔗',
      detail: `${urlLen} chars  ·  ${pathSegments.length} path segment${pathSegments.length !== 1 ? 's' : ''}  ·  ${hasReadable ? 'clean slugs' : 'non-standard chars'}` },
    cleanliness: { score: cleanScore,     label: 'URL Cleanliness',   icon: '✨',
      detail: `${params.length} param${params.length !== 1 ? 's' : ''}  ·  ${trackingFound.length} tracking${trackingFound.length > 0 ? ' (' + trackingFound.map(([k]) => k).join(', ') + ')' : ''}` },
    path:        { score: pathScore,      label: 'Path Quality',      icon: '📁',
      detail: `${hasGibberish ? 'Gibberish hashes detected' : 'Readable paths'}  ·  ${numericOnly} numeric-only segment${numericOnly !== 1 ? 's' : ''}` },
    adDensity:   { score: adDensityScore, label: 'Ad Density',        icon: '📊', rawDensity: adDensityRaw,
      detail: `${adParamCount} ad/affiliate params  ·  ${adPathFound.length} ad path kw${adPathFound.length !== 1 ? 's' : ''}${isAdNetworkDomain ? ' · ad network domain' : ''}` },
    adQuality:   { score: adQualityScore, label: 'Ad Quality',        icon: '🎯',
      detail: `${affiliateFound.length} affiliate param${affiliateFound.length !== 1 ? 's' : ''}  ·  ${isAdNetworkDomain ? 'ad network' : 'direct domain'}  ·  ${isHTTPS ? 'secure' : 'insecure'}` },
  }

  const overall = Math.round(
    Object.entries(scores).reduce((acc, [k, v]) => acc + v.score * (WEIGHTS[k] ?? 0), 0)
  )

  return {
    scores, overall, parsed, url, weights: WEIGHTS,
    adSignals: { adParamCount, adPathFound, isAdNetworkDomain, affiliateFound, trackingFound, adDensityRaw },
  }
}
