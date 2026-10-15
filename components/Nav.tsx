'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',               label: 'Summary' },
  { href: '/campaigns',      label: 'Campaigns' },
  { href: '/adsets',         label: 'Ad Sets' },
  { href: '/ads',            label: 'Ads' },
  { href: '/low-performers', label: 'Low Performers' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-indigo-600 mr-4">Meta Ads</span>
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                path === l.href
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
