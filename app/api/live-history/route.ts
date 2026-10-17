import { NextResponse } from 'next/server'
import { fetchLastNDays, fetchRange, daysActiveById, daysAgo, fmt } from '@/lib/meta'
import { scorePool } from '@/lib/scoring'

export const maxDuration = 60

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tab  = searchParams.get('tab') || 'Campaigns'
  const days = Math.min(30, Math.max(1, parseInt(searchParams.get('days') || '7')))

  try {
    // Daily granularity (for per-entity drill-down trend + the "3+ active days" data gate)...
    const { campaigns: dCampaigns, adsets: dAdsets, ads: dAds } = await fetchLastNDays(days)
    // ...and the native 7-day aggregate per entity, which is what gets judged/displayed.
    const weekly = await fetchRange(daysAgo(days), fmt(new Date()))

    const activeCampaigns = daysActiveById(dCampaigns)
    const activeAdsets    = daysActiveById(dAdsets)
    const activeAds       = daysActiveById(dAds)

    scorePool(weekly.campaigns, activeCampaigns)
    scorePool(weekly.adsets, activeAdsets)
    scorePool(weekly.ads, activeAds)

    if (tab === 'Campaigns') return NextResponse.json({ rows: weekly.campaigns, daily: dCampaigns })
    if (tab === 'Adsets')    return NextResponse.json({ rows: weekly.adsets, daily: dAdsets })
    if (tab === 'Ads')       return NextResponse.json({ rows: weekly.ads, daily: dAds })
    if (tab === 'LowPerformers') {
      const rows = [...weekly.campaigns, ...weekly.adsets]
        .filter(r => r.signal === 'Low' || r.signal === 'Reduce')
        .map(r => ({ ...r, type: r.level }))
        .sort((a, b) => b.spend - a.spend)
      return NextResponse.json({ rows, daily: [...dCampaigns, ...dAdsets] })
    }
    return NextResponse.json({ error: `Unknown tab: ${tab}` }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
