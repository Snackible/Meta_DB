import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchDay, fetchRange, daysAgo, fmt } from '@/lib/meta'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const today     = new Date()
    const yday      = daysAgo(1)
    const weekStart = daysAgo(7)
    const todayStr  = fmt(today)

    const [ydayData, weekData] = await Promise.all([
      fetchDay(yday),
      fetchRange(weekStart, todayStr),
    ])

    return NextResponse.json({
      yesterday: ydayData,
      week:      weekData,
      asOf:      new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
