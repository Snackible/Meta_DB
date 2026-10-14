'use client'
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import DataTable from '@/components/DataTable'

const COLS = ['date', 'name', 'campaign', 'spend', 'orders', 'roas', 'cpc', 'cpr', 'clicks', 'signal']

export default function AdsetsPage() {
  const [rows, setRows]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch('/api/history?tab=Adsets')
      .then(r => r.json())
      .then(d => { setRows(d.rows || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-6">Ad Sets</h1>
        <DataTable columns={COLS} rows={rows} loading={loading} error={error} />
      </main>
    </div>
  )
}
