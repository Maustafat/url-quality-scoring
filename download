// ─── Score display helpers ─────────────────────────────────────────────────
// Centralise all colour / label derivation so tweaking thresholds is one edit.

export function scoreColor(s) {
  if (s >= 80) return '#4ade80'
  if (s >= 60) return '#facc15'
  if (s >= 40) return '#fb923c'
  return '#f87171'
}

export function scoreLabel(s) {
  if (s >= 80) return 'GOOD'
  if (s >= 60) return 'FAIR'
  if (s >= 40) return 'POOR'
  return 'BAD'
}

export function densityMeta(raw) {
  if (raw <= 10) return { text: 'CLEAN',    color: '#4ade80' }
  if (raw <= 30) return { text: 'LIGHT',    color: '#a3e635' }
  if (raw <= 55) return { text: 'MODERATE', color: '#facc15' }
  if (raw <= 75) return { text: 'HEAVY',    color: '#fb923c' }
  return             { text: 'SATURATED', color: '#f87171' }
}

export const QUALITY_COLORS = {
  PREMIUM:  '#4ade80',
  STANDARD: '#a3e635',
  MIXED:    '#facc15',
  LOW:      '#fb923c',
  HARMFUL:  '#f87171',
}

export function qualityLabelFromScore(score) {
  if (score >= 80) return 'PREMIUM'
  if (score >= 60) return 'STANDARD'
  if (score >= 40) return 'MIXED'
  if (score >= 20) return 'LOW'
  return 'HARMFUL'
}
