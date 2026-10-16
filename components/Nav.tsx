'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',               label: 'Overview' },
  { href: '/campaigns',      label: 'Campaigns' },
  { href: '/adsets',         label: 'Ad Sets' },
  { href: '/ads',            label: 'Ads' },
  { href: '/low-performers', label: 'Low Performers' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="border-b border-gray-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Meta Ads
          </span>
          <div className="flex items-center gap-1">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  path === l.href
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
