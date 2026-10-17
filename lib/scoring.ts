import type { MetaRow, Goal } from './meta'

// Confirmed with the team — tune these as real targets firm up.
export const TARGET_CPP: Record<Exclude<Goal, 'Traffic' | 'Other'>, number> = {
  Sales: 250,     // cost per purchase
  Leads: 150,     // cost per lead
  Messaging: 120, // cost per WhatsApp conversation started
}
export const FALLBACK_TARGET = 300 // used for Traffic/Other, which don't have a cost-per-purchase style target
export const ROAS_BREAKEVEN = 2.2
export const ROAS_SCALE = 3.5
export const CTR_WARN_PCT = 0.7
export const HOOK_RATE_WARN_PCT = 20
export const FREQUENCY_WARN = 3
export const MEDIAN_CPP_MULTIPLIER = 1.5
export const ZERO_CONVERSION_SPEND_MULTIPLIER = 3
export const MIN_DAYS_ACTIVE = 3

export interface ScoredResult {
  signal: string
  tone: 'good' | 'warn' | 'bad' | 'neutral'
  reasons: string[]
}

function targetCpp(goal: Goal): number {
  return (TARGET_CPP as any)[goal] ?? FALLBACK_TARGET
}

function gateMultiplier(level: MetaRow['level']): number {
  return level === 'campaign' ? 2 : 4 // ad sets/ads need more spend before judging — they're noisier
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Per-goal median cost-per-primary-conversion across a pool, used as the "compare against our own average" baseline. */
export function buildAccountStats(pool: MetaRow[]) {
  const medianCppByGoal: Partial<Record<Goal, number>> = {}
  const goals: Goal[] = ['Sales', 'Leads', 'Messaging', 'Traffic', 'Other']
  for (const goal of goals) {
    const costs = pool.filter(r => r.goal === goal && r.primaryConversions > 0).map(r => r.costPerPrimary)
    if (costs.length) medianCppByGoal[goal] = median(costs)
  }
  return { medianCppByGoal }
}

function inr(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }

/**
 * Judges one entity against its own goal, not a single global ROAS rule:
 *  - Sales: ROAS + cost per purchase
 *  - Leads: cost per lead
 *  - Messaging (WhatsApp): cost per conversation started
 *  - Traffic: cost per landing page view
 * Gated by minimum spend (2x target CPP for campaigns, 4x for ad sets/ads) and 3+ active days —
 * otherwise everything new reads as "bad" on day one.
 */
export function scoreEntity(
  row: MetaRow,
  accountStats: ReturnType<typeof buildAccountStats>,
  daysActive: number,
): ScoredResult {
  const reasons: string[] = []
  const target = targetCpp(row.goal)
  const gateSpend = target * gateMultiplier(row.level)

  if (row.spend < gateSpend || daysActive < MIN_DAYS_ACTIVE) {
    return {
      signal: 'Learning',
      tone: 'neutral',
      reasons: [
        `Still gathering data — spent ${inr(row.spend)} over ${daysActive || '<1'} day(s); needs ${inr(gateSpend)}+ and ${MIN_DAYS_ACTIVE}+ days before judging.`,
      ],
    }
  }

  let signal: string = 'Monitor'
  let tone: ScoredResult['tone'] = 'neutral'

  if (row.goal === 'Sales') {
    if (row.roas >= ROAS_SCALE) {
      signal = 'Scale'; tone = 'good'
      reasons.push(`ROAS ${row.roas.toFixed(2)}x is well above breakeven — a strong scale candidate.`)
    } else if (row.roas < ROAS_BREAKEVEN) {
      signal = 'Low'; tone = 'bad'
      reasons.push(`ROAS ${row.roas.toFixed(2)}x is below the ${ROAS_BREAKEVEN}x breakeven.`)
    } else {
      signal = 'Good'; tone = 'good'
      reasons.push(`ROAS ${row.roas.toFixed(2)}x is above breakeven.`)
    }
  } else {
    reasons.push(`Goal: ${row.goal} — judged on cost per ${row.goal === 'Leads' ? 'lead' : row.goal === 'Messaging' ? 'conversation' : 'landing page view'}, not ROAS.`)
  }

  const medianCpp = accountStats.medianCppByGoal[row.goal]
  if (medianCpp && row.costPerPrimary > medianCpp * MEDIAN_CPP_MULTIPLIER) {
    signal = row.goal === 'Sales' ? signal : 'Low'
    if (row.goal !== 'Sales' || tone !== 'good') tone = 'bad'
    reasons.push(`Cost per conversion ${inr(row.costPerPrimary)} vs account median ${inr(medianCpp)} (${(row.costPerPrimary / medianCpp).toFixed(1)}x), spent ${inr(row.spend)} in this window.`)
  } else if (medianCpp && row.goal !== 'Sales' && row.costPerPrimary <= medianCpp) {
    signal = 'Good'; tone = 'good'
    reasons.push(`Cost per conversion ${inr(row.costPerPrimary)} is at or below the account median ${inr(medianCpp)}.`)
  }

  if (row.primaryConversions === 0 && row.spend >= target * ZERO_CONVERSION_SPEND_MULTIPLIER) {
    signal = 'Low'; tone = 'bad'
    reasons.push(`Zero conversions after spending ${inr(row.spend)} (${ZERO_CONVERSION_SPEND_MULTIPLIER}x+ the ${inr(target)} target).`)
  }

  // Early warning signals — appended regardless of the primary signal, since they predict trouble before conversions show it.
  if (row.ctr > 0 && row.ctr < CTR_WARN_PCT) {
    reasons.push(`Link CTR ${row.ctr.toFixed(2)}% is below the ${CTR_WARN_PCT}% floor.`)
  }
  if (row.hookRate > 0 && row.hookRate < HOOK_RATE_WARN_PCT) {
    reasons.push(`Hook rate ${row.hookRate.toFixed(0)}% (3-sec views ÷ impressions) is below ${HOOK_RATE_WARN_PCT}% — creative may not be grabbing attention.`)
  }
  if (row.frequency > FREQUENCY_WARN) {
    reasons.push(`Frequency ${row.frequency.toFixed(1)} is high — watch for creative fatigue.`)
  }

  return { signal, tone, reasons }
}

/** Scores a pool of entities in place (mutates .signal/.reasons), using the pool itself for median comparisons. */
export function scorePool(pool: MetaRow[], daysActiveById: Map<string, number>): MetaRow[] {
  const stats = buildAccountStats(pool)
  for (const row of pool) {
    const { signal, reasons } = scoreEntity(row, stats, daysActiveById.get(row.id) ?? MIN_DAYS_ACTIVE)
    row.signal = signal
    row.reasons = reasons
  }
  return pool
}
