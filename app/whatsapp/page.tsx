'use client'
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import SignalBadge from '@/components/SignalBadge'
import TrendChart, { DailyPoint } from '@/components/TrendChart'
import CpaTrendChart from '@/components/CpaTrendChart'
import WeekdayChart from '@/components/WeekdayChart'
import EntityDetail from '@/components/EntityDetail'
import DataTable from '@/components/DataTable'

function inr(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L'
  if (n >= 1000)   return '₹' + Math.round(n / 1000) + 'K'
  return '₹' + Math.round(n || 0)
}

const TILE_ACCENTS = [
  'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
  'border-teal-200 bg-gradient-to-br from-teal-50 to-white',
  'border-cyan-200 bg-gradient-to-br from-cyan-50 to-white',
  'border-violet-200 bg-gradient-to-br from-violet-50 to-white',
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
              <tr className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-emerald-50/40">
                {['Name', 'Spend', 'Orders', 'ROAS', 'CPA', 'Signal'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} onClick={() => onSelect(r)} className="border-b border-gray-100 hover:bg-emerald-50/60 cursor-pointer transition-colors">
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

const CAMPAIGN_COLS = ['id', 'date', 'name', 'goal', 'spend', 'orders', 'roas', 'cpc', 'cpr', 'clicks', 'signal']
const ADSET_COLS    = ['id', 'date', 'name', 'campaign', 'goal', 'spend', 'orders', 'roas', 'cpc', 'cpr', 'clicks', 'signal']

export default function WhatsAppPage() {
  const [data, setData]       = useState<any>(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    fetch('/api/whatsapp')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error); else setData(d)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const history: DailyPoint[] = (data?.daily || []).map((d: any) => ({ date: d.date, spend: d.spend, roas: d.roas }))
  const cpaHistory = (data?.daily || []).map((d: any) => ({ date: d.date, cpa: d.cpa }))
  const pacing = data?.pacing
  const asOf = data?.asOf
    ? new Date(data.asOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    : ''

  return (
    <div>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">WhatsApp Campaigns</h1>
            <p className="text-xs text-gray-400 mt-1">Campaigns/ad sets tagged (WA) — pulled live from the Meta API, projected forward</p>
          </div>
          {asOf && <span className="text-xs text-gray-400">Last updated {asOf}</span>}
        </div>

        {loading && <p className="text-gray-400 text-sm mb-6">Crunching WhatsApp-only trends & projections…</p>}
        {error && <p className="text-rose-600 text-sm mb-6">{error}</p>}

        {data?.yesterday && (
          <>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Yesterday</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Tile i={0} label="Spend"  value={inr(data.yesterday.spend)} />
              <Tile i={1} label="Orders" value={String(Math.round(data.yesterday.orders))} />
              <Tile i={2} label="CPA"    value={data.yesterday.cpa ? inr(data.yesterday.cpa) : '—'} />
              <Tile i={3} label="ROAS"   value={data.yesterday.roas.toFixed(2) + 'x'} />
            </div>
          </>
        )}

        {data?.week && (
          <>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Last 7 Days</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Tile i={0} label="Spend"  value={inr(data.week.spend)} />
              <Tile i={1} label="Orders" value={String(Math.round(data.week.orders))} />
              <Tile i={2} label="CPA"    value={data.week.cpa ? inr(data.week.cpa) : '—'} />
              <Tile i={3} label="ROAS"   value={data.week.roas.toFixed(2) + 'x'} />
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

        {history.length > 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <TrendChart data={history} />
            <CpaTrendChart data={cpaHistory} />
          </div>
        )}

        {data?.weekdayStats?.length > 0 && (
          <div className="mb-8">
            <WeekdayChart data={data.weekdayStats} />
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <MiniTable
              title="Scale candidates"
              rows={data.scaleCandidates}
              emptyMsg="No standout WhatsApp performers in the last 7 days."
              onSelect={setSelected}
            />
            <MiniTable
              title="Needs attention"
              rows={data.needsAttention}
              emptyMsg="Nothing flagged for WhatsApp this week."
              onSelect={setSelected}
            />
          </div>
        )}

        {data?.campaigns && (
          <>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">WhatsApp Campaigns — last 7 days</h2>
            <div className="mb-8">
              <DataTable columns={CAMPAIGN_COLS} rows={data.campaigns} loading={false} error="" />
            </div>
          </>
        )}

        {data?.adsets?.length > 0 && (
          <>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">WhatsApp Ad Sets — last 7 days</h2>
            <div className="mb-8">
              <DataTable columns={ADSET_COLS} rows={data.adsets} loading={false} error="" />
            </div>
          </>
        )}

        {selected && (
          <EntityDetail
            row={selected}
            allRows={[...(data?.scaleCandidates || []), ...(data?.needsAttention || []), ...(data?.campaigns || []), ...(data?.adsets || [])]}
            onClose={() => setSelected(null)}
          />
        )}
      </main>
    </div>
  )
}
