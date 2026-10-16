'use client'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { projectAhead, addDays } from '@/lib/stats'

export interface CpaPoint { date: string; cpa: number }

function inr(n: number) {
  if (n >= 1000) return '₹' + Math.round(n / 1000) + 'K'
  return '₹' + Math.round(n)
}

export default function CpaTrendChart({ data, projectDays = 7 }: { data: CpaPoint[]; projectDays?: number }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date)).filter(d => d.cpa > 0)
  if (sorted.length < 2) return null

  const series   = sorted.map(d => d.cpa)
  const proj     = projectAhead(series, projectDays)
  const lastDate = sorted[sorted.length - 1].date

  const chartData = [
    ...sorted.map(d => ({ date: d.date, cpa: d.cpa })),
    ...proj.map((cpa, i) => ({ date: addDays(lastDate, i + 1), projCpa: cpa })),
  ]
  const last = chartData[sorted.length - 1] as any
  last.projCpa = last.cpa

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Cost per order (CAC) trend</h3>
        <span className="text-xs text-gray-400">dashed = {projectDays}-day projection</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={inr} width={48} />
          <Tooltip formatter={(v: any) => [inr(Number(v)), 'CPA']} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="cpa" name="CPA" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="projCpa" name="Projected CPA" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
