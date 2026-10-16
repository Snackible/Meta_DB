'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export interface WeekdayPoint { weekday: string; avgSpend: number; roas: number; cpa: number }

function inr(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000)   return '₹' + Math.round(n / 1000) + 'K'
  return '₹' + Math.round(n)
}

export default function WeekdayChart({ data }: { data: WeekdayPoint[] }) {
  if (!data.length) return null
  const best = [...data].sort((a, b) => b.roas - a.roas)[0]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Performance by day of week</h3>
        {best && <span className="text-xs text-gray-400">best: {best.weekday} ({best.roas.toFixed(2)}x)</span>}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" />
          <XAxis dataKey="weekday" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis yAxisId="spend" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={inr} width={48} />
          <YAxis yAxisId="roas" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} width={36} />
          <Tooltip
            formatter={(v: any, name: any) =>
              String(name).toLowerCase().includes('roas') ? [Number(v).toFixed(2) + 'x', 'ROAS'] : [inr(Number(v)), 'Avg Spend']
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="spend" dataKey="avgSpend" name="Avg Spend" fill="#4f46e5" radius={[3, 3, 0, 0]} barSize={22} />
          <Line yAxisId="roas" type="monotone" dataKey="roas" name="ROAS" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
