'use client'
import { useEffect, useMemo, useState } from 'react'
import Nav from '@/components/Nav'
import DataTable from '@/components/DataTable'
import TrendChart from '@/components/TrendChart'
import { aggregateByDate } from '@/lib/stats'

const COLS = ['date', 'name', 'spend', 'orders', 'roas', 'cpc', 'cpr', 'clicks', 'signal']

export default function CampaignsPage() {
  const [rows, setRows]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch('/api/live-history?tab=Campaigns')
      .then(r => r.json())
      .then(d => { setRows(d.rows || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const trend = useMemo(() => aggregateByDate(rows), [rows])

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Campaigns</h1>
        {!loading && trend.length > 1 && <div className="mb-6"><TrendChart data={trend} /></div>}
        <DataTable columns={COLS} rows={rows} loading={loading} error={error} />
      </main>
    </div>
  )
}
