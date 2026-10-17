import { NextResponse } from 'next/server'
import { fetchDailySummaries, fetchRange, daysAgo, fmt, type MetaRow } from '@/lib/meta'
import { scorePool } from '@/lib/scoring'

export const maxDuration = 60

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function istDateParts(d = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600000)
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), day: ist.getUTCDate() }
}

export async function GET() {
  try {
    const [daily, week] = await Promise.all([
      fetchDailySummaries(30),
      fetchRange(daysAgo(7), fmt(new Date())),
    ])

    // --- Month-to-date pacing (IST calendar month, using completed days only) ---
    const { y, m, day: todayDay } = istDateParts()
    const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}-`
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const mtd = daily.filter(d => d.date.startsWith(monthPrefix))
    const mtdSpend  = mtd.reduce((s, d) => s + d.spend, 0)
    const mtdOrders = mtd.reduce((s, d) => s + d.orders, 0)
    const mtdRevenue = mtd.reduce((s, d) => s + d.roas * d.spend, 0)
    const daysElapsed = mtd.length || 1
    const projectedSpend   = (mtdSpend / daysElapsed) * daysInMonth
    const projectedOrders  = (mtdOrders / daysElapsed) * daysInMonth
    const projectedRevenue = (mtdRevenue / daysElapsed) * daysInMonth

    // --- Day-of-week efficiency ---
    const byWeekday: Record<number, { spend: number; orders: number; revenue: number; days: number }> = {}
    for (const d of daily) {
      const w = byWeekday[d.weekday] || { spend: 0, orders: 0, revenue: 0, days: 0 }
      w.spend += d.spend; w.orders += d.orders; w.revenue += d.roas * d.spend; w.days += 1
      byWeekday[d.weekday] = w
    }
    const weekdayStats = Object.entries(byWeekday).map(([wd, v]) => ({
      weekday: WEEKDAY_NAMES[Number(wd)],
      avgSpend: v.spend / v.days,
      roas: v.spend ? v.revenue / v.spend : 0,
      cpa: v.orders ? v.spend / v.orders : 0,
    })).sort((a, b) => WEEKDAY_NAMES.indexOf(a.weekday) - WEEKDAY_NAMES.indexOf(b.weekday))

    // --- Scale candidates / needs attention, from the trailing 7-day window, judged by each entity's own goal.
    // No per-entity daily data at this scope, so the "3+ active days" gate falls back to assuming the minimum —
    // only the spend gate is strictly enforced here (see Campaigns/Adsets/Ads tabs for the full day-count gate).
    const pool: MetaRow[] = [...week.campaigns, ...week.adsets]
    scorePool(pool, new Map())
    const scaleCandidates = pool
      .filter(r => r.signal === 'Scale')
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 8)
    const needsAttention = pool
      .filter(r => r.signal === 'Low' || r.signal === 'Reduce')
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8)

    return NextResponse.json({
      daily,
      pacing: {
        mtdSpend, mtdOrders, mtdRevenue, daysElapsed, daysInMonth,
        projectedSpend, projectedOrders, projectedRevenue,
        projectedRoas: projectedSpend ? projectedRevenue / projectedSpend : 0,
      },
      weekdayStats,
      scaleCandidates,
      needsAttention,
      asOf: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
