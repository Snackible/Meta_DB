const STYLES: Record<string, string> = {
  Scale:   'bg-emerald-100 text-emerald-700',
  Good:    'bg-sky-100 text-sky-700',
  Monitor: 'bg-amber-100 text-amber-700',
  Reduce:  'bg-orange-100 text-orange-700',
  Low:     'bg-rose-100 text-rose-700',
}

export default function SignalBadge({ signal }: { signal: string }) {
  if (!signal) return <span className="text-gray-300">—</span>
  const [base, ...rest] = signal.split(' | ')
  const cls = STYLES[base] || 'bg-gray-100 text-gray-600'
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{base}</span>
      {rest.map(r => (
        <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">{r}</span>
      ))}
    </span>
  )
}
