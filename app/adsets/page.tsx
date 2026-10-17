'use client'
import { useEffect, useMemo, useState } from 'react'
import Nav from '@/components/Nav'
import DataTable from '@/components/DataTable'
import TrendChart from '@/components/TrendChart'
import { aggregateByDate } from '@/lib/stats'

const COLS = ['id', 'date', 'name', 'campaign', 'goal', 'spend', 'orders', 'roas', 'cpc', 'cpr', 'clicks', 'signal']

export default function AdsetsPage() {
  const [rows, setRows]     = useState<any[]>([])
  const [daily, setDaily]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch('/api/live-history?tab=Adsets')
      .then(r => r.json())
      .then(d => { setRows(d.rows || []); setDaily(d.daily || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const trend = useMemo(() => aggregateByDate(daily), [daily])

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Ad Sets</h1>
        <p className="text-xs text-gray-400 mb-6">Judged over the trailing 7 days, by each ad set's own goal — click a row for the full reasoning.</p>
        {!loading && trend.length > 1 && <div className="mb-6"><TrendChart data={trend} /></div>}
        <DataTable columns={COLS} rows={rows} drilldownRows={daily} loading={loading} error={error} />
      </main>
    </div>
  )
}
