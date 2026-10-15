'use client'
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import SignalBadge from '@/components/SignalBadge'
import TrendChart, { DailyPoint } from '@/components/TrendChart'
import { projectAhead } from '@/lib/stats'

function inr(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L'
  if (n >= 1000)   return '₹' + Math.round(n / 1000) + 'K'
  return '₹' + Math.round(n)
}

const TILE_ACCENTS = ['border-indigo-200 bg-indigo-50', 'border-emerald-200 bg-emerald-50', 'border-amber-200 bg-amber-50', 'border-sky-200 bg-sky-50']

function Tile({ label, value, sub, i = 0 }: { label: string; value: string; sub?: string; i?: number }) {
  return (
    <div className={`border rounded-xl p-5 flex flex-col gap-1 ${TILE_ACCENTS[i % TILE_ACCENTS.length]}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

export default function SummaryPage() {
  const [data, setData]     = useState<any>(null)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<DailyPoint[]>([])

  useEffect(() => {
    fetch('/api/meta-data')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })

    fetch('/api/history?tab=Summary')
      .then(r => r.json())
      .then(d => {
        const points: DailyPoint[] = (d.rows || [])
          .filter((r: any) => r.window === '7day' || r.window === 'yesterday')
          .reduce((acc: Record<string, DailyPoint>, r: any) => {
            const d0 = String(r.date).split('/')[0]
            if (r.window === 'yesterday') acc[d0] = { date: d0, spend: parseFloat(r.spend) || 0, roas: parseFloat(r.roas) || 0 }
            return acc
          }, {})
        setHistory(Object.values(points))
      })
      .catch(() => {})
  }, [])

  const yd = data?.yesterday?.summary
  const wk = data?.week?.summary
  const asOf = data?.asOf
    ? new Date(data.asOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    : ''

  const spendSeries = [...history].sort((a, b) => a.date.localeCompare(b.date)).map(h => h.spend)
  const projectedWeekSpend = spendSeries.length >= 2
    ? projectAhead(spendSeries, 7).reduce((s, v) => s + v, 0)
    : null

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Meta Ads Overview</h1>
          {asOf && <span className="text-xs text-gray-400">Last updated {asOf}</span>}
        </div>

        {loading && <p className="text-gray-400">Loading live data…</p>}
        {error  && <p className="text-rose-600 text-sm">{error}</p>}

        {yd && (
          <>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Yesterday</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Tile i={0} label="Spend"  value={inr(yd.spend)}  />
              <Tile i={1} label="Orders" value={yd.orders}       />
              <Tile i={2} label="CPC"    value={inr(yd.cpc)}     />
              <Tile i={3} label="ROAS"   value={parseFloat(yd.roas || 0).toFixed(2) + 'x'} />
            </div>
          </>
        )}

        {wk && (
          <>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Last 7 Days</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Tile i={0} label="Spend"  value={inr(wk.spend)}  />
              <Tile i={1} label="Orders" value={wk.orders}       />
              <Tile i={2} label="CPC"    value={inr(wk.cpc)}     />
              <Tile i={3} label="ROAS"   value={parseFloat(wk.roas || 0).toFixed(2) + 'x'}
                sub={projectedWeekSpend !== null ? `Next 7d spend proj.: ${inr(projectedWeekSpend)}` : undefined} />
            </div>
          </>
        )}

        <div className="mb-8">
          <TrendChart data={history} />
        </div>

        {data?.yesterday?.campaigns?.length > 0 && (
          <>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Yesterday — Top Campaigns</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Campaign', 'Spend', 'Orders', 'ROAS', 'CPC', 'Signal'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.yesterday.campaigns.slice(0, 10).map((c: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-indigo-50/40">
                      <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{c.name}</td>
                      <td className="px-3 py-2 text-gray-700">{inr(c.spend)}</td>
                      <td className="px-3 py-2 text-gray-700">{c.orders}</td>
                      <td className="px-3 py-2 text-gray-700">{parseFloat(c.roas || 0).toFixed(2)}x</td>
                      <td className="px-3 py-2 text-gray-700">{inr(c.cpc)}</td>
                      <td className="px-3 py-2"><SignalBadge signal={c.signal} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
