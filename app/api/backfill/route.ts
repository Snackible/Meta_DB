import { NextResponse } from 'next/server'
import { fetchDay, daysAgo } from '@/lib/meta'
import { upsertSnapshot } from '@/lib/sheets'

// One-time backfill: POST /api/backfill?months=37
// Protected by CRON_SECRET
export async function POST(req: Request) {
  const auth   = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const months = Math.min(parseInt(searchParams.get('months') || '37'), 37)
  const days   = months * 30

  // Process in batches of 30 days to avoid timeouts
  const BATCH = 30
  let written = 0
  const errors: string[] = []

  for (let start = 1; start <= days; start += BATCH) {
    const batchDates: string[] = []
    for (let i = start; i < start + BATCH && i <= days; i++) {
      batchDates.push(daysAgo(i))
    }
    try {
      const data = await Promise.all(batchDates.map(d => fetchDay(d)))
      // Filter days with no data
      const nonEmpty = data.filter(d => d.campaigns.length > 0)
      if (nonEmpty.length > 0) {
        const nonEmptyDates = batchDates.filter((_, i) => data[i].campaigns.length > 0)
        await upsertSnapshot(nonEmptyDates, nonEmpty)
        written += nonEmpty.reduce((s, d) => s + d.campaigns.length + d.adsets.length + d.ads.length, 0)
      }
    } catch (e: any) {
      errors.push(`Days ${start}-${start + BATCH - 1}: ${e.message}`)
    }
  }

  return NextResponse.json({ ok: true, rowsWritten: written, errors })
}
