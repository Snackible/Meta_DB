'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { projectAhead, addDays } from '@/lib/stats'

export interface DailyPoint { date: string; spend: number; roas: number }

function inr(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000)   return '₹' + Math.round(n / 1000) + 'K'
  return '₹' + Math.round(n)
}

export default function TrendChart({ data, projectDays = 7 }: { data: DailyPoint[]; projectDays?: number }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const spendSeries = sorted.map(d => d.spend)
  const roasSeries  = sorted.map(d => d.roas)
  const projSpend = projectAhead(spendSeries, projectDays)
  const projRoas  = projectAhead(roasSeries, projectDays)
  const lastDate  = sorted.length ? sorted[sorted.length - 1].date : ''

  const chartData = [
    ...sorted.map(d => ({ date: d.date, spend: d.spend, roas: d.roas })),
    ...projSpend.map((spend, i) => ({
      date: lastDate ? addDays(lastDate, i + 1) : String(i),
      projSpend: spend,
      projRoas: projRoas[i],
    })),
  ]
  // bridge the gap so the dashed projection line connects to the real line
  if (sorted.length && projSpend.length) {
    const last = chartData[sorted.length - 1] as any
    last.projSpend = last.spend
    last.projRoas  = last.roas
  }

  if (sorted.length < 2) return <p className="text-sm text-gray-400 py-6 text-center">Not enough history yet to chart a trend.</p>

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Spend & ROAS trend</h3>
        <span className="text-xs text-gray-400">dashed = {projectDays}-day projection</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} minTickGap={24} />
          <YAxis yAxisId="spend" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={inr} width={48} />
          <YAxis yAxisId="roas" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} width={36} />
          <Tooltip
            formatter={(v: any, name: any) =>
              String(name).toLowerCase().includes('roas') ? [Number(v).toFixed(2) + 'x', 'ROAS'] : [inr(Number(v)), 'Spend']
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="spend" dataKey="spend" name="Spend" fill="#4f46e5" radius={[3, 3, 0, 0]} barSize={14} />
          <Bar yAxisId="spend" dataKey="projSpend" name="Projected Spend" fill="#c7d2fe" radius={[3, 3, 0, 0]} barSize={14} />
          <Line yAxisId="roas" type="monotone" dataKey="roas" name="ROAS" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line yAxisId="roas" type="monotone" dataKey="projRoas" name="Projected ROAS" stroke="#10b981" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
