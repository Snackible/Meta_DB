'use client'
import { useEffect, useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SignalBadge from './SignalBadge'
import { buildInsights, Insight } from '@/lib/insights'

function inr(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L'
  if (n >= 1000)   return '₹' + Math.round(n / 1000) + 'K'
  return '₹' + Math.round(n || 0)
}

const TONE_STYLES: Record<Insight['tone'], string> = {
  good:    'border-emerald-200 bg-emerald-50 text-emerald-800',
  bad:     'border-rose-200 bg-rose-50 text-rose-800',
  warn:    'border-amber-200 bg-amber-50 text-amber-800',
  neutral: 'border-sky-200 bg-sky-50 text-sky-800',
}

interface Props {
  row: any
  allRows: any[]
  onClose: () => void
}

export default function EntityDetail({ row, allRows, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const series = useMemo(() => {
    return allRows
      .filter(r => r.id && r.id === row.id)
      .map(r => ({
        date: String(r.date).split('/')[0],
        spend: parseFloat(r.spend) || 0,
        orders: parseFloat(r.orders) || 0,
        roas: parseFloat(r.roas) || 0,
        cpc: parseFloat(r.cpc) || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [allRows, row.id])

  const totals = useMemo(() => {
    const spend  = series.reduce((s, r) => s + r.spend, 0)
    const orders = series.reduce((s, r) => s + r.orders, 0)
    const roas   = spend ? series.reduce((s, r) => s + r.roas * r.spend, 0) / spend : parseFloat(row.roas) || 0
    const cpa    = orders ? spend / orders : 0
    return { spend: spend || parseFloat(row.spend) || 0, orders: orders || parseFloat(row.orders) || 0, roas, cpa }
  }, [series, row])

  const { spendShare, accountAvgRoas, accountAvgCpa } = useMemo(() => {
    const totalSpend  = allRows.reduce((s, r) => s + (parseFloat(r.spend) || 0), 0)
    const totalOrders = allRows.reduce((s, r) => s + (parseFloat(r.orders) || 0), 0)
    const totalRev    = allRows.reduce((s, r) => s + (parseFloat(r.roas) || 0) * (parseFloat(r.spend) || 0), 0)
    return {
      spendShare: totalSpend ? totals.spend / totalSpend : 0,
      accountAvgRoas: totalSpend ? totalRev / totalSpend : 0,
      accountAvgCpa: totalOrders ? totalSpend / totalOrders : 0,
    }
  }, [allRows, totals.spend])

  const insights = useMemo(
    () => buildInsights({ series, spendShare, accountAvgRoas, accountAvgCpa }),
    [series, spendShare, accountAvgRoas, accountAvgCpa]
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{row.level || 'entity'}</div>
            <h2 className="text-base font-semibold text-gray-900 leading-snug pr-4">{row.name}</h2>
            {row.campaign && row.campaign !== row.name && (
              <div className="text-xs text-gray-400 mt-0.5">in {row.campaign}</div>
            )}
            {row.id && <div className="text-[11px] text-gray-300 font-mono mt-1">ID: {row.id}</div>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 shrink-0">
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          <div>
            <SignalBadge signal={row.signal} />
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              ['Spend', inr(totals.spend)],
              ['Orders', String(Math.round(totals.orders))],
              ['ROAS', totals.roas.toFixed(2) + 'x'],
              ['CPA', totals.cpa ? inr(totals.cpa) : '—'],
            ].map(([label, val]) => (
              <div key={label} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
                <div className="text-lg font-semibold text-gray-900">{val}</div>
              </div>
            ))}
          </div>

          {series.length > 1 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Daily trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={series} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={16} />
                  <YAxis yAxisId="spend" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={inr} width={40} />
                  <YAxis yAxisId="roas" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} width={28} />
                  <Tooltip formatter={(v: any, name: any) => String(name).toLowerCase().includes('roas') ? [Number(v).toFixed(2) + 'x', 'ROAS'] : [inr(Number(v)), 'Spend']} />
                  <Bar yAxisId="spend" dataKey="spend" name="Spend" fill="#7c3aed" radius={[2, 2, 0, 0]} barSize={14} />
                  <Line yAxisId="roas" type="monotone" dataKey="roas" name="ROAS" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {insights.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Interpretation</h3>
              <div className="flex flex-col gap-2">
                {insights.map((ins, i) => (
                  <div key={i} className={`border rounded-lg px-3 py-2 text-sm ${TONE_STYLES[ins.tone]}`}>
                    {ins.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {series.length > 1 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Day-by-day</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {['Date', 'Spend', 'Orders', 'ROAS', 'CPC'].map(h => (
                        <th key={h} className="px-2.5 py-2 text-left text-[10px] text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-2.5 py-1.5 text-gray-700">{r.date}</td>
                        <td className="px-2.5 py-1.5 text-gray-700">{inr(r.spend)}</td>
                        <td className="px-2.5 py-1.5 text-gray-700">{r.orders}</td>
                        <td className="px-2.5 py-1.5 text-gray-700">{r.roas.toFixed(2)}x</td>
                        <td className="px-2.5 py-1.5 text-gray-700">{inr(r.cpc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
