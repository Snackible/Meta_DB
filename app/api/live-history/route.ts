import { NextResponse } from 'next/server'
import { fetchLastNDays } from '@/lib/meta'

export const maxDuration = 60

const LOW_PERFORMER_MIN_SPEND = 5000
const LOW_PERFORMER_MAX_ROAS  = 2.5

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tab  = searchParams.get('tab') || 'Campaigns'
  const days = Math.min(30, Math.max(1, parseInt(searchParams.get('days') || '7')))

  try {
    const { campaigns, adsets, ads } = await fetchLastNDays(days)

    if (tab === 'Campaigns') return NextResponse.json({ rows: campaigns })
    if (tab === 'Adsets')    return NextResponse.json({ rows: adsets })
    if (tab === 'Ads')       return NextResponse.json({ rows: ads })
    if (tab === 'LowPerformers') {
      const rows = [...campaigns, ...adsets]
        .filter(r => r.spend >= LOW_PERFORMER_MIN_SPEND && r.roas < LOW_PERFORMER_MAX_ROAS)
        .map(r => ({ ...r, type: r.level }))
      return NextResponse.json({ rows })
    }
    return NextResponse.json({ error: `Unknown tab: ${tab}` }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
