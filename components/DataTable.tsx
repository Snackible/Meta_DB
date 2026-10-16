'use client'
import { useState, useMemo } from 'react'
import SignalBadge from './SignalBadge'
import EntityDetail from './EntityDetail'
import { outlierFlags } from '@/lib/stats'

function inr(v: any) {
  const n = parseFloat(v)
  if (isNaN(n)) return v
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function fmt(v: any, col: string): string {
  if (v === null || v === undefined || v === '') return '—'
  const s = String(v)
  if (['spend', 'cpc', 'cpr'].includes(col)) return inr(v)
  if (col === 'roas') return parseFloat(v).toFixed(2) + 'x'
  if (col === 'id') return s.length > 14 ? s.slice(0, 6) + '…' + s.slice(-4) : s
  if (col === 'avg3dRoas' || col === 'avg3d_roas') {
    const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(2) + 'x'
  }
  return s
}

function exportCSV(cols: string[], rows: any[][]) {
  const lines = [cols.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a    = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = 'meta-ads.csv'; a.click()
}

interface Props {
  columns: string[]
  rows: Record<string, any>[]
  loading?: boolean
  error?: string
}

export default function DataTable({ columns, rows, loading, error }: Props) {
  const [search, setSearch]   = useState('')
  const [sortCol, setSortCol] = useState('')
  const [sortAsc, setSortAsc] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [selected, setSelected] = useState<any>(null)

  const filtered = useMemo(() => {
    let r = rows
    if (dateFrom) r = r.filter(row => (row.date || '') >= dateFrom)
    if (dateTo)   r = r.filter(row => (row.date || '') <= dateTo)
    if (search)   r = r.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    if (sortCol) {
      r = [...r].sort((a, b) => {
        const av = parseFloat(a[sortCol]) || String(a[sortCol] ?? '')
        const bv = parseFloat(b[sortCol]) || String(b[sortCol] ?? '')
        if (av < bv) return sortAsc ? -1 : 1
        if (av > bv) return sortAsc ? 1 : -1
        return 0
      })
    }
    return r
  }, [rows, search, sortCol, sortAsc, dateFrom, dateTo])

  // Statistical outliers within the currently filtered set, on ROAS (good or bad) and CPC (bad only shown).
  const roasOutliers = useMemo(
    () => columns.includes('roas') ? outlierFlags(filtered.map(r => parseFloat(r.roas) || 0)) : [],
    [filtered, columns]
  )

  const rawRows = filtered.map(r => columns.map(c => r[c] ?? ''))

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(false) }
  }

  if (error) return <p className="text-rose-600 text-sm p-4">{error}</p>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm w-52 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
        {columns.includes('roas') && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-200 border border-rose-300 inline-block" /> = statistical outlier
          </span>
        )}
        <span className="text-xs text-gray-400 hidden sm:inline">Click a row for details</span>
        <button
          onClick={() => exportCSV(columns, rawRows)}
          className="ml-auto bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-md px-3 py-1.5 text-sm hover:opacity-90 transition font-medium shadow-sm"
        >
          Download CSV
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50/40">
                {columns.map(col => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-900 whitespace-nowrap select-none"
                  >
                    {col.replace(/_/g, ' ')}
                    {sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center text-gray-400 py-8">No data</td></tr>
              ) : filtered.map((row, i) => (
                <tr
                  key={row.id ? `${row.id}-${row.date}` : i}
                  onClick={() => setSelected(row)}
                  className={`border-b border-gray-100 hover:bg-indigo-50/60 cursor-pointer transition-colors ${roasOutliers[i] ? 'bg-rose-50/70' : ''}`}
                >
                  {columns.map(col => (
                    <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {col === 'signal' ? <SignalBadge signal={row[col]} /> : fmt(row[col], col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
            {filtered.length} rows{rows.length !== filtered.length ? ` (of ${rows.length})` : ''}
          </div>
        </div>
      )}

      {selected && <EntityDetail row={selected} allRows={rows} onClose={() => setSelected(null)} />}
    </div>
  )
}
