import { NextResponse } from 'next/server'
import { fetchDailySummaries, fetchRange, daysAgo, fmt, type MetaRow } from '@/lib/meta'
import { scorePool } from '@/lib/scoring'

export const maxDuration = 60

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const isWhatsApp = (r: MetaRow) => r.channel === 'WhatsApp'

function istDateParts(d = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600000)
  return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), day: ist.getUTCDate() }
}

function summarize(rows: MetaRow[]) {
  const spend  = rows.reduce((s, r) => s + r.spend, 0)
  const orders = rows.reduce((s, r) => s + r.orders, 0)
  const clicks = rows.reduce((s, r) => s + r.clicks, 0)
  const rev    = rows.reduce((s, r) => s + r.roas * r.spend, 0)
  return {
    spend, orders,
    cpc:  clicks ? spend / clicks : 0,
    cpa:  orders ? spend / orders : 0,
    roas: spend  ? rev   / spend  : 0,
  }
}

export async function GET() {
  try {
    const [daily, week, yesterdayRows] = await Promise.all([
      fetchDailySummaries(30, 5, isWhatsApp),
      fetchRange(daysAgo(7), fmt(new Date())),
      fetchRange(daysAgo(1), daysAgo(1)),
    ])

    const weekCampaigns = week.campaigns.filter(isWhatsApp)
    const weekAdsets    = week.adsets.filter(isWhatsApp)
    const weekAds       = week.ads.filter(isWhatsApp)
    const ydayCampaigns = yesterdayRows.campaigns.filter(isWhatsApp)

    const { y, m } = istDateParts()
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

    const pool = [...weekCampaigns, ...weekAdsets]
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
      yesterday: summarize(ydayCampaigns),
      week: summarize(weekCampaigns),
      campaigns: weekCampaigns,
      adsets: weekAdsets,
      ads: weekAds,
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
