import { NextResponse } from 'next/server'
import { readHistory } from '@/lib/sheets'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tab = (searchParams.get('tab') || 'Campaigns') as any

  try {
    const rows = await readHistory(tab)
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
