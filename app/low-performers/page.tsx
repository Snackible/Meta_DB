'use client'
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import DataTable from '@/components/DataTable'

const COLS = ['id', 'date', 'name', 'campaign', 'type', 'goal', 'spend', 'orders', 'roas', 'cpc', 'cpr', 'signal']

export default function LowPerformersPage() {
  const [rows, setRows]     = useState<any[]>([])
  const [daily, setDaily]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch('/api/live-history?tab=LowPerformers')
      .then(r => r.json())
      .then(d => { setRows(d.rows || []); setDaily(d.daily || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Low Performers</h1>
        <p className="text-sm text-gray-500 mb-6">Flagged "Low" or "Reduce" by the goal-based scoring — each already past its minimum data gate (spend + 3+ active days). Click a row for the reason.</p>
        <DataTable columns={COLS} rows={rows} drilldownRows={daily} loading={loading} error={error} />
      </main>
    </div>
  )
}
