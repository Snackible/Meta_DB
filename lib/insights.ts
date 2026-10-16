import { mean, stddev, linearFit } from './stats'

export interface Insight { tone: 'good' | 'warn' | 'bad' | 'neutral'; text: string }

function pct(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(0)}%`
}

/** Builds plain-English, interpreted insights from a sorted daily series of one entity — not just the raw numbers. */
export function buildInsights(opts: {
  series: { date: string; spend: number; orders: number; roas: number; cpc: number }[]
  spendShare: number // 0..1, this entity's share of total tab spend in the window
  accountAvgRoas: number
  accountAvgCpa: number
}): Insight[] {
  const { series, spendShare, accountAvgRoas, accountAvgCpa } = opts
  const out: Insight[] = []
  if (series.length === 0) return out

  const totalSpend  = series.reduce((s, r) => s + r.spend, 0)
  const totalOrders = series.reduce((s, r) => s + r.orders, 0)
  const blendedRoas = totalSpend ? series.reduce((s, r) => s + r.roas * r.spend, 0) / totalSpend : 0
  const blendedCpa  = totalOrders ? totalSpend / totalOrders : 0

  // Spend concentration
  if (spendShare >= 0.15) {
    out.push({ tone: 'neutral', text: `This entity accounts for ${(spendShare * 100).toFixed(0)}% of total spend in this view — a meaningful chunk of the budget.` })
  }

  // ROAS vs account average
  if (accountAvgRoas > 0) {
    const diff = ((blendedRoas - accountAvgRoas) / accountAvgRoas) * 100
    if (diff >= 15) out.push({ tone: 'good', text: `ROAS is ${pct(diff)} above the account average (${blendedRoas.toFixed(2)}x vs ${accountAvgRoas.toFixed(2)}x) — a strong relative performer.` })
    else if (diff <= -15) out.push({ tone: 'bad', text: `ROAS is ${pct(diff)} below the account average (${blendedRoas.toFixed(2)}x vs ${accountAvgRoas.toFixed(2)}x) — underperforming the portfolio.` })
  }

  // CPA vs account average
  if (accountAvgCpa > 0 && blendedCpa > 0) {
    const diff = ((blendedCpa - accountAvgCpa) / accountAvgCpa) * 100
    if (diff <= -15) out.push({ tone: 'good', text: `CPA is ${pct(-diff)} cheaper than the account average (₹${blendedCpa.toFixed(0)} vs ₹${accountAvgCpa.toFixed(0)}).` })
    else if (diff >= 15) out.push({ tone: 'warn', text: `CPA is ${pct(diff)} more expensive than the account average (₹${blendedCpa.toFixed(0)} vs ₹${accountAvgCpa.toFixed(0)}).` })
  }

  // Momentum: trailing half vs leading half of the window
  if (series.length >= 4) {
    const mid = Math.floor(series.length / 2)
    const early = series.slice(0, mid)
    const late  = series.slice(mid)
    const earlyRoas = mean(early.map(r => r.roas))
    const lateRoas  = mean(late.map(r => r.roas))
    if (earlyRoas > 0) {
      const change = ((lateRoas - earlyRoas) / earlyRoas) * 100
      if (change >= 20) out.push({ tone: 'good', text: `ROAS is trending up — ${pct(change)} in the second half of this window vs the first (${earlyRoas.toFixed(2)}x → ${lateRoas.toFixed(2)}x). Momentum is building.` })
      else if (change <= -20) out.push({ tone: 'bad', text: `ROAS is trending down — ${pct(change)} in the second half of this window vs the first (${earlyRoas.toFixed(2)}x → ${lateRoas.toFixed(2)}x). Efficiency is eroding.` })
    }
    const earlySpend = mean(early.map(r => r.spend))
    const lateSpend  = mean(late.map(r => r.spend))
    if (earlySpend > 0) {
      const spendChange = ((lateSpend - earlySpend) / earlySpend) * 100
      if (Math.abs(spendChange) >= 25) {
        out.push({ tone: 'neutral', text: `Daily spend has ${spendChange > 0 ? 'risen' : 'dropped'} ${pct(Math.abs(spendChange))} recently (₹${earlySpend.toFixed(0)}/day → ₹${lateSpend.toFixed(0)}/day).` })
      }
    }
  }

  // Volatility
  if (series.length >= 3) {
    const roasVals = series.map(r => r.roas)
    const m = mean(roasVals), sd = stddev(roasVals)
    const cv = m > 0 ? sd / m : 0
    if (cv >= 0.5) out.push({ tone: 'warn', text: `ROAS is volatile day-to-day (swings ~${(cv * 100).toFixed(0)}% of the mean) — treat single-day reads with caution, judge this on the trend instead.` })
    else if (cv > 0 && cv < 0.15) out.push({ tone: 'good', text: `ROAS has been consistent across the window (low day-to-day variance) — a reliable, predictable performer.` })
  }

  // Short directional slope projection
  if (series.length >= 3) {
    const { slope } = linearFit(series.map(r => r.roas))
    if (Math.abs(slope) > 0.05) {
      out.push({ tone: slope > 0 ? 'good' : 'warn', text: `Linear trend puts ROAS ${slope > 0 ? 'rising' : 'falling'} by roughly ${Math.abs(slope).toFixed(2)}x per day if the current trajectory holds.` })
    }
  }

  return out
}
