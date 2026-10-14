import { NextResponse } from 'next/server'
import { fetchDay } from '@/lib/meta'
import { upsertSnapshot } from '@/lib/sheets'

// Called by Vercel Cron (daily 6am IST = 00:30 UTC)
// Also callable manually: POST /api/snapshot with Authorization: Bearer <CRON_SECRET>
export async function POST(req: Request) {
  const auth   = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Re-pull last 7 days — Meta revises recent numbers
    const today = new Date()
    const dates: string[] = []
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }

    const data = await Promise.all(dates.map(d => fetchDay(d)))
    await upsertSnapshot(dates, data)

    return NextResponse.json({ ok: true, dates, rows: data.reduce((s, d) => s + d.campaigns.length + d.adsets.length + d.ads.length, 0) })
  } catch (e: any) {
    console.error('[snapshot]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Vercel Cron hits GET
export async function GET(req: Request) {
  return POST(req)
}
