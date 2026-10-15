export function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  return Math.sqrt(mean(values.map(v => (v - m) ** 2)))
}

/** Flags values more than `z` standard deviations from the mean. */
export function outlierFlags(values: number[], z = 1.5): boolean[] {
  const m = mean(values)
  const sd = stddev(values)
  if (sd === 0) return values.map(() => false)
  return values.map(v => Math.abs(v - m) / sd >= z)
}

/** Least-squares linear fit over (0..n-1, values); returns {slope, intercept}. */
export function linearFit(values: number[]): { slope: number; intercept: number } {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] || 0 }
  const xs = values.map((_, i) => i)
  const mx = mean(xs), my = mean(values)
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (values[i] - my)
    den += (xs[i] - mx) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  return { slope, intercept: my - slope * mx }
}

/** Projects `daysAhead` future points from the trailing `window` points of a series. */
export function projectAhead(values: number[], daysAhead: number, window = 14): number[] {
  const tail = values.slice(-window)
  const { slope, intercept } = linearFit(tail)
  const n = tail.length
  const out: number[] = []
  for (let i = 0; i < daysAhead; i++) {
    out.push(Math.max(0, intercept + slope * (n - 1 + i + 1)))
  }
  return out
}

/** Aggregates history rows (date, spend, roas) into one point per date — spend summed, ROAS spend-weighted. */
export function aggregateByDate(rows: { date?: string; spend?: any; roas?: any }[]): { date: string; spend: number; roas: number }[] {
  const byDate: Record<string, { spend: number; weightedRoas: number }> = {}
  for (const r of rows) {
    const date = String(r.date || '').split('/')[0]
    if (!date) continue
    const spend = parseFloat(r.spend) || 0
    const roas  = parseFloat(r.roas)  || 0
    if (!byDate[date]) byDate[date] = { spend: 0, weightedRoas: 0 }
    byDate[date].spend += spend
    byDate[date].weightedRoas += spend * roas
  }
  return Object.entries(byDate).map(([date, v]) => ({
    date,
    spend: v.spend,
    roas: v.spend ? v.weightedRoas / v.spend : 0,
  }))
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]
}
