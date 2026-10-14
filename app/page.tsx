'use client'
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

function inr(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L'
  if (n >= 1000)   return '₹' + Math.round(n / 1000) + 'K'
  return '₹' + Math.round(n)
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-1">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

export default function SummaryPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/meta-data')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const yd = data?.yesterday?.summary
  const wk = data?.week?.summary
  const asOf = data?.asOf
    ? new Date(data.asOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    : ''

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Meta Ads Overview</h1>
          {asOf && <span className="text-xs text-gray-500">Last updated {asOf}</span>}
        </div>

        {loading && <p className="text-gray-500">Loading live data…</p>}
        {error  && <p className="text-red-400 text-sm">{error}</p>}

        {yd && (
          <>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Yesterday</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Tile label="Spend"  value={inr(yd.spend)}  />
              <Tile label="Orders" value={yd.orders}       />
              <Tile label="CPC"    value={inr(yd.cpc)}     />
              <Tile label="ROAS"   value={parseFloat(yd.roas || 0).toFixed(2) + 'x'} />
            </div>
          </>
        )}

        {wk && (
          <>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Last 7 Days</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Tile label="Spend"  value={inr(wk.spend)}  />
              <Tile label="Orders" value={wk.orders}       />
              <Tile label="CPC"    value={inr(wk.cpc)}     />
              <Tile label="ROAS"   value={parseFloat(wk.roas || 0).toFixed(2) + 'x'} />
            </div>
          </>
        )}

        {data?.yesterday?.campaigns?.length > 0 && (
          <>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Yesterday — Top Campaigns</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-800 mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Campaign', 'Spend', 'Orders', 'ROAS', 'CPC', 'Signal'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.yesterday.campaigns.slice(0, 10).map((c: any, i: number) => (
                    <tr key={i} className="border-b border-gray-900 hover:bg-gray-900/50">
                      <td className="px-3 py-2 text-gray-200 max-w-xs truncate">{c.name}</td>
                      <td className="px-3 py-2">{inr(c.spend)}</td>
                      <td className="px-3 py-2">{c.orders}</td>
                      <td className="px-3 py-2">{parseFloat(c.roas || 0).toFixed(2)}x</td>
                      <td className="px-3 py-2">{inr(c.cpc)}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{c.signal}</td>
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
