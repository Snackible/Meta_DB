'use client'
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import SignalBadge from '@/components/SignalBadge'
import TrendChart, { DailyPoint } from '@/components/TrendChart'
import CpaTrendChart from '@/components/CpaTrendChart'
import WeekdayChart from '@/components/WeekdayChart'
import EntityDetail from '@/components/EntityDetail'

function inr(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L'
  if (n >= 1000)   return '₹' + Math.round(n / 1000) + 'K'
  return '₹' + Math.round(n)
}

const TILE_ACCENTS = [
  'border-indigo-200 bg-gradient-to-br from-indigo-50 to-white',
  'border-violet-200 bg-gradient-to-br from-violet-50 to-white',
  'border-teal-200 bg-gradient-to-br from-teal-50 to-white',
  'border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white',
]

function Tile({ label, value, sub, i = 0 }: { label: string; value: string; sub?: string; i?: number }) {
  return (
    <div className={`border rounded-xl p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow ${TILE_ACCENTS[i % TILE_ACCENTS.length]}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

function MiniTable({ title, rows, emptyMsg, onSelect }: { title: string; rows: any[]; emptyMsg: string; onSelect: (row: any) => void }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-xl">{emptyMsg}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50/40">
                {['Name', 'Spend', 'Orders', 'ROAS', 'CPA', 'Signal'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} onClick={() => onSelect(r)} className="border-b border-gray-100 hover:bg-indigo-50/60 cursor-pointer transition-colors">
                  <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{r.name}</td>
                  <td className="px-3 py-2 text-gray-700">{inr(r.spend)}</td>
                  <td className="px-3 py-2 text-gray-700">{r.orders}</td>
                  <td className="px-3 py-2 text-gray-700">{parseFloat(r.roas || 0).toFixed(2)}x</td>
                  <td className="px-3 py-2 text-gray-700">{inr(r.cpr)}</td>
                  <td className="px-3 py-2"><SignalBadge signal={r.signal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function SummaryPage() {
  const [data, setData]       = useState<any>(null)
  const [overview, setOverview] = useState<any>(null)
  const [error, setError]     = useState('')
  const [ovError, setOvError] = useState('')
  const [loading, setLoading] = useState(true)
  const [ovLoading, setOvLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    fetch('/api/meta-data')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })

    fetch('/api/overview')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setOvError(d.error) } else { setOverview(d) }
        setOvLoading(false)
      })
      .catch(e => { setOvError(e.message); setOvLoading(false) })
  }, [])

  const yd = data?.yesterday?.summary
  const wk = data?.week?.summary
  const asOf = data?.asOf
    ? new Date(data.asOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    : ''

  const history: DailyPoint[] = (overview?.daily || []).map((d: any) => ({ date: d.date, spend: d.spend, roas: d.roas }))
  const cpaHistory = (overview?.daily || []).map((d: any) => ({ date: d.date, cpa: d.cpa }))
  const pacing = overview?.pacing

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
              <Tile i={2} label="CPA"    value={yd.orders ? inr(yd.spend / yd.orders) : '—'} />
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
              <Tile i={2} label="CPA"    value={wk.orders ? inr(wk.spend / wk.orders) : '—'} />
              <Tile i={3} label="ROAS"   value={parseFloat(wk.roas || 0).toFixed(2) + 'x'} />
            </div>
          </>
        )}

        {pacing && (
          <>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Month-to-date pacing <span className="normal-case text-gray-400">({pacing.daysElapsed}/{pacing.daysInMonth} days)</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Tile i={0} label="MTD Spend" value={inr(pacing.mtdSpend)} sub={`proj. month end: ${inr(pacing.projectedSpend)}`} />
              <Tile i={1} label="MTD Orders" value={String(Math.round(pacing.mtdOrders))} sub={`proj. month end: ${Math.round(pacing.projectedOrders)}`} />
              <Tile i={2} label="MTD Revenue" value={inr(pacing.mtdRevenue)} sub={`proj. month end: ${inr(pacing.projectedRevenue)}`} />
              <Tile i={3} label="Projected ROAS" value={pacing.projectedRoas.toFixed(2) + 'x'} sub="at current run-rate" />
            </div>
          </>
        )}

        {ovLoading && <p className="text-gray-400 text-sm mb-6">Crunching 30-day trends & projections…</p>}
        {ovError && <p className="text-rose-600 text-sm mb-6">{ovError}</p>}

        {history.length > 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <TrendChart data={history} />
            <CpaTrendChart data={cpaHistory} />
          </div>
        )}

        {overview?.weekdayStats?.length > 0 && (
          <div className="mb-8">
            <WeekdayChart data={overview.weekdayStats} />
          </div>
        )}

        {overview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <MiniTable
              title="Scale candidates (strong ROAS, room to push budget)"
              rows={overview.scaleCandidates}
              emptyMsg="No consistent high-ROAS performers in the last 7 days."
              onSelect={setSelected}
            />
            <MiniTable
              title="Needs attention (high spend, weak ROAS)"
              rows={overview.needsAttention}
              emptyMsg="Nothing flagged — no high-spend, low-ROAS campaigns this week."
              onSelect={setSelected}
            />
          </div>
        )}

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
                    <tr key={i} onClick={() => setSelected(c)} className="border-b border-gray-100 hover:bg-indigo-50/60 cursor-pointer transition-colors">
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

        {selected && (
          <EntityDetail
            row={selected}
            allRows={[...(overview?.scaleCandidates || []), ...(overview?.needsAttention || []), ...(data?.yesterday?.campaigns || [])]}
            onClose={() => setSelected(null)}
          />
        )}
      </main>
    </div>
  )
}
